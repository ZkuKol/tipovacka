"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addPlayer(
  competitionId: string,
  formData: FormData
) {
  await requireAdmin(`/souteze/${competitionId}`);

  const profileId = String(formData.get("profileId") ?? "").trim();

  if (!profileId) {
    throw new Error("Nebyl vybrán žádný hráč.");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("competition_members").insert({
    competition_id: competitionId,
    profile_id: profileId,
    approved: true,
    paid: false,
  });

  if (error) {
    throw new Error(`Hráče se nepodařilo přidat: ${error.message}`);
  }

  revalidatePath(`/souteze/${competitionId}/hraci`);
  redirect(`/souteze/${competitionId}/hraci`);
}
