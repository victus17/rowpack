import Papa from "papaparse";

import type { CellValue, RowpackColumn, RowpackRecord } from "./types";

const FORMULA_PREFIX = /^[=+\-@]/;

export function parseCsv(
  contents: string,
  delimiter?: "," | "\t",
): Array<Record<string, unknown>> {
  const result = Papa.parse<Record<string, string>>(contents, {
    ...(delimiter ? { delimiter } : {}),
    dynamicTyping: false,
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    const first = result.errors[0];
    throw new Error(
      `CSV parse error${first?.row === undefined ? "" : ` on row ${String(first.row + 1)}`}: ${first?.message ?? "Unknown error"}`,
    );
  }

  return result.data;
}

function protectSpreadsheetFormula(value: CellValue): CellValue {
  if (typeof value !== "string" || !FORMULA_PREFIX.test(value)) {
    return value;
  }

  return `'${value}`;
}

export function recordsToCsv(
  columns: RowpackColumn[],
  records: RowpackRecord[],
): string {
  return Papa.unparse(
    records.map((record) =>
      Object.fromEntries(
        columns.map((column) => [
          column.label,
          protectSpreadsheetFormula(record.values[column.id] ?? null),
        ]),
      ),
    ),
    {
      newline: "\r\n",
    },
  );
}
