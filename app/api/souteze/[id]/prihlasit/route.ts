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

  const { data: competition, error: competitionError } =
    await supabase
      .from("competitions")
      .select("id")
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

  const { data: existingMember, error: memberError } =
    await supabase
      .from("competition_members")
      .select("id, approved, paid")
      .eq("competition_id", competitionId)
      .eq("profile_id", profile.id)
      .maybeSingle();

  if (memberError) {
    return new NextResponse(
      `Nepodařilo se ověřit účast: ${memberError.message}`,
      {
        status: 500,
      },
    );
  }

  /*
   * Pokud už hráč členství nebo žádost má,
   * nic dalšího nevytváříme.
   */
  if (!existingMember) {
    const { error: insertError } = await supabase
      .from("competition_members")
      .insert({
        competition_id: competitionId,
        profile_id: profile.id,
        approved: false,
        paid: false,
      });

    if (insertError) {
      return new NextResponse(
        `Žádost se nepodařilo odeslat: ${insertError.message}`,
        {
          status: 500,
        },
      );
    }
  }

  revalidatePath(`/souteze/${competitionId}`);
  revalidatePath(`/souteze/${competitionId}/hraci`);

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (!host) {
    return new NextResponse(
      "Žádost byla uložena, ale nepodařilo se vytvořit návratovou adresu.",
      {
        status: 500,
      },
    );
  }

  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return NextResponse.redirect(
    `${protocol}://${host}/souteze/${competitionId}`,
    303,
  );
}
