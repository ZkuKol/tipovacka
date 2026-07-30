import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const { id } = await params;

  await requireAdmin(`/souteze/${id}`);

  const formData = await request.formData();
  const profileId = String(formData.get("profileId") ?? "").trim();

  if (!profileId) {
    return new NextResponse("Nebyl vybrán žádný hráč.", {
      status: 400,
    });
  }

  const supabase = await createClient();

  const { error } = await supabase.from("competition_members").insert({
    competition_id: id,
    profile_id: profileId,
    approved: true,
    paid: false,
  });

  if (error) {
    return new NextResponse(
      `Hráče se nepodařilo přidat: ${error.message}`,
      {
        status: 500,
      }
    );
  }

  revalidatePath(`/souteze/${id}/hraci`);

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  const protocol =
    request.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  return NextResponse.redirect(
    `${protocol}://${host}/souteze/${id}/hraci`,
    303
  );
}
