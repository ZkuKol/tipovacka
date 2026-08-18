import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import ChanceSyncButton from "./ChanceSyncButton";

type CompetitionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CompetitionDetailPage({
  params,
}: CompetitionDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/prihlaseni");
  }

  const { data: competition, error } = await supabase
    .from("competitions")
    .select(
      `
        id,
        title,
        sport,
        deadline,
        paid,
        pending_tips,
        ranking,
        total_players
      `,
    )
    .eq("id", id)
    .single();

  if (error || !competition) {
    notFound();
  }

  const { data: member, error: memberError } = await supabase
    .from("competition_members")
    .select("id, approved, paid")
    .eq("competition_id", id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (memberError) {
    throw new Error(
      `Nepodařilo se ověřit účast v soutěži: ${memberError.message}`,
    );
  }

  const deadline = competition.deadline
    ? new Date(competition.deadline).toLocaleString("cs-CZ")
    : "Bez termínu";

  return (
    <div className="space-y-6">
      {!member && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
          <h2 className="text-xl font-bold text-gray-900">
            Přihlášení do soutěže
          </h2>

          <p className="mt-2 text-sm text-gray-700">
            Chceš se zúčastnit soutěže {competition.title}? Po odeslání
            žádosti bude tvoje účast čekat na schválení administrátorem.
          </p>

          <form
            action={`/api/souteze/${id}/prihlasit`}
            method="post"
            className="mt-5"
          >
            <button
              type="submit"
              className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
            >
              Přihlásit se do soutěže
            </button>
          </form>
        </div>
      )}

      {member && !member.approved && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
          <h2 className="text-xl font-bold text-yellow-900">
            Žádost čeká na schválení
          </h2>

          <p className="mt-2 text-sm text-yellow-800">
            Tvoje žádost o účast byla odeslána. Administrátor ji musí
            potvrdit, než bude možné tipovat.
          </p>

          <p className="mt-3 text-sm font-semibold text-yellow-900">
            Stav platby: {member.paid ? "Zaplaceno" : "Nezaplaceno"}
          </p>
        </div>
      )}

      {member?.approved && (
        <>
          {competition.sport === "football" && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
              <h2 className="text-lg font-bold text-gray-900">
                Chance Liga
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Načti aktuální zápasy a výsledky z oficiálního webu
                Chance Ligy.
              </p>

              <ChanceSyncButton competitionId={id} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Čekající tipy
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {competition.pending_tips}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Aktuální pořadí
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {competition.ranking}. / {competition.total_players}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Nejbližší uzávěrka
              </p>

              <p className="mt-2 text-lg font-bold text-gray-900">
                {deadline}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Platba
              </p>

              <p
                className={`mt-2 text-2xl font-bold ${
                  member.paid
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {member.paid ? "Zaplaceno" : "Nezaplaceno"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
