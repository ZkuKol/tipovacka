"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewMatchPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const competitionId = params.id;

  const [round, setRound] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [matchTime, setMatchTime] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    const cleanHomeTeam = homeTeam.trim();
    const cleanAwayTeam = awayTeam.trim();
    const cleanRound = round.trim();

    if (!cleanHomeTeam || !cleanAwayTeam || !matchTime) {
      setErrorMessage("Vyplň domácí tým, hostující tým a termín zápasu.");
      return;
    }

    if (cleanHomeTeam.toLowerCase() === cleanAwayTeam.toLowerCase()) {
      setErrorMessage("Domácí a hostující tým nemohou být stejné.");
      return;
    }

    const parsedMatchTime = new Date(matchTime);

    if (Number.isNaN(parsedMatchTime.getTime())) {
      setErrorMessage("Zadaný termín zápasu není platný.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("matches").insert({
      competition_id: competitionId,
      round: cleanRound || null,
      home_team: cleanHomeTeam,
      away_team: cleanAwayTeam,
      match_time: parsedMatchTime.toISOString(),
      finished: false,
    });

    if (error) {
      setErrorMessage(`Zápas se nepodařilo uložit: ${error.message}`);
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
          Přidat zápas
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Vyplň základní údaje nového zápasu.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="round"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Kolo nebo skupina
            </label>

            <input
              id="round"
              type="text"
              value={round}
              onChange={(event) => setRound(event.target.value)}
              placeholder="Například: 1. kolo nebo Skupina A"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label
              htmlFor="homeTeam"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Domácí tým
            </label>

            <input
              id="homeTeam"
              type="text"
              value={homeTeam}
              onChange={(event) => setHomeTeam(event.target.value)}
              placeholder="Název domácího týmu"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label
              htmlFor="awayTeam"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Hostující tým
            </label>

            <input
              id="awayTeam"
              type="text"
              value={awayTeam}
              onChange={(event) => setAwayTeam(event.target.value)}
              placeholder="Název hostujícího týmu"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          <div>
            <label
              htmlFor="matchTime"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Datum a čas zápasu
            </label>

            <input
              id="matchTime"
              type="datetime-local"
              value={matchTime}
              onChange={(event) => setMatchTime(event.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
            {isSubmitting ? "Ukládám…" : "Uložit zápas"}
          </button>
        </div>
      </form>
    </div>
  );
}
