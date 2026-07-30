import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

type NewPlayerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Profile = {
  id: string;
  nickname: string | null;
};

type ExistingMember = {
  profile_id: string;
};

export default async function NewPlayerPage({
  params,
}: NewPlayerPageProps) {
  const { id } = await params;

  await requireAdmin(`/souteze/${id}`);

  const supabase = await createClient();

  const { data: competition, error: competitionError } = await supabase
    .from("competitions")
    .select("id, title")
    .eq("id", id)
    .single();

  if (competitionError || !competition) {
    notFound();
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, nickname")
    .order("nickname", { ascending: true });

  if (profilesError) {
    throw new Error(
      `Nepodařilo se načíst registrované uživatele: ${profilesError.message}`
    );
  }

  const { data: membersData, error: membersError } = await supabase
    .from("competition_members")
    .select("profile_id")
    .eq("competition_id", id);

  if (membersError) {
    throw new Error(
      `Nepodařilo se načíst členy soutěže: ${membersError.message}`
    );
  }

  console.log("PROFILES DATA:", profilesData);
  console.log("MEMBERS DATA:", membersData);

  const profiles = (profilesData ?? []) as Profile[];
  const existingMembers = (membersData ?? []) as ExistingMember[];

  const existingProfileIds = new Set(
    existingMembers.map((member) => member.profile_id)
  );

  const availableProfiles = profiles.filter(
    (profile) => !existingProfileIds.has(profile.id)
  );

  console.log("AVAILABLE PROFILES:", availableProfiles);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Přidat hráče</h2>

        <p className="mt-1 text-sm text-gray-500">
          Vyber registrovaného uživatele, kterého chceš přidat do soutěže{" "}
          {competition.title}.
        </p>
      </div>

      <form
        action={`/api/souteze/${id}/hraci`}
        method="post"
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        {availableProfiles.length === 0 ? (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm font-semibold text-yellow-800">
            Není k dispozici žádný další registrovaný uživatel. Všichni
            uživatelé už jsou v soutěži nebo zatím nejsou vytvořené další účty.
          </div>
        ) : (
          <div>
            <label
              htmlFor="profileId"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Registrovaný uživatel
            </label>

            <select
              id="profileId"
              name="profileId"
              required
              defaultValue=""
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            >
              <option value="" disabled>
                Vyber hráče
              </option>

              {availableProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.nickname || "Bez přezdívky"}
                </option>
              ))}
            </select>

            <p className="mt-2 text-sm text-gray-500">
              Nově přidaný hráč bude automaticky schválený. Platba bude
              nastavena jako nezaplacená.
            </p>
          </div>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/souteze/${id}/hraci`}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
          >
            Zrušit
          </Link>

          {availableProfiles.length > 0 && (
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
            >
              Přidat hráče
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
