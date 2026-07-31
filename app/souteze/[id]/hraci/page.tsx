import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeletePlayerButton from "./DeletePlayerButton";

type PlayersPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type CompetitionMember = {
  id: string;
  approved: boolean;
  paid: boolean;
  created_at: string;
  profiles: {
    id: string;
    nickname: string | null;
  } | null;
};

export default async function PlayersPage({ params }: PlayersPageProps) {
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

  const { data, error } = await supabase
    .from("competition_members")
    .select(
      `
        id,
        approved,
        paid,
        created_at,
        profiles (
          id,
          nickname
        )
      `
    )
    .eq("competition_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Nepodařilo se načíst hráče: ${error.message}`);
  }

  const members = (data ?? []) as unknown as CompetitionMember[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hráči</h2>

          <p className="mt-1 text-sm text-gray-600">
            Správa účastníků soutěže {competition.title}.
          </p>
        </div>

        <Link
          href={`/souteze/${id}/hraci/novy`}
          className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
        >
          + Přidat hráče
        </Link>
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">
            V soutěži zatím nejsou žádní hráči
          </h3>

          <p className="mt-2 text-sm text-gray-600">
            Pomocí tlačítka Přidat hráče vyber registrovaného uživatele.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Hráč
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Schválení
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Platba
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Přidán
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Akce
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {members.map((member) => {
                  const playerName =
                    member.profiles?.nickname || "Bez přezdívky";

                  return (
                    <tr key={member.id}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          {playerName}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <form
                          action={`/api/souteze/${id}/hraci/${member.id}/schvaleni`}
                          method="post"
                        >
                          <input
                            type="hidden"
                            name="approved"
                            value={member.approved ? "false" : "true"}
                          />

                          <button
                            type="submit"
                            title="Kliknutím změnit stav schválení"
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold transition hover:opacity-75 ${
                              member.approved
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {member.approved ? "Schválen" : "Čeká"}
                          </button>
                        </form>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <form
                          action={`/api/souteze/${id}/hraci/${member.id}/platba`}
                          method="post"
                        >
                          <input
                            type="hidden"
                            name="paid"
                            value={member.paid ? "false" : "true"}
                          />

                          <button
                            type="submit"
                            title="Kliknutím změnit stav platby"
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold transition hover:opacity-75 ${
                              member.paid
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {member.paid ? "Zaplaceno" : "Nezaplaceno"}
                          </button>
                        </form>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {new Date(member.created_at).toLocaleDateString("cs-CZ")}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <form
                          action={`/api/souteze/${id}/hraci/${member.id}/smazat`}
                          method="post"
                        >
                          <DeletePlayerButton playerName={playerName} />
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}



