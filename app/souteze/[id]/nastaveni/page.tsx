import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import PaymentQrReader from "./PaymentQrReader";
import SportRulesSelector from "./SportRulesSelector";

type CompetitionSettingsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type WinnerOption = {
  id: string;
  name: string;
};

function formatDeadlineForInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export default async function CompetitionSettingsPage({
  params,
}: CompetitionSettingsPageProps) {
  const { id } = await params;

  await requireAdmin(`/souteze/${id}`);

  const supabase = await createClient();

  const { data: competition, error } = await supabase
    .from("competitions")
    .select(
      `
        id,
        title,
        sport,
        predict_overall_winner,
        overall_winner_deadline,
        overall_winner_option_id,
        description,
        entry_fee,
        payment_account,
        payment_bank_code,
        payment_message,
        payment_qr_url
      `,
    )
    .eq("id", id)
    .single();

  if (error || !competition) {
    notFound();
  }

  const {
    data: winnerOptionsData,
    error: winnerOptionsError,
  } = await supabase
    .from("competition_winner_options")
    .select("id, name")
    .eq("competition_id", id)
    .order("name", { ascending: true });

  if (winnerOptionsError) {
    throw new Error(
      `Nepodařilo se načíst možné vítěze: ${winnerOptionsError.message}`,
    );
  }

  const winnerOptions =
    (winnerOptionsData ?? []) as WinnerOption[];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Nastavení soutěže
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Pravidla a platební údaje soutěže {competition.title}.
        </p>
      </div>

      <form
        action={`/api/souteze/${id}/nastaveni`}
        method="post"
        encType="multipart/form-data"
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-6">
          <SportRulesSelector
            initialSport={competition.sport}
            initialPredictOverallWinner={
              competition.predict_overall_winner
            }
          />

          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Celkový vítěz soutěže
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                Tato část se použije, pokud je nahoře zapnuté
                tipování celkového vítěze za 10 bodů.
              </p>
            </div>

            <div className="mt-5">
              <label
                htmlFor="overallWinnerDeadline"
                className="mb-2 block text-sm font-bold text-gray-700"
              >
                Uzávěrka tipu na celkového vítěze
              </label>

              <input
                id="overallWinnerDeadline"
                name="overallWinnerDeadline"
                type="datetime-local"
                defaultValue={formatDeadlineForInput(
                  competition.overall_winner_deadline,
                )}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />

              <p className="mt-2 text-xs text-gray-500">
                Po tomto termínu už hráč nebude moci svůj tip změnit.
              </p>
            </div>

            <div className="mt-5">
              <label
                htmlFor="winnerOptions"
                className="mb-2 block text-sm font-bold text-gray-700"
              >
                Možní vítězové
              </label>

              <textarea
                id="winnerOptions"
                name="winnerOptions"
                rows={10}
                defaultValue={winnerOptions
                  .map((option) => option.name)
                  .join("\n")}
                placeholder={`Česko
USA
Srbsko
Francie`}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />

              <p className="mt-2 text-xs text-gray-500">
                Každého možného vítěze napiš na samostatný řádek.
              </p>
            </div>

            <div className="mt-5">
              <label
                htmlFor="overallWinnerOptionId"
                className="mb-2 block text-sm font-bold text-gray-700"
              >
                Skutečný vítěz
              </label>

              <select
                id="overallWinnerOptionId"
                name="overallWinnerOptionId"
                defaultValue={
                  competition.overall_winner_option_id ?? ""
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              >
                <option value="">
                  Zatím neurčeno
                </option>

                {winnerOptions.map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                  >
                    {option.name}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-gray-500">
                Vyber až po skončení soutěže. Správné tipy
                dostanou 10 bodů, ostatní 0.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Doplňující popis soutěže
            </label>

            <textarea
              id="description"
              name="description"
              rows={6}
              defaultValue={competition.description ?? ""}
              placeholder="Například: Tipujeme všechny zápasy od základní skupiny až po finále."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label
              htmlFor="entryFee"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Startovné
            </label>

            <div className="flex items-center gap-3">
              <input
                id="entryFee"
                name="entryFee"
                type="number"
                min="0"
                step="1"
                defaultValue={competition.entry_fee ?? ""}
                className="w-40 rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />

              <span className="font-semibold text-gray-600">
                Kč
              </span>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="paymentAccount"
                className="mb-2 block text-sm font-bold text-gray-700"
              >
                Číslo účtu
              </label>

              <input
                id="paymentAccount"
                name="paymentAccount"
                type="text"
                defaultValue={competition.payment_account ?? ""}
                placeholder="123456789"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
            </div>

            <div>
              <label
                htmlFor="paymentBankCode"
                className="mb-2 block text-sm font-bold text-gray-700"
              >
                Kód banky
              </label>

              <input
                id="paymentBankCode"
                name="paymentBankCode"
                type="text"
                inputMode="numeric"
                maxLength={4}
                defaultValue={competition.payment_bank_code ?? ""}
                placeholder="0800"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="paymentMessage"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Zpráva pro příjemce
            </label>

            <input
              id="paymentMessage"
              name="paymentMessage"
              type="text"
              defaultValue={competition.payment_message ?? ""}
              placeholder="Například: Tipovačka MS 2026"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div className="rounded-2xl border border-gray-200 p-5">
            <label
              htmlFor="paymentQr"
              className="block text-sm font-bold text-gray-900"
            >
              QR kód pro platbu
            </label>

            <p className="mt-1 text-sm text-gray-600">
              Nahraj QR kód vygenerovaný bankovní aplikací.
              Platební údaje se z něj automaticky načtou.
            </p>

            {competition.payment_qr_url && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Aktuální QR kód
                </p>

                <img
                  src={competition.payment_qr_url}
                  alt="QR kód pro platbu"
                  className="max-h-80 rounded-xl border border-gray-200 bg-white object-contain"
                />
              </div>
            )}

            <PaymentQrReader />

            <p className="mt-2 text-xs text-gray-500">
              PNG, JPG nebo WebP, maximálně 5 MB.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/souteze/${id}`}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
          >
            Zrušit
          </Link>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
          >
            Uložit nastavení
          </button>
        </div>
      </form>
    </div>
  );
}
