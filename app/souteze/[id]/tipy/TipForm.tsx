"use client";

import { useState } from "react";

type Winner = "home" | "away";

type TipFormProps = {
  action: string;
  homeTeam: string;
  awayTeam: string;
  initialWinner?: Winner;
  initialMarginBucket?: number;
  locked: boolean;
  hasSavedTip: boolean;
};

function getMarginLabel(marginBucket: number) {
  if (marginBucket === 95) {
    return "91+ bodů";
  }

  return `${marginBucket - 4}–${marginBucket} bodů`;
}

export default function TipForm({
  action,
  homeTeam,
  awayTeam,
  initialWinner,
  initialMarginBucket = 5,
  locked,
  hasSavedTip,
}: TipFormProps) {
  const [isEditing, setIsEditing] = useState(!hasSavedTip);
  const [winner, setWinner] = useState<Winner | null>(
    initialWinner ?? null,
  );
  const [marginBucket, setMarginBucket] = useState(
    initialMarginBucket,
  );

  function decreaseMargin() {
    setMarginBucket((current) => Math.max(5, current - 5));
  }

  function increaseMargin() {
    setMarginBucket((current) => Math.min(95, current + 5));
  }

  function cancelEditing() {
    setWinner(initialWinner ?? null);
    setMarginBucket(initialMarginBucket);
    setIsEditing(false);
  }

  const isFrozen = locked || (hasSavedTip && !isEditing);

  return (
    <div className="mt-5">
      <div
        className={`rounded-2xl border p-5 transition ${
          isFrozen
            ? "border-gray-200 bg-gray-50"
            : "border-orange-200 bg-white"
        }`}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <button
            type="button"
            disabled={isFrozen}
            onClick={() => setWinner("home")}
            className={`flex flex-col items-center gap-2 rounded-xl px-3 py-3 text-center transition ${
              winner === "home"
                ? "bg-orange-50 text-orange-700"
                : "text-gray-900"
            } disabled:cursor-default`}
          >
            <span className="text-lg font-bold">{homeTeam}</span>

            <span
              aria-hidden="true"
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-inner ${
                winner === "home"
                  ? "border-orange-600 bg-orange-600"
                  : "border-gray-400 bg-white"
              }`}
            >
              {winner === "home" && (
                <span className="h-3 w-3 rounded-full bg-white" />
              )}
            </span>
          </button>

          <div className="flex min-w-36 flex-col items-center">
            <p className="text-sm font-semibold text-gray-600">
              {getMarginLabel(marginBucket)}
            </p>

            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                disabled={isFrozen || marginBucket === 5}
                onClick={decreaseMargin}
                aria-label="Snížit rozdíl"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-300 bg-orange-50 text-xl font-bold text-orange-700 shadow-sm transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
              >
                −
              </button>

              <span className="min-w-10 text-center text-xl font-bold text-gray-900">
                {marginBucket}
              </span>

              <button
                type="button"
                disabled={isFrozen || marginBucket === 95}
                onClick={increaseMargin}
                aria-label="Zvýšit rozdíl"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-300 bg-orange-50 text-xl font-bold text-orange-700 shadow-sm transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={isFrozen}
            onClick={() => setWinner("away")}
            className={`flex flex-col items-center gap-2 rounded-xl px-3 py-3 text-center transition ${
              winner === "away"
                ? "bg-orange-50 text-orange-700"
                : "text-gray-900"
            } disabled:cursor-default`}
          >
            <span className="text-lg font-bold">{awayTeam}</span>

            <span
              aria-hidden="true"
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-inner ${
                winner === "away"
                  ? "border-orange-600 bg-orange-600"
                  : "border-gray-400 bg-white"
              }`}
            >
              {winner === "away" && (
                <span className="h-3 w-3 rounded-full bg-white" />
              )}
            </span>
          </button>
        </div>
      </div>

      {locked ? (
        <p className="mt-4 text-center text-sm font-semibold text-gray-600">
          Tipování je uzamčeno.
        </p>
      ) : hasSavedTip && !isEditing ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-xl border border-orange-600 px-5 py-2.5 text-sm font-bold text-orange-700 transition hover:bg-orange-50"
          >
            Upravit tip
          </button>

          <span className="text-sm font-semibold text-green-700">
            Tip uložen
          </span>
        </div>
      ) : (
        <form action={action} method="post" className="mt-4">
          <input type="hidden" name="winner" value={winner ?? ""} />
          <input
            type="hidden"
            name="marginBucket"
            value={marginBucket}
          />

          <div className="flex items-center justify-center gap-3">
            <button
              type="submit"
              disabled={!winner}
              className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
            >
              Uložit tip
            </button>

            {hasSavedTip && (
              <button
                type="button"
                onClick={cancelEditing}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
              >
                Zrušit
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
