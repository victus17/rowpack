import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import { parseCsv } from "../shared/csv";

export async function loadInput(
  inputPath: string,
): Promise<Array<Record<string, unknown>>> {
  const extension = extname(inputPath).toLowerCase();
  const contents = await readFile(inputPath, "utf8");

  if (extension === ".csv" || extension === ".tsv") {
    return parseCsv(contents, extension === ".tsv" ? "\t" : ",");
  }

  if (extension === ".json") {
    const parsed: unknown = JSON.parse(contents);
    if (!Array.isArray(parsed)) {
      throw new Error("JSON input must be an array of objects.");
    }

    if (
      !parsed.every(
        (row) => typeof row === "object" && row !== null && !Array.isArray(row),
      )
    ) {
      throw new Error("Every JSON row must be an object.");
    }

    return parsed as Array<Record<string, unknown>>;
  }

  throw new Error(
    `Unsupported input format "${extension || "unknown"}". Use CSV, TSV or JSON.`,
  );
}
