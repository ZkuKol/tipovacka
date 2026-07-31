import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type RouteProps = {
  params: Promise<{
    id: string;
    memberId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const { id, memberId } = await params;

  await requireAdmin(`/souteze/${id}/hraci`);

  const supabase = await createClient();

  const { error } = await supabase
    .from("competition_members")
    .delete()
    .eq("id", memberId)
    .eq("competition_id", id);

  if (error) {
    return new NextResponse(
      `Hráče se nepodařilo odebrat: ${error.message}`,
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
