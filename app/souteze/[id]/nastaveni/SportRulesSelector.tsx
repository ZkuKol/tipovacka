"use client";

import { useState } from "react";

type SportRulesSelectorProps = {
  initialSport: string;
  initialPredictOverallWinner: boolean;
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

export default function SportRulesSelector({
  initialSport,
  initialPredictOverallWinner,
}: SportRulesSelectorProps) {
  const [sport, setSport] = useState(initialSport);
  const [predictOverallWinner, setPredictOverallWinner] =
    useState(initialPredictOverallWinner);

  const rules = getRulesForSport(sport);

  return (
    <>
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
          value={sport}
          onChange={(event) => setSport(event.target.value)}
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

          {predictOverallWinner && (
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
          checked={predictOverallWinner}
          onChange={(event) =>
            setPredictOverallWinner(event.target.checked)
          }
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
    </>
  );
}
