import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ParsedChanceMatch = {
  chanceGameId: number;
  round: number;
  date: string;
  time: string | null;
  homeTeam: string;
  homeCode: string;
  awayTeam: string;
  awayCode: string;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
};

type Team = {
  id: string;
  name_cs: string;
  fiba_code: string;
};

type FootballTip = {
  id: string;
  home_score_tip: number | null;
  away_score_tip: number | null;
};

const CHANCE_URL =
  "https://www.chanceliga.cz/rozpis-zapasu/2026/?type=2";

const TARGET_ROUND = 4;

function parseChanceMatches(html: string): ParsedChanceMatch[] {
  const matches: ParsedChanceMatch[] = [];

  for (const item of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const block = item[1];

    const dateMatch = block.match(
      /<span class="date"><b>#(\d+)<\/b>\s*(\d{2}\/\d{2}\/\d{2})<\/span>/i,
    );

    if (!dateMatch) {
      continue;
    }

    const round = Number(dateMatch[1]);

    if (round !== TARGET_ROUND) {
      continue;
    }

    const teamMatches = [
      ...block.matchAll(
        /<span class="team">[\s\S]*?<img[^>]*alt="([^"]+)"[^>]*>[\s\S]*?<b>([^<]+)<\/b>/gi,
      ),
    ];

    if (teamMatches.length !== 2) {
      continue;
    }

    const gameMatch = block.match(
      /href="\/zapas\/(\d+)-[^"]+"/i,
    );

    if (!gameMatch) {
      continue;
    }

    const scoreMatch = block.match(
      /<b class="number">[\s\S]*?<a[^>]*>(\d+)\s*:\s*(\d+)<\/a>/i,
    );

    const timeMatch = block.match(
      /<b class="time">[\s\S]*?<a[^>]*>[^<]*?(\d{1,2}:\d{2})<\/a>/i,
    );

    const fallbackTimeMatch = block.match(
      /<span class="info">(?:po|út|st|čt|pá|so|ne)?\s*(\d{1,2}:\d{2})<\/span>/i,
    );

    matches.push({
      chanceGameId: Number(gameMatch[1]),
      round,
      date: dateMatch[2],
      time:
        timeMatch?.[1] ??
        fallbackTimeMatch?.[1] ??
        null,

      homeTeam: teamMatches[0][1],
      homeCode: teamMatches[0][2],

      awayTeam: teamMatches[1][1],
      awayCode: teamMatches[1][2],

      homeScore: scoreMatch
        ? Number(scoreMatch[1])
        : null,

      awayScore: scoreMatch
        ? Number(scoreMatch[2])
        : null,

      finished: Boolean(scoreMatch),
    });
  }

  return matches;
}

function createMatchTime(
  date: string,
  time: string | null,
): string | null {
  if (!time) {
    return null;
  }

  const dateMatch = date.match(
    /^(\d{2})\/(\d{2})\/(\d{2})$/,
  );

  if (!dateMatch) {
    return null;
  }

  const [, day, month, shortYear] = dateMatch;
  const year = `20${shortYear}`;

  /*
   * 4. kolo se hraje v srpnu, tedy v ČR v CEST (+02:00).
   * Tím zabráníme posunu času při běhu serveru v UTC.
   */
  const parsedDate = new Date(
    `${year}-${month}-${day}T${time}:00+02:00`,
  );

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

function getFootballOutcome(
  homeScore: number,
  awayScore: number,
): "home" | "draw" | "away" {
  if (homeScore > awayScore) {
    return "home";
  }

  if (awayScore > homeScore) {
    return "away";
  }

  return "draw";
}

function calculateFootballPoints(
  tipHomeScore: number,
  tipAwayScore: number,
  actualHomeScore: number,
  actualAwayScore: number,
) {
  if (
    tipHomeScore === actualHomeScore &&
    tipAwayScore === actualAwayScore
  ) {
    return 3;
  }

  const tippedOutcome = getFootballOutcome(
    tipHomeScore,
    tipAwayScore,
  );

  const actualOutcome = getFootballOutcome(
    actualHomeScore,
    actualAwayScore,
  );

  if (tippedOutcome === actualOutcome) {
    return 1;
  }

  return 0;
}

async function evaluateFootballTips(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  homeScore: number,
  awayScore: number,
) {
  const { data: tipsData, error: tipsError } = await supabase
    .from("tips")
    .select(
      `
        id,
        home_score_tip,
        away_score_tip
      `,
    )
    .eq("match_id", matchId);

  if (tipsError) {
    throw new Error(
      `Nepodařilo se načíst tipy: ${tipsError.message}`,
    );
  }

  const tips = (tipsData ?? []) as FootballTip[];

  let scoredTips = 0;

  for (const tip of tips) {
    if (
      tip.home_score_tip === null ||
      tip.away_score_tip === null
    ) {
      continue;
    }

    const points = calculateFootballPoints(
      tip.home_score_tip,
      tip.away_score_tip,
      homeScore,
      awayScore,
    );

    const { error: updateTipError } = await supabase
      .from("tips")
      .update({
        points,
      })
      .eq("id", tip.id);

    if (updateTipError) {
      throw new Error(
        `Nepodařilo se vyhodnotit tip ${tip.id}: ${updateTipError.message}`,
      );
    }

    scoredTips += 1;
  }

  return scoredTips;
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id: competitionId } = await context.params;

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Musíš být přihlášen.",
        },
        {
          status: 401,
        },
      );
    }

    const {
      data: competition,
      error: competitionError,
    } = await supabase
      .from("competitions")
      .select("id, sport")
      .eq("id", competitionId)
      .single();

    if (competitionError || !competition) {
      return NextResponse.json(
        {
          success: false,
          message: "Soutěž nebyla nalezena.",
        },
        {
          status: 404,
        },
      );
    }

    if (competition.sport !== "football") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Chance Liga synchronizace je určena pouze pro fotbalovou soutěž.",
        },
        {
          status: 400,
        },
      );
    }

    const response = await fetch(CHANCE_URL, {
      cache: "no-store",
      headers: {
        "User-Agent": "Tipovacka/1.0",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Chance Liga vrátila HTTP ${response.status}.`,
      );
    }

    const html = await response.text();

    const parsedMatches = parseChanceMatches(html);

    if (parsedMatches.length === 0) {
      throw new Error(
        `V oficiálním rozpisu nebyly nalezeny zápasy ${TARGET_ROUND}. kola.`,
      );
    }

    const { data: teamsData, error: teamsError } =
      await supabase
        .from("teams")
        .select(
          `
            id,
            name_cs,
            fiba_code
          `,
        );

    if (teamsError) {
      throw new Error(
        `Nepodařilo se načíst týmy: ${teamsError.message}`,
      );
    }

    const teams = (teamsData ?? []) as Team[];

    const teamsByCode = new Map(
      teams.map((team) => [team.fiba_code, team]),
    );

    const {
      data: existingMatchesData,
      error: existingMatchesError,
    } = await supabase
      .from("matches")
      .select(
        `
          id,
          chance_game_id,
          home_score,
          away_score,
          finished
        `,
      )
      .eq("competition_id", competitionId)
      .not("chance_game_id", "is", null);

    if (existingMatchesError) {
      throw new Error(
        `Nepodařilo se načíst existující zápasy: ${existingMatchesError.message}`,
      );
    }

    const existingMatchesByChanceId = new Map(
      (existingMatchesData ?? []).map((match) => [
        Number(match.chance_game_id),
        match,
      ]),
    );

    let found = parsedMatches.length;
    let inserted = 0;
    let updated = 0;
    let finished = 0;
    let scoredTips = 0;

    for (const sourceMatch of parsedMatches) {
      const homeTeam = teamsByCode.get(
        sourceMatch.homeCode,
      );

      const awayTeam = teamsByCode.get(
        sourceMatch.awayCode,
      );

      if (!homeTeam) {
        throw new Error(
          `Tým ${sourceMatch.homeCode} (${sourceMatch.homeTeam}) není v databázi.`,
        );
      }

      if (!awayTeam) {
        throw new Error(
          `Tým ${sourceMatch.awayCode} (${sourceMatch.awayTeam}) není v databázi.`,
        );
      }

      const matchTime = createMatchTime(
        sourceMatch.date,
        sourceMatch.time,
      );

      if (!matchTime) {
        throw new Error(
          `U zápasu ${sourceMatch.homeCode}–${sourceMatch.awayCode} se nepodařilo určit datum a čas.`,
        );
      }

      const existingMatch =
        existingMatchesByChanceId.get(
          sourceMatch.chanceGameId,
        );

      if (!existingMatch) {
        const { data: insertedMatch, error: insertError } =
          await supabase
            .from("matches")
            .insert({
              competition_id: competitionId,
              round: `${sourceMatch.round}. kolo`,
              home_team_id: homeTeam.id,
              away_team_id: awayTeam.id,
              match_time: matchTime,
              home_score: sourceMatch.homeScore,
              away_score: sourceMatch.awayScore,
              finished: sourceMatch.finished,
              chance_game_id: sourceMatch.chanceGameId,
              chance_synced_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (insertError || !insertedMatch) {
          throw new Error(
            `Nepodařilo se vložit zápas ${sourceMatch.homeCode}–${sourceMatch.awayCode}: ${
              insertError?.message ?? "neznámá chyba"
            }`,
          );
        }

        inserted += 1;

        if (
          sourceMatch.finished &&
          sourceMatch.homeScore !== null &&
          sourceMatch.awayScore !== null
        ) {
          finished += 1;

          scoredTips += await evaluateFootballTips(
            supabase,
            insertedMatch.id,
            sourceMatch.homeScore,
            sourceMatch.awayScore,
          );
        }

        continue;
      }

      const resultChanged =
        sourceMatch.finished &&
        sourceMatch.homeScore !== null &&
        sourceMatch.awayScore !== null &&
        (
          !existingMatch.finished ||
          existingMatch.home_score !==
            sourceMatch.homeScore ||
          existingMatch.away_score !==
            sourceMatch.awayScore
        );

      const { error: updateError } = await supabase
        .from("matches")
        .update({
          round: `${sourceMatch.round}. kolo`,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          match_time: matchTime,
          ...(sourceMatch.finished
            ? {
                home_score: sourceMatch.homeScore,
                away_score: sourceMatch.awayScore,
                finished: true,
              }
            : {}),
          chance_synced_at: new Date().toISOString(),
        })
        .eq("id", existingMatch.id)
        .eq("competition_id", competitionId);

      if (updateError) {
        throw new Error(
          `Nepodařilo se aktualizovat zápas ${sourceMatch.homeCode}–${sourceMatch.awayCode}: ${updateError.message}`,
        );
      }

      updated += 1;

      if (
        resultChanged &&
        sourceMatch.homeScore !== null &&
        sourceMatch.awayScore !== null
      ) {
        finished += 1;

        scoredTips += await evaluateFootballTips(
          supabase,
          existingMatch.id,
          sourceMatch.homeScore,
          sourceMatch.awayScore,
        );
      }
    }

    return NextResponse.json({
      success: true,
      found,
      inserted,
      updated,
      finished,
      scoredTips,
      message:
        `Chance Liga: nalezeno ${found}, ` +
        `vloženo ${inserted}, aktualizováno ${updated}, ` +
        `nových výsledků ${finished}, vyhodnoceno ${scoredTips} tipů.`,
    });
  } catch (error) {
    console.error("Chance sync error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Synchronizace Chance Ligy selhala.",
      },
      {
        status: 500,
      },
    );
  }
}
