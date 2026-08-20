import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteProps,
) {
  const { id: competitionId } = await params;

  const profile = await requireUser();
  const supabase = await createClient();

  const formData = await request.formData();

  const winnerOptionId = formData.get("winnerOptionId");

  if (
    typeof winnerOptionId !== "string" ||
    winnerOptionId.trim() === ""
  ) {
    return new NextResponse(
      "Vyber celkového vítěze soutěže.",
      {
        status: 400,
      },
    );
  }

  const {
    data: competition,
    error: competitionError,
  } = await supabase
    .from("competitions")
    .select(
      `
        id,
        predict_overall_winner,
        overall_winner_deadline,
        overall_winner_option_id
      `,
    )
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
    return new NextResponse(
      "Soutěž nebyla nalezena.",
      {
        status: 404,
      },
    );
  }

  if (!competition.predict_overall_winner) {
    return new NextResponse(
      "V této soutěži se celkový vítěz netipuje.",
      {
        status: 400,
      },
    );
  }

  if (competition.overall_winner_option_id) {
    return new NextResponse(
      "Celkový vítěz soutěže už byl vyhodnocen.",
      {
        status: 409,
      },
    );
  }

  if (
    competition.overall_winner_deadline &&
    new Date(competition.overall_winner_deadline) <= new Date()
  ) {
    return new NextResponse(
      "Tip na celkového vítěze už nelze změnit.",
      {
        status: 409,
      },
    );
  }

  const {
    data: member,
    error: memberError,
  } = await supabase
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
    return new NextResponse(
      "Nejsi členem této soutěže.",
      {
        status: 403,
      },
    );
  }

  if (!member.approved) {
    return new NextResponse(
      "Členství v soutěži ještě není schválené.",
      {
        status: 403,
      },
    );
  }

  const {
    data: winnerOption,
    error: winnerOptionError,
  } = await supabase
    .from("competition_winner_options")
    .select("id")
    .eq("id", winnerOptionId)
    .eq("competition_id", competitionId)
    .maybeSingle();

  if (winnerOptionError) {
    return new NextResponse(
      `Nepodařilo se ověřit vítěze: ${winnerOptionError.message}`,
      {
        status: 500,
      },
    );
  }

  if (!winnerOption) {
    return new NextResponse(
      "Vybraná možnost nepatří do této soutěže.",
      {
        status: 400,
      },
    );
  }

  const {
    error: saveError,
  } = await supabase
    .from("competition_winner_tips")
    .upsert(
      {
        competition_id: competitionId,
        competition_member_id: member.id,
        winner_option_id: winnerOptionId,
        points: 0,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict:
          "competition_id,competition_member_id",
      },
    );

  if (saveError) {
    return new NextResponse(
      `Tip na vítěze se nepodařilo uložit: ${saveError.message}`,
      {
        status: 500,
      },
    );
  }

  revalidatePath(
    `/souteze/${competitionId}/tipy`,
  );

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
