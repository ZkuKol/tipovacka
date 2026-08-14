import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type MatchToSave = {
  round: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
};

type SaveBulkMatchesRequest = {
  matches?: MatchToSave[];
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type Team = {
  id: string;
  name_cs: string;
};

function isValidMatch(match: unknown): match is MatchToSave {
  if (
    typeof match !== "object" ||
    match === null ||
    Array.isArray(match)
  ) {
    return false;
  }

  const candidate = match as Partial<MatchToSave>;

  return (
    typeof candidate.round === "string" &&
    candidate.round.trim() !== "" &&
    typeof candidate.homeTeam === "string" &&
    candidate.homeTeam.trim() !== "" &&
    typeof candidate.awayTeam === "string" &&
    candidate.awayTeam.trim() !== "" &&
    typeof candidate.matchTime === "string" &&
    candidate.matchTime.trim() !== "" &&
    !Number.isNaN(Date.parse(candidate.matchTime))
  );
}

function normalizeTeamName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("cs-CZ");
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id: competitionId } = await context.params;

    if (!competitionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Chybí ID soutěže.",
        },
        {
          status: 400,
        },
      );
    }

    let body: SaveBulkMatchesRequest;

    try {
      body = (await request.json()) as SaveBulkMatchesRequest;
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Požadavek neobsahuje platná JSON data.",
        },
        {
          status: 400,
        },
      );
    }

    const matches = body.matches;

    if (!Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Nejsou žádné zápasy k uložení.",
        },
        {
          status: 400,
        },
      );
    }

    const invalidMatchIndex = matches.findIndex(
      (match) => !isValidMatch(match),
    );

    if (invalidMatchIndex !== -1) {
      return NextResponse.json(
        {
          success: false,
          message: `Zápas na řádku ${
            invalidMatchIndex + 1
          } obsahuje neplatná data.`,
        },
        {
          status: 400,
        },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Pro uložení zápasů se musíš přihlásit.",
        },
        {
          status: 401,
        },
      );
    }

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name_cs");

    if (teamsError) {
      console.error(
        "Chyba při načítání týmů:",
        teamsError,
      );

      return NextResponse.json(
        {
          success: false,
          message: `Nepodařilo se načíst týmy: ${teamsError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    const teams = (teamsData ?? []) as Team[];

    const teamsByName = new Map(
      teams.map((team) => [
        normalizeTeamName(team.name_cs),
        team,
      ]),
    );

    const matchesToInsert = [];

    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];

      const homeTeam = teamsByName.get(
        normalizeTeamName(match.homeTeam),
      );

      const awayTeam = teamsByName.get(
        normalizeTeamName(match.awayTeam),
      );

      if (!homeTeam) {
        return NextResponse.json(
          {
            success: false,
            message: `Řádek ${index + 1}: domácí tým „${
              match.homeTeam
            }“ nebyl nalezen v databázi týmů.`,
          },
          {
            status: 400,
          },
        );
      }

      if (!awayTeam) {
        return NextResponse.json(
          {
            success: false,
            message: `Řádek ${index + 1}: hostující tým „${
              match.awayTeam
            }“ nebyl nalezen v databázi týmů.`,
          },
          {
            status: 400,
          },
        );
      }

      if (homeTeam.id === awayTeam.id) {
        return NextResponse.json(
          {
            success: false,
            message: `Řádek ${
              index + 1
            }: domácí a hostující tým nemohou být stejné.`,
          },
          {
            status: 400,
          },
        );
      }

      matchesToInsert.push({
        competition_id: competitionId,
        round: match.round.trim(),
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        match_time: match.matchTime,
        home_score: null,
        away_score: null,
        finished: false,
      });
    }

    const { error: insertError } = await supabase
      .from("matches")
      .insert(matchesToInsert);

    if (insertError) {
      console.error(
        "Chyba při hromadném ukládání zápasů:",
        insertError,
      );

      return NextResponse.json(
        {
          success: false,
          message: insertError.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Bylo uloženo ${matches.length} zápasů.`,
        insertedCount: matches.length,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Neočekávaná chyba API při ukládání zápasů:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Při ukládání nastala neočekávaná chyba. Zkus to prosím znovu.",
      },
      {
        status: 500,
      },
    );
  }
}
