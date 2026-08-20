import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type RouteProps = {
  params: Promise<{
    id: string;
    matchId: string;
  }>;
};

function parseWinner(
  value: FormDataEntryValue | null,
): "home" | "away" | null {
  if (value === "home" || value === "away") {
    return value;
  }

  return null;
}

function parseMarginBucket(
  value: FormDataEntryValue | null,
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const marginBucket = Number(value);

  if (
    !Number.isInteger(marginBucket) ||
    marginBucket < 5 ||
    marginBucket > 95 ||
    marginBucket % 5 !== 0
  ) {
    return null;
  }

  return marginBucket;
}

function parseScore(
  value: FormDataEntryValue | null,
  maximum: number,
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const score = Number(trimmed);

  if (
    !Number.isInteger(score) ||
    score < 0 ||
    score > maximum
  ) {
    return null;
  }

  return score;
}

export async function POST(
  request: Request,
  { params }: RouteProps,
) {
  const { id: competitionId, matchId } = await params;
  const profile = await requireUser();

  const supabase = await createClient();

  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select("id, sport")
      .eq("id", competitionId)
      .maybeSingle();

  if (competitionError) {
    return new NextResponse(
      `Nepodařilo se ověřit soutěž: ${competitionError.message}`,
      {
        status: 500,
      },
    );
  }

  if (!competition) {
    return new NextResponse("Soutěž nebyla nalezena.", {
      status: 404,
    });
  }

  const { data: member, error: memberError } = await supabase
    .from("competition_members")
    .select("id, approved")
    .eq("competition_id", competitionId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (memberError) {
    return new NextResponse(
      `Nepodařilo se ověřit členství: ${memberError.message}`,
      {
        status: 500,
      },
    );
  }

  if (!member) {
    return new NextResponse("Nejsi členem této soutěže.", {
      status: 403,
    });
  }

  if (!member.approved) {
    return new NextResponse(
      "Členství v soutěži ještě není schválené.",
      {
        status: 403,
      },
    );
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, competition_id, match_time")
    .eq("id", matchId)
    .eq("competition_id", competitionId)
    .maybeSingle();

  if (matchError) {
    return new NextResponse(
      `Nepodařilo se ověřit zápas: ${matchError.message}`,
      {
        status: 500,
      },
    );
  }

  if (!match) {
    return new NextResponse("Zápas nebyl nalezen.", {
      status: 404,
    });
  }

  if (new Date(match.match_time) <= new Date()) {
    return new NextResponse(
      "Tip už nelze uložit, protože zápas začal.",
      {
        status: 409,
      },
    );
  }

  const formData = await request.formData();

  /*
   * FOTBAL + HOKEJ
   *
   * Tipujeme přesné skóre.
   */
  if (
    competition.sport === "football" ||
    competition.sport === "hockey"
  ) {
    const homeScoreTip = parseScore(
      formData.get("homeScoreTip"),
      99,
    );

    const awayScoreTip = parseScore(
      formData.get("awayScoreTip"),
      99,
    );

    if (
      homeScoreTip === null ||
      awayScoreTip === null
    ) {
      return new NextResponse(
        "Zadej platné skóre obou týmů od 0 do 99.",
        {
          status: 400,
        },
      );
    }

    const { error: saveError } = await supabase
      .from("tips")
      .upsert(
        {
          match_id: matchId,
          competition_member_id: member.id,

          home_score_tip: homeScoreTip,
          away_score_tip: awayScoreTip,

          winner: null,
          margin_bucket: null,

          points: 0,
        },
        {
          onConflict: "match_id,competition_member_id",
        },
      );

    if (saveError) {
      return new NextResponse(
        `Tip se nepodařilo uložit: ${saveError.message}`,
        {
          status: 500,
        },
      );
    }
  }

  /*
   * TENIS
   *
   * Do stejných score sloupců ukládáme výsledek na sety.
   * Například 2:0, 2:1 nebo 3:2.
   */
  else if (competition.sport === "tennis") {
    const homeScoreTip = parseScore(
      formData.get("homeScoreTip"),
      5,
    );

    const awayScoreTip = parseScore(
      formData.get("awayScoreTip"),
      5,
    );

    if (
      homeScoreTip === null ||
      awayScoreTip === null
    ) {
      return new NextResponse(
        "Zadej platný počet setů od 0 do 5.",
        {
          status: 400,
        },
      );
    }

    if (homeScoreTip === awayScoreTip) {
      return new NextResponse(
        "Tenisový zápas nemůže skončit remízou na sety.",
        {
          status: 400,
        },
      );
    }

    const winner =
      homeScoreTip > awayScoreTip
        ? "home"
        : "away";

    const { error: saveError } = await supabase
      .from("tips")
      .upsert(
        {
          match_id: matchId,
          competition_member_id: member.id,

          winner,
          home_score_tip: homeScoreTip,
          away_score_tip: awayScoreTip,

          margin_bucket: null,
          points: 0,
        },
        {
          onConflict: "match_id,competition_member_id",
        },
      );

    if (saveError) {
      return new NextResponse(
        `Tip se nepodařilo uložit: ${saveError.message}`,
        {
          status: 500,
        },
      );
    }
  }

  /*
   * BASKETBAL
   */
  else if (competition.sport === "basketball") {
    const winner = parseWinner(
      formData.get("winner"),
    );

    const marginBucket = parseMarginBucket(
      formData.get("marginBucket"),
    );

    if (!winner || marginBucket === null) {
      return new NextResponse(
        "Vyber vítěze a platné pásmo rozdílu od 5 do 95 bodů.",
        {
          status: 400,
        },
      );
    }

    const { error: saveError } = await supabase
      .from("tips")
      .upsert(
        {
          match_id: matchId,
          competition_member_id: member.id,

          winner,
          margin_bucket: marginBucket,

          home_score_tip: null,
          away_score_tip: null,

          points: 0,
        },
        {
          onConflict: "match_id,competition_member_id",
        },
      );

    if (saveError) {
      return new NextResponse(
        `Tip se nepodařilo uložit: ${saveError.message}`,
        {
          status: 500,
        },
      );
    }
  } else {
    return new NextResponse(
      "Tento sport zatím není podporován.",
      {
        status: 400,
      },
    );
  }

  revalidatePath(`/souteze/${competitionId}/tipy`);
  revalidatePath(`/souteze/${competitionId}/tabulka`);

  const forwardedHost =
    request.headers.get("x-forwarded-host");

  const host =
    forwardedHost ?? request.headers.get("host");

  if (!host) {
    return new NextResponse(
      "Tip byl uložen, ale nepodařilo se vytvořit návratovou adresu.",
      {
        status: 500,
      },
    );
  }

  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return NextResponse.redirect(
    `${protocol}://${host}/souteze/${competitionId}/tipy`,
    303,
  );
}
