import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import PaymentQrReader from "./PaymentQrReader";

type CompetitionSettingsPageProps = {
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

  const rules = getRulesForSport(competition.sport);

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
          <div>
            <label
              htmlFor="sport"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Sport
            </label>

            <select
              id="sport"
              name="sport"
              defaultValue={competition.sport}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            >
              <option value="basketball">Basketbal</option>
              <option value="football">Fotbal</option>
              <option value="hockey">Hokej</option>
              <option value="tennis">Tenis</option>
            </select>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm font-bold text-gray-900">
              Pravidla podle sportu
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

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4">
            <input
              type="checkbox"
              name="predictOverallWinner"
              value="true"
              defaultChecked={competition.predict_overall_winner}
              className="mt-1 h-5 w-5 rounded border-gray-300"
            />

            <span>
              <span className="block font-bold text-gray-900">
                Tipuje se celkový vítěz soutěže
              </span>

              <span className="mt-1 block text-sm text-gray-600">
                Za správný tip získá hráč 10 bodů.
              </span>
            </span>
          </label>

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
              Platební údaje se z něj pokusíme automaticky načíst.
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
