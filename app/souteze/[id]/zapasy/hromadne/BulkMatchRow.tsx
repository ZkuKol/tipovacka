"use client";

import type { BulkMatch } from "./BulkMatchesEditor";
import type {
  BulkMatchField,
  ValidationError,
} from "./validation";

import { getFieldError } from "./validation";

type BulkMatchRowProps = {
  row: BulkMatch;
  rowNumber: number;
  sport: string;
  errors: ValidationError[];

  onChange: (
    rowId: string,
    field: BulkMatchField,
    value: string,
  ) => void;

  onRemove: (rowId: string) => void;
};

const baseInputClassName =
  "w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition";

function getInputClassName(
  hasError: boolean,
) {
  return hasError
    ? `${baseInputClassName} border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-100`
    : `${baseInputClassName} border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100`;
}

export default function BulkMatchRow({
  row,
  rowNumber,
  sport,
  errors,
  onChange,
  onRemove,
}: BulkMatchRowProps) {
  const isTennis =
    sport === "tennis";

  function renderInput(
    field: BulkMatchField,
    type: "text" | "date" | "time",
    value: string,
    placeholder?: string,
  ) {
    const error =
      getFieldError(
        errors,
        row.id,
        field,
      );

    return (
      <div>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(
              row.id,
              field,
              event.target.value,
            )
          }
          className={getInputClassName(
            Boolean(error),
          )}
        />

        {error && (
          <p className="mt-1 text-xs font-medium text-red-600">
            {error.message}
          </p>
        )}
      </div>
    );
  }

  const rowHasError =
    errors.some(
      (error) =>
        error.rowId === row.id,
    );

  return (
    <tr
      className={
        rowHasError
          ? "border-t border-red-200 bg-red-50/40"
          : "border-t border-gray-200"
      }
    >
      <td className="px-3 py-2 text-center text-sm text-gray-500">
        {rowNumber}
      </td>

      <td className="px-3 py-2">
        {renderInput(
          "round",
          "text",
          row.round,
          "A",
        )}
      </td>

      <td className="px-3 py-2">
        {renderInput(
          "homeTeam",
          "text",
          row.homeTeam,
          isTennis
            ? "Hráč 1"
            : "Domácí tým",
        )}
      </td>

      <td className="px-3 py-2">
        {renderInput(
          "awayTeam",
          "text",
          row.awayTeam,
          isTennis
            ? "Hráč 2"
            : "Hostující tým",
        )}
      </td>

      <td className="px-3 py-2">
        {renderInput(
          "date",
          "date",
          row.date,
        )}
      </td>

      <td className="px-3 py-2">
        {renderInput(
          "time",
          "time",
          row.time,
        )}
      </td>

      <td className="px-3 py-2 text-center">
        <button
          type="button"
          onClick={() =>
            onRemove(row.id)
          }
          className="rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
          aria-label={`Odstranit řádek ${rowNumber}`}
        >
          Smazat
        </button>
      </td>
    </tr>
  );
}
