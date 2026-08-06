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

export async function POST(request: Request, { params }: RouteProps) {
  const { id: competitionId, matchId } = await params;
  const profile = await requireUser();

  const formData = await request.formData();

  const winner = parseWinner(formData.get("winner"));
  const marginBucket = parseMarginBucket(formData.get("marginBucket"));

  if (!winner || marginBucket === null) {
    return new NextResponse(
      "Vyber vítěze a platné pásmo rozdílu od 5 do 95 bodů.",
      {
        status: 400,
      },
    );
  }

  const supabase = await createClient();

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
    return new NextResponse("Členství v soutěži ještě není schválené.", {
      status: 403,
    });
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

  const { error: saveError } = await supabase.from("tips").upsert(
    {
      match_id: matchId,
      competition_member_id: member.id,
      winner,
      margin_bucket: marginBucket,
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

  revalidatePath(`/souteze/${competitionId}/tipy`);

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

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
