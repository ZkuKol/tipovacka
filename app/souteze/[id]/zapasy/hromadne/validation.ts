import type { BulkMatch } from "./BulkMatchesEditor";

export type BulkMatchField =
  | "round"
  | "homeTeam"
  | "awayTeam"
  | "date"
  | "time";

export type ValidationError = {
  rowId: string;
  field: BulkMatchField;
  message: string;
};

function normalizeTeamName(value: string) {
  return value.trim().toLocaleLowerCase("cs");
}

export function validateRows(
  rows: BulkMatch[],
  sport: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const duplicateKeys = new Map<string, string[]>();

  const isTennis = sport === "tennis";

  for (const row of rows) {
    const homeTeam = row.homeTeam.trim();
    const awayTeam = row.awayTeam.trim();
    const date = row.date.trim();
    const time = row.time.trim();

    if (!homeTeam) {
      errors.push({
        rowId: row.id,
        field: "homeTeam",
        message: isTennis
          ? "Hráč 1 je povinný."
          : "Domácí tým je povinný.",
      });
    }

    if (!awayTeam) {
      errors.push({
        rowId: row.id,
        field: "awayTeam",
        message: isTennis
          ? "Hráč 2 je povinný."
          : "Hostující tým je povinný.",
      });
    }

    if (!date) {
      errors.push({
        rowId: row.id,
        field: "date",
        message: "Datum je povinné.",
      });
    }

    if (!time) {
      errors.push({
        rowId: row.id,
        field: "time",
        message: "Čas je povinný.",
      });
    }

    if (
      homeTeam &&
      awayTeam &&
      normalizeTeamName(homeTeam) === normalizeTeamName(awayTeam)
    ) {
      errors.push({
        rowId: row.id,
        field: "awayTeam",
        message: isTennis
          ? "Hráč 1 a Hráč 2 nesmí být stejní."
          : "Domácí a hostující tým nesmí být stejné.",
      });
    }

    if (homeTeam && awayTeam && date && time) {
      const duplicateKey = [
        normalizeTeamName(homeTeam),
        normalizeTeamName(awayTeam),
        date,
        time,
      ].join("|");

      const matchingRowIds =
        duplicateKeys.get(duplicateKey) ?? [];

      matchingRowIds.push(row.id);

      duplicateKeys.set(
        duplicateKey,
        matchingRowIds,
      );
    }
  }

  for (const matchingRowIds of duplicateKeys.values()) {
    if (matchingRowIds.length < 2) {
      continue;
    }

    for (const rowId of matchingRowIds) {
      errors.push({
        rowId,
        field: "homeTeam",
        message:
          "Tento zápas je v seznamu vícekrát.",
      });

      errors.push({
        rowId,
        field: "awayTeam",
        message:
          "Tento zápas je v seznamu vícekrát.",
      });
    }
  }

  return errors;
}

export function getFieldError(
  errors: ValidationError[],
  rowId: string,
  field: BulkMatchField,
) {
  return errors.find(
    (error) =>
      error.rowId === rowId &&
      error.field === field,
  );
}
