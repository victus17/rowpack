import { nanoid } from "nanoid";

import type {
  CellValue,
  ColumnKind,
  CreateDocumentOptions,
  RowpackColumn,
  RowpackDocument,
  RowpackRecord,
} from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/[^\s]+$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/;
const TRUE_VALUES = new Set(["true", "yes", "y"]);
const FALSE_VALUES = new Set(["false", "no", "n"]);

function normalizeHeader(label: string, index: number): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || `column-${String(index + 1)}`;
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || toCellString(value) === "";
}

function toCellString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function inferKind(values: unknown[]): ColumnKind {
  const populated = values.filter((value) => !isEmpty(value));
  if (populated.length === 0) {
    return "text";
  }

  const strings = populated.map(toCellString);
  const lowered = strings.map((value) => value.toLowerCase());

  if (
    lowered.every((value) => TRUE_VALUES.has(value) || FALSE_VALUES.has(value))
  ) {
    return "boolean";
  }

  if (
    strings.every(
      (value) =>
        value !== "" && Number.isFinite(Number(value.replaceAll(",", ""))),
    )
  ) {
    return "number";
  }

  if (
    strings.every(
      (value) =>
        ISO_DATE_PATTERN.test(value) && Number.isFinite(Date.parse(value)),
    )
  ) {
    return "date";
  }

  if (strings.every((value) => EMAIL_PATTERN.test(value))) {
    return "email";
  }

  if (strings.every((value) => URL_PATTERN.test(value))) {
    return "url";
  }

  const unique = new Set(strings);
  if (
    populated.length >= 3 &&
    unique.size <= Math.min(12, Math.max(2, Math.ceil(populated.length * 0.5)))
  ) {
    return "singleSelect";
  }

  return "text";
}

function normalizeCell(value: unknown, kind: ColumnKind): CellValue {
  if (isEmpty(value)) {
    return null;
  }

  const stringValue = String(value).trim();

  if (kind === "number") {
    return Number(stringValue.replaceAll(",", ""));
  }

  if (kind === "boolean") {
    return TRUE_VALUES.has(stringValue.toLowerCase());
  }

  return stringValue;
}

function deduplicateIds(headers: string[]): string[] {
  const counts = new Map<string, number>();

  return headers.map((header, index) => {
    const base = normalizeHeader(header, index);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base}-${String(count + 1)}`;
  });
}

export function createDocument(
  sourceRows: Array<Record<string, unknown>>,
  options: CreateDocumentOptions = {},
): RowpackDocument {
  if (sourceRows.length === 0) {
    throw new Error("The input contains no records.");
  }

  const headers = Array.from(
    sourceRows.reduce((all, row) => {
      Object.keys(row).forEach((key) => all.add(key));
      return all;
    }, new Set<string>()),
  );

  if (headers.length === 0) {
    throw new Error("The input contains no columns.");
  }

  const ids = deduplicateIds(headers);
  const columns: RowpackColumn[] = headers.map((label, index) => {
    const kind = inferKind(sourceRows.map((row) => row[label]));
    const values = sourceRows
      .map((row) => row[label])
      .filter((value) => !isEmpty(value))
      .map(toCellString);

    return {
      id: ids[index] ?? `column-${String(index + 1)}`,
      kind,
      label: label.trim() || `Column ${String(index + 1)}`,
      ...(kind === "singleSelect"
        ? { options: Array.from(new Set(values)).sort() }
        : {}),
    };
  });

  const records: RowpackRecord[] = sourceRows.map((row) => ({
    id: nanoid(10),
    values: Object.fromEntries(
      columns.map((column, index) => [
        column.id,
        normalizeCell(row[headers[index] ?? ""], column.kind),
      ]),
    ),
  }));

  const suggestedGroup = columns.find(
    (column) => column.kind === "singleSelect",
  )?.id;
  const requestedGroup = columns.find(
    (column) =>
      column.id === options.groupBy || column.label === options.groupBy,
  )?.id;

  return {
    columns,
    createdAt: new Date().toISOString(),
    description:
      options.description ??
      `${records.length.toLocaleString("en-US")} records · packed locally`,
    ...(requestedGroup || suggestedGroup
      ? { groupBy: requestedGroup ?? suggestedGroup }
      : {}),
    records,
    title: options.title?.trim() || "Untitled base",
    version: 1,
    view: options.view ?? "grid",
  };
}
