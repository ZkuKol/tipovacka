import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type FibaResult = {
  homeScore: number;
  awayScore: number;
};

type Tip = {
  id: string;
  winner: "home" | "away";
  margin_bucket: number;
};

const FIBA_EVENT_URL =
  "https://www.fiba.basketball/en/events/fiba-womens-basketball-world-cup-2026";

function getMarginBucket(difference: number) {
  if (difference >= 91) {
    return 95;
  }

  return Math.ceil(difference / 5) * 5;
}

function calculateTipPoints(
  tip: Tip,
  actualWinner: "home" | "away",
  actualMarginBucket: number,
) {
  if (tip.winner !== actualWinner) {
    return 0;
  }

  if (tip.margin_bucket === actualMarginBucket) {
    return 5;
  }

  return 1;
}

async function getFibaResult(
  fibaGameId: number,
  homeCode: string,
  awayCode: string,
): Promise<FibaResult | null> {
  const url =
    `${FIBA_EVENT_URL}/games/` +
    `${fibaGameId}-${homeCode}-${awayCode}`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Tipovacka/1.0",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(
      `FIBA ${fibaGameId}: HTTP ${response.status}`,
    );
  }

  const html = await response.text();

  /*
   * FIBA má výsledkové údaje vložené v escaped JSONu
   * přímo v HTML stránky.
   *
   * Například:
   *
   * \"A_BLS\":\"93 - 50\"
   */
  const scoreMatch = html.match(
    /\\"A_BLS\\":\\"(\d+)\s*-\s*(\d+)/,
  );

  if (!scoreMatch) {
    return null;
  }

  const homeScore = Number(scoreMatch[1]);
  const awayScore = Number(scoreMatch[2]);

  if (
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0 ||
    homeScore === awayScore
  ) {
    return null;
  }

  return {
    homeScore,
    awayScore,
  };
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

    const { data: matches, error: matchesError } =
      await supabase
        .from("matches")
        .select(
          `
            id,
            fiba_game_id,
            home_score,
            away_score,
            finished,
            home_team:teams!matches_home_team_id_fkey (
              fiba_code
            ),
            away_team:teams!matches_away_team_id_fkey (
              fiba_code
            )
          `,
        )
        .eq("competition_id", competitionId)
        .not("fiba_game_id", "is", null);

    if (matchesError) {
      throw new Error(matchesError.message);
    }

    let checked = 0;
    let updated = 0;
    let scoredTips = 0;

    for (const match of matches ?? []) {
      if (!match.fiba_game_id) {
        continue;
      }

      const homeTeam = Array.isArray(match.home_team)
        ? match.home_team[0]
        : match.home_team;

      const awayTeam = Array.isArray(match.away_team)
        ? match.away_team[0]
        : match.away_team;

      const homeCode = homeTeam?.fiba_code;
      const awayCode = awayTeam?.fiba_code;

      if (!homeCode || !awayCode) {
        continue;
      }

      checked += 1;

      const result = await getFibaResult(
        Number(match.fiba_game_id),
        homeCode,
        awayCode,
      );

      if (!result) {
        continue;
      }

      const resultChanged =
        !match.finished ||
        match.home_score !== result.homeScore ||
        match.away_score !== result.awayScore;

      if (!resultChanged) {
        continue;
      }

      const { error: updateError } = await supabase
        .from("matches")
        .update({
          home_score: result.homeScore,
          away_score: result.awayScore,
          finished: true,
          fiba_synced_at: new Date().toISOString(),
        })
        .eq("id", match.id)
        .eq("competition_id", competitionId);

      if (updateError) {
        throw new Error(
          `Nepodařilo se uložit výsledek FIBA ${match.fiba_game_id}: ${updateError.message}`,
        );
      }

      const actualWinner: "home" | "away" =
        result.homeScore > result.awayScore ? "home" : "away";

      const scoreDifference = Math.abs(
        result.homeScore - result.awayScore,
      );

      const actualMarginBucket = getMarginBucket(scoreDifference);

      const { data: tipsData, error: tipsError } = await supabase
        .from("tips")
        .select(
          `
            id,
            winner,
            margin_bucket
          `,
        )
        .eq("match_id", match.id);

      if (tipsError) {
        throw new Error(
          `Výsledek byl uložen, ale nepodařilo se načíst tipy: ${tipsError.message}`,
        );
      }

      const tips = (tipsData ?? []) as Tip[];

      for (const tip of tips) {
        const points = calculateTipPoints(
          tip,
          actualWinner,
          actualMarginBucket,
        );

        const { error: tipUpdateError } = await supabase
          .from("tips")
          .update({
            points,
          })
          .eq("id", tip.id);

        if (tipUpdateError) {
          throw new Error(
            `Nepodařilo se vyhodnotit tip ${tip.id}: ${tipUpdateError.message}`,
          );
        }

        scoredTips += 1;
      }

      updated += 1;
    }

    return NextResponse.json({
      success: true,
      checked,
      updated,
      scoredTips,
      message:
        updated === 0
          ? `Zkontrolováno ${checked} zápasů. Žádný nový výsledek.`
          : `Zkontrolováno ${checked} zápasů, aktualizováno ${updated}, vyhodnoceno ${scoredTips} tipů.`,
    });
  } catch (error) {
    console.error("FIBA sync error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Synchronizace FIBA selhala.",
      },
      {
        status: 500,
      },
    );
  }
}
