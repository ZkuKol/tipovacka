"use client";

import type { ClipboardEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import BulkMatchRow from "./BulkMatchRow";
import { validateRows } from "./validation";

export type BulkMatch = {
  id: string;
  round: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
};

type BulkMatchesEditorProps = {
  competitionId: string;
  sport: string;
};

type SaveBulkMatchesResponse = {
  success: boolean;
  message: string;
  insertedCount?: number;
};

function createEmptyRow(): BulkMatch {
  return {
    id: crypto.randomUUID(),
    round: "",
    homeTeam: "",
    awayTeam: "",
    date: "",
    time: "",
  };
}

function normalizeDate(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const isoMatch = trimmedValue.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  );

  if (isoMatch) {
    const [, year, month, day] = isoMatch;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const czechMatch = trimmedValue.match(
    /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/,
  );

  if (czechMatch) {
    const [, day, month, year] = czechMatch;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return trimmedValue;
}

function normalizeTime(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const timeMatch = trimmedValue.match(
    /^(\d{1,2}):(\d{2})/,
  );

  if (!timeMatch) {
    return trimmedValue;
  }

  const [, hours, minutes] = timeMatch;

  return `${hours.padStart(2, "0")}:${minutes}`;
}

function createRowsFromClipboard(
  text: string,
): BulkMatch[] {
  const pastedRows = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  return pastedRows.map((line) => {
    const columns = line.split("\t");

    return {
      id: crypto.randomUUID(),
      round: columns[0]?.trim() ?? "",
      homeTeam: columns[1]?.trim() ?? "",
      awayTeam: columns[2]?.trim() ?? "",
      date: normalizeDate(columns[3] ?? ""),
      time: normalizeTime(columns[4] ?? ""),
    };
  });
}

function createMatchTime(
  date: string,
  time: string,
): string {
  const localDate = new Date(
    `${date}T${time}:00`,
  );

  return localDate.toISOString();
}

export default function BulkMatchesEditor({
  competitionId,
  sport,
}: BulkMatchesEditorProps) {
  const router = useRouter();

  const isTennis = sport === "tennis";

  const firstParticipantLabel = isTennis
    ? "Hráč 1"
    : "Domácí";

  const secondParticipantLabel = isTennis
    ? "Hráč 2"
    : "Hosté";

  const [rows, setRows] = useState<BulkMatch[]>([
    createEmptyRow(),
  ]);

  const [message, setMessage] = useState("");
  const [showErrors, setShowErrors] =
    useState(false);
  const [isSaving, setIsSaving] =
    useState(false);
  const [saveSucceeded, setSaveSucceeded] =
    useState(false);

  const validationErrors = showErrors
    ? validateRows(rows, sport)
    : [];

  const hasErrors =
    validationErrors.length > 0;

  function addRow() {
    setRows((currentRows) => [
      ...currentRows,
      createEmptyRow(),
    ]);

    setMessage("");
    setSaveSucceeded(false);
  }

  function updateRow(
    rowId: string,
    field: keyof Omit<BulkMatch, "id">,
    value: string,
  ) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );

    setMessage("");
    setSaveSucceeded(false);
  }

  function removeRow(rowId: string) {
    setRows((currentRows) => {
      if (currentRows.length === 1) {
        return [createEmptyRow()];
      }

      return currentRows.filter(
        (row) => row.id !== rowId,
      );
    });

    setMessage("");
    setSaveSucceeded(false);
  }

  function handlePaste(
    event: ClipboardEvent<HTMLDivElement>,
  ) {
    const clipboardText =
      event.clipboardData.getData("text");

    if (
      !clipboardText.includes("\t") &&
      !clipboardText.includes("\n")
    ) {
      return;
    }

    event.preventDefault();

    const pastedRows =
      createRowsFromClipboard(clipboardText);

    if (pastedRows.length === 0) {
      return;
    }

    setRows(pastedRows);
    setShowErrors(false);
    setSaveSucceeded(false);

    setMessage(
      `Načteno ${pastedRows.length} ${
        pastedRows.length === 1
          ? "řádek"
          : "řádků"
      } ze schránky.`,
    );
  }

  async function handleSave() {
    const errors =
      validateRows(rows, sport);

    setShowErrors(true);
    setSaveSucceeded(false);

    if (errors.length > 0) {
      setMessage(
        `Seznam obsahuje ${errors.length} ${
          errors.length === 1
            ? "chybu"
            : "chyb"
        }. Oprav zvýrazněná pole.`,
      );

      return;
    }

    setIsSaving(true);
    setMessage("Ukládám zápasy…");

    try {
      const matchesToSave = rows.map(
        (row) => ({
          round: row.round,
          homeTeam: row.homeTeam,
          awayTeam: row.awayTeam,
          matchTime: createMatchTime(
            row.date,
            row.time,
          ),
        }),
      );

      const response = await fetch(
        `/api/competitions/${competitionId}/matches/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            matches: matchesToSave,
          }),
        },
      );

      let result: SaveBulkMatchesResponse;

      try {
        result =
          (await response.json()) as SaveBulkMatchesResponse;
      } catch {
        setMessage(
          "Server vrátil neplatnou odpověď. Zkontroluj API Route.",
        );
        return;
      }

      if (
        !response.ok ||
        !result.success
      ) {
        setMessage(
          result.message ||
            "Zápasy se nepodařilo uložit.",
        );
        return;
      }

      setSaveSucceeded(true);
      setMessage(result.message);

      window.setTimeout(() => {
        router.push(
          `/souteze/${competitionId}/zapasy`,
        );
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error(
        "Chyba při ukládání zápasů:",
        error,
      );

      setMessage(
        "Nepodařilo se spojit se serverem. Zkus to prosím znovu.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const messageHasError =
    hasErrors ||
    (!saveSucceeded &&
      message !== "" &&
      !message.startsWith("Načteno") &&
      !message.startsWith("Ukládám"));

  return (
    <section
      onPaste={handlePaste}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-200 bg-blue-50 px-4 py-3">
        <p className="text-sm text-blue-900">
          Zkopíruj řádky z Excelu a vlož je
          pomocí <strong>Ctrl + V</strong>.
        </p>

        <p className="mt-1 text-xs text-blue-700">
          Pořadí sloupců: Skupina,{" "}
          {firstParticipantLabel},{" "}
          {secondParticipantLabel}, Datum,
          Čas.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="w-16 px-3 py-3 text-center text-sm font-semibold">
                #
              </th>

              <th className="px-3 py-3 text-sm font-semibold">
                Skupina
              </th>

              <th className="px-3 py-3 text-sm font-semibold">
                {firstParticipantLabel}
              </th>

              <th className="px-3 py-3 text-sm font-semibold">
                {secondParticipantLabel}
              </th>

              <th className="w-44 px-3 py-3 text-sm font-semibold">
                Datum
              </th>

              <th className="w-36 px-3 py-3 text-sm font-semibold">
                Čas
              </th>

              <th className="w-24 px-3 py-3 text-center text-sm font-semibold">
                Akce
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <BulkMatchRow
                key={row.id}
                row={row}
                rowNumber={index + 1}
                sport={sport}
                errors={validationErrors}
                onChange={updateRow}
                onRemove={removeRow}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 border-t border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={addRow}
          disabled={isSaving}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Přidat řádek
        </button>

        <div className="flex flex-col gap-3 sm:items-end">
          {message && (
            <p
              className={`text-sm font-medium ${
                messageHasError
                  ? "text-red-700"
                  : saveSucceeded
                    ? "text-green-700"
                    : "text-blue-700"
              }`}
            >
              {saveSucceeded && "✓ "}
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={
              isSaving ||
              saveSucceeded
            }
            className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSaving
              ? "Ukládám…"
              : "Uložit všechny"}
          </button>
        </div>
      </div>
    </section>
  );
}
