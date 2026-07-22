"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type MatchResultFormProps = {
  competitionId: string;
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
    finished: boolean;
  };
};

export default function MatchResultForm({
  competitionId,
  match,
}: MatchResultFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [homeScore, setHomeScore] = useState(
    match.homeScore?.toString() ?? ""
  );

  const [awayScore, setAwayScore] = useState(
    match.awayScore?.toString() ?? ""
  );

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (homeScore === "" || awayScore === "") {
      setErrorMessage("Vyplň skóre obou týmů.");
      return;
    }

    const parsedHomeScore = Number(homeScore);
    const parsedAwayScore = Number(awayScore);

    if (
      !Number.isInteger(parsedHomeScore) ||
      !Number.isInteger(parsedAwayScore) ||
      parsedHomeScore < 0 ||
      parsedAwayScore < 0
    ) {
      setErrorMessage(
        "Skóre musí být celé nezáporné číslo."
      );
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("matches")
      .update({
        home_score: parsedHomeScore,
        away_score: parsedAwayScore,
        finished: true,
      })
      .eq("id", match.id)
      .eq("competition_id", competitionId);

    if (error) {
      setErrorMessage(
        `Výsledek se nepodařilo uložit: ${error.message}`
      );

      setIsSubmitting(false);
      return;
    }

    router.push(`/souteze/${competitionId}/zapasy`);
    router.refresh();
  }

  async function handleRemoveResult() {
    const confirmed = window.confirm(
      "Opravdu chceš výsledek zápasu odstranit?"
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("matches")
      .update({
        home_score: null,
        away_score: null,
        finished: false,
      })
      .eq("id", match.id)
      .eq("competition_id", competitionId);

    if (error) {
      setErrorMessage(
        `Výsledek se nepodařilo odstranit: ${error.message}`
      );

      setIsSubmitting(false);
      return;
    }

    router.push(`/souteze/${competitionId}/zapasy`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Zadat výsledek
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Po uložení bude zápas označený jako odehraný.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-4">
          <div>
            <label
              htmlFor="homeScore"
              className="mb-2 block text-center text-sm font-bold text-gray-700"
            >
              {match.homeTeam}
            </label>

            <input
              id="homeScore"
              type="number"
              min="0"
              step="1"
              value={homeScore}
              onChange={(event) => setHomeScore(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-4 text-center text-3xl font-black text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <span className="pb-4 text-2xl font-black text-gray-400">
            :
          </span>

          <div>
            <label
              htmlFor="awayScore"
              className="mb-2 block text-center text-sm font-bold text-gray-700"
            >
              {match.awayTeam}
            </label>

            <input
              id="awayScore"
              type="number"
              min="0"
              step="1"
              value={awayScore}
              onChange={(event) => setAwayScore(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-4 text-center text-3xl font-black text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <div>
            {match.finished && (
              <button
                type="button"
                onClick={handleRemoveResult}
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-xl border border-red-300 px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 sm:w-auto"
              >
                Odstranit výsledek
              </button>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Link
              href={`/souteze/${competitionId}/zapasy`}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
            >
              Zrušit
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
            >
              {isSubmitting
                ? "Ukládám…"
                : match.finished
                  ? "Uložit změny"
                  : "Uložit výsledek"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
