"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Sport =
  | "basketball"
  | "football"
  | "hockey"
  | "tennis";

type MatchResultFormProps = {
  competitionId: string;
  sport: Sport;
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
    finished: boolean;
  };
};

type Tip = {
  id: string;
  winner: "home" | "away" | null;
  margin_bucket: number | null;
  home_score_tip: number | null;
  away_score_tip: number | null;
};

function getMarginBucket(difference: number) {
  if (difference >= 91) {
    return 95;
  }

  return Math.ceil(difference / 5) * 5;
}

function getResultType(
  homeScore: number,
  awayScore: number,
): "home" | "draw" | "away" {
  if (homeScore > awayScore) {
    return "home";
  }

  if (homeScore < awayScore) {
    return "away";
  }

  return "draw";
}

function calculateBasketballPoints(
  tip: Tip,
  homeScore: number,
  awayScore: number,
) {
  const actualWinner: "home" | "away" =
    homeScore > awayScore ? "home" : "away";

  if (tip.winner !== actualWinner) {
    return 0;
  }

  const difference = Math.abs(homeScore - awayScore);
  const actualMarginBucket = getMarginBucket(difference);

  if (tip.margin_bucket === actualMarginBucket) {
    return 5;
  }

  return 1;
}

function calculateFootballOrHockeyPoints(
  tip: Tip,
  homeScore: number,
  awayScore: number,
) {
  if (
    tip.home_score_tip === null ||
    tip.away_score_tip === null
  ) {
    return 0;
  }

  if (
    tip.home_score_tip === homeScore &&
    tip.away_score_tip === awayScore
  ) {
    return 3;
  }

  const tippedResult = getResultType(
    tip.home_score_tip,
    tip.away_score_tip,
  );

  const actualResult = getResultType(
    homeScore,
    awayScore,
  );

  if (tippedResult === actualResult) {
    return 1;
  }

  return 0;
}

function calculateTennisPoints(
  tip: Tip,
  homeScore: number,
  awayScore: number,
) {
  if (
    tip.home_score_tip === null ||
    tip.away_score_tip === null
  ) {
    return 0;
  }

  const actualWinner: "home" | "away" =
    homeScore > awayScore ? "home" : "away";

  const tippedWinner: "home" | "away" =
    tip.home_score_tip > tip.away_score_tip
      ? "home"
      : "away";

  if (tippedWinner !== actualWinner) {
    return 0;
  }

  if (
    tip.home_score_tip === homeScore &&
    tip.away_score_tip === awayScore
  ) {
    return 2;
  }

  return 1;
}

function calculateTipPoints(
  sport: Sport,
  tip: Tip,
  homeScore: number,
  awayScore: number,
) {
  if (sport === "basketball") {
    return calculateBasketballPoints(
      tip,
      homeScore,
      awayScore,
    );
  }

  if (
    sport === "football" ||
    sport === "hockey"
  ) {
    return calculateFootballOrHockeyPoints(
      tip,
      homeScore,
      awayScore,
    );
  }

  if (sport === "tennis") {
    return calculateTennisPoints(
      tip,
      homeScore,
      awayScore,
    );
  }

  return 0;
}

export default function MatchResultForm({
  competitionId,
  sport,
  match,
}: MatchResultFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [homeScore, setHomeScore] = useState(
    match.homeScore?.toString() ?? "",
  );

  const [awayScore, setAwayScore] = useState(
    match.awayScore?.toString() ?? "",
  );

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");

    if (homeScore === "" || awayScore === "") {
      setErrorMessage(
        sport === "tennis"
          ? "Vyplň počet setů obou hráčů."
          : "Vyplň skóre obou týmů.",
      );
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
        sport === "tennis"
          ? "Počet setů musí být celé nezáporné číslo."
          : "Skóre musí být celé nezáporné číslo.",
      );
      return;
    }

    if (
      sport === "basketball" &&
      parsedHomeScore === parsedAwayScore
    ) {
      setErrorMessage(
        "Basketbalový zápas nemůže skončit remízou. Zadej konečný výsledek po případném prodloužení.",
      );
      return;
    }

    if (
      sport === "tennis" &&
      parsedHomeScore === parsedAwayScore
    ) {
      setErrorMessage(
        "Tenisový zápas nemůže skončit remízou na sety.",
      );
      return;
    }

    if (
      sport === "tennis" &&
      (parsedHomeScore > 5 || parsedAwayScore > 5)
    ) {
      setErrorMessage(
        "Počet vyhraných setů nemůže být vyšší než 5.",
      );
      return;
    }

    setIsSubmitting(true);

    const { error: matchError } = await supabase
      .from("matches")
      .update({
        home_score: parsedHomeScore,
        away_score: parsedAwayScore,
        finished: true,
      })
      .eq("id", match.id)
      .eq("competition_id", competitionId);

    if (matchError) {
      setErrorMessage(
        `Výsledek se nepodařilo uložit: ${matchError.message}`,
      );

      setIsSubmitting(false);
      return;
    }

    const { data: tipsData, error: tipsError } =
      await supabase
        .from("tips")
        .select(
          `
            id,
            winner,
            margin_bucket,
            home_score_tip,
            away_score_tip
          `,
        )
        .eq("match_id", match.id);

    if (tipsError) {
      setErrorMessage(
        `Výsledek byl uložen, ale nepodařilo se načíst tipy pro vyhodnocení: ${tipsError.message}`,
      );

      setIsSubmitting(false);
      return;
    }

    const tips = (tipsData ?? []) as Tip[];

    const scoringResults = await Promise.all(
      tips.map((tip) => {
        const points = calculateTipPoints(
          sport,
          tip,
          parsedHomeScore,
          parsedAwayScore,
        );

        return supabase
          .from("tips")
          .update({ points })
          .eq("id", tip.id);
      }),
    );

    const scoringError = scoringResults.find(
      (result) => result.error,
    )?.error;

    if (scoringError) {
      setErrorMessage(
        `Výsledek byl uložen, ale nepodařilo se přepočítat všechny tipy: ${scoringError.message}`,
      );

      setIsSubmitting(false);
      return;
    }

    router.push(`/souteze/${competitionId}/zapasy`);
    router.refresh();
  }

  async function handleRemoveResult() {
    const confirmed = window.confirm(
      "Opravdu chceš výsledek zápasu odstranit? Body za tento zápas budou vynulované.",
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const { error: matchError } = await supabase
      .from("matches")
      .update({
        home_score: null,
        away_score: null,
        finished: false,
      })
      .eq("id", match.id)
      .eq("competition_id", competitionId);

    if (matchError) {
      setErrorMessage(
        `Výsledek se nepodařilo odstranit: ${matchError.message}`,
      );

      setIsSubmitting(false);
      return;
    }

    const { error: tipsError } = await supabase
      .from("tips")
      .update({
        points: 0,
      })
      .eq("match_id", match.id);

    if (tipsError) {
      setErrorMessage(
        `Výsledek byl odstraněn, ale nepodařilo se vynulovat body: ${tipsError.message}`,
      );

      setIsSubmitting(false);
      return;
    }

    router.push(`/souteze/${competitionId}/zapasy`);
    router.refresh();
  }

  const scoreLabel =
    sport === "tennis"
      ? "výsledek na sety"
      : "konečný výsledek";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Zadat výsledek
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Zadej {scoreLabel}. Po uložení bude zápas označený
          jako odehraný a všechny tipy se automaticky vyhodnotí.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        {sport === "tennis" && (
          <p className="mb-5 rounded-xl bg-gray-50 px-4 py-3 text-center text-sm font-semibold text-gray-600">
            Zadej počet vyhraných setů obou hráčů.
          </p>
        )}

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
              max={sport === "tennis" ? 5 : undefined}
              step="1"
              value={homeScore}
              onChange={(event) =>
                setHomeScore(event.target.value)
              }
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
              max={sport === "tennis" ? 5 : undefined}
              step="1"
              value={awayScore}
              onChange={(event) =>
                setAwayScore(event.target.value)
              }
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
                ? "Vyhodnocuji…"
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
