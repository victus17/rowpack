import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadInput } from "../../src/cli/load-input";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function fixture(name: string, contents: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "rowpack-test-"));
  temporaryDirectories.push(directory);
  const path = join(directory, name);
  await writeFile(path, contents, "utf8");
  return path;
}

describe("loadInput", () => {
  it("loads CSV and JSON records", async () => {
    const csvPath = await fixture("people.csv", "Name,Role\nAna,Designer\n");
    const jsonPath = await fixture(
      "people.json",
      JSON.stringify([{ Name: "Bo", Role: "Engineer" }]),
    );

    await expect(loadInput(csvPath)).resolves.toEqual([
      { Name: "Ana", Role: "Designer" },
    ]);
    await expect(loadInput(jsonPath)).resolves.toEqual([
      { Name: "Bo", Role: "Engineer" },
    ]);
  });

  it("keeps commas intact when loading TSV records", async () => {
    const tsvPath = await fixture(
      "people.tsv",
      "Name\tStatus\tNotes\nAna\tDone\tContains, a comma\n",
    );

    await expect(loadInput(tsvPath)).resolves.toEqual([
      { Name: "Ana", Notes: "Contains, a comma", Status: "Done" },
    ]);
  });

  it("rejects unsupported and malformed inputs", async () => {
    const textPath = await fixture("people.txt", "Nope");
    const objectPath = await fixture("people.json", '{"Name":"Ana"}');

    await expect(loadInput(textPath)).rejects.toThrow("Unsupported input");
    await expect(loadInput(objectPath)).rejects.toThrow("array of objects");
  });
});
