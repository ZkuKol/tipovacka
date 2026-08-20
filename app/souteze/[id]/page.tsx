import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ChanceSyncButton from "./ChanceSyncButton";

type CompetitionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getRulesForSport(sport: string) {
  if (sport === "basketball") {
    return [
      "Tipuje se vítěz zápasu a pásmo výsledného rozdílu.",
      "Správný vítěz = 1 bod.",
      "Správný vítěz a správné pásmo rozdílu = 5 bodů.",
      "Špatný vítěz = 0 bodů.",
    ];
  }

  if (sport === "football" || sport === "hockey") {
    return [
      "Tipuje se přesný konečný výsledek.",
      "Přesný výsledek = 3 body.",
      "Správný vítěz nebo správně tipnutá remíza = 1 bod.",
      "Jiný výsledek = 0 bodů.",
    ];
  }

  if (sport === "tennis") {
    return [
      "Tipuje se vítěz zápasu a výsledek na sety.",
      "Správný vítěz = 1 bod.",
      "Správný vítěz a přesný výsledek na sety = 2 body.",
      "Špatný vítěz = 0 bodů.",
    ];
  }

  return [];
}

export default async function CompetitionDetailPage({
  params,
}: CompetitionDetailPageProps) {
  const { id } = await params;

  const profile = await requireUser();
  const supabase = await createClient();

  const { data: competition, error } = await supabase
    .from("competitions")
    .select(
      `
        id,
        title,
        sport,
        predict_overall_winner,
        description,
        entry_fee,
        payment_account,
        payment_bank_code,
        payment_message,
        payment_qr_url,
        deadline,
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
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (memberError) {
    throw new Error(
      `Nepodařilo se ověřit účast v soutěži: ${memberError.message}`,
    );
  }

  const rules = getRulesForSport(competition.sport);

  const deadline = competition.deadline
    ? new Date(competition.deadline).toLocaleString("cs-CZ")
    : "Bez termínu";

  const showPayment =
    competition.entry_fee !== null ||
    competition.payment_account ||
    competition.payment_qr_url;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">
          O soutěži
        </h2>

        {competition.description && (
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
            {competition.description}
          </p>
        )}

        <div className="mt-5 rounded-xl bg-gray-50 p-5">
          <p className="text-sm font-bold text-gray-900">
            Pravidla
          </p>

          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {rules.map((rule) => (
              <li key={rule}>• {rule}</li>
            ))}

            {competition.predict_overall_winner && (
              <li>
                • Správně tipnutý celkový vítěz soutěže = 10 bodů.
              </li>
            )}
          </ul>
        </div>
      </div>

      {showPayment && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-xl font-bold text-gray-900">
            Platba za účast
          </h2>

          {competition.entry_fee !== null && (
            <p className="mt-3 text-lg font-bold text-gray-900">
              Startovné: {competition.entry_fee} Kč
            </p>
          )}

          {competition.payment_account &&
            competition.payment_bank_code && (
              <p className="mt-2 text-sm text-gray-700">
                Účet:{" "}
                <strong>
                  {competition.payment_account}/
                  {competition.payment_bank_code}
                </strong>
              </p>
            )}

          {competition.payment_message && (
            <p className="mt-2 text-sm text-gray-700">
              Zpráva pro příjemce:{" "}
              <strong>{competition.payment_message}</strong>
            </p>
          )}

          {competition.payment_qr_url && (
            <div className="mt-5">
              <img
                src={competition.payment_qr_url}
                alt="QR kód pro platbu"
                className="max-h-80 rounded-xl border border-gray-200 bg-white object-contain"
              />
            </div>
          )}
        </div>
      )}

      {!member && profile.role !== "admin" && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
          <h2 className="text-xl font-bold text-gray-900">
            Přihlášení do soutěže
          </h2>

          <p className="mt-2 text-sm text-gray-700">
            Po odeslání žádosti bude tvoje účast čekat na
            schválení administrátorem.
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
            Administrátor musí potvrdit tvoji účast, než bude možné
            tipovat.
          </p>

          <p className="mt-3 text-sm font-semibold text-yellow-900">
            Stav platby:{" "}
            {member.paid ? "Zaplaceno" : "Nezaplaceno"}
          </p>
        </div>
      )}

      {(member?.approved || profile.role === "admin") && (
        <>
          {competition.sport === "football" &&
            profile.role === "admin" && (
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

            {member && (
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
            )}
          </div>
        </>
      )}
    </div>
  );
}

