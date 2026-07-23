import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";

import { Command, Option } from "commander";
import pc from "picocolors";

import { createDocument } from "../shared/infer";
import type { RowpackView } from "../shared/types";
import { compileDocument, loadRuntimeHtml } from "./compiler";
import { loadInput } from "./load-input";

const program = new Command()
  .name("rowpack")
  .version("0.1.0")
  .description(
    "Turn CSV, TSV or JSON into a private, editable app in one HTML file.",
  )
  .argument("<input>", "path to a CSV, TSV or JSON file")
  .option("-o, --output <file>", "output HTML path")
  .option("-t, --title <title>", "title shown inside the app")
  .option("-d, --description <text>", "short dataset description")
  .option("-g, --group-by <column>", "column used for Kanban groups")
  .addOption(
    new Option("-v, --view <view>", "initial view")
      .choices(["grid", "kanban", "gallery"])
      .default("grid"),
  )
  .showHelpAfterError()
  .action(
    async (
      input: string,
      options: {
        description?: string;
        groupBy?: string;
        output?: string;
        title?: string;
        view: RowpackView;
      },
    ) => {
      try {
        const inputPath = resolve(input);
        const rows = await loadInput(inputPath);
        const inferredTitle =
          basename(inputPath, extname(inputPath))
            .replaceAll(/[-_]+/g, " ")
            .replace(/\b\w/g, (character) => character.toUpperCase()) ||
          "Untitled base";
        const document = createDocument(rows, {
          description: options.description,
          groupBy: options.groupBy,
          title: options.title ?? inferredTitle,
          view: options.view,
        });
        const runtime = await loadRuntimeHtml();
        const outputPath = resolve(
          options.output ??
            `${inputPath.slice(0, -extname(inputPath).length)}.html`,
        );
        const html = compileDocument(runtime, document);

        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, html, "utf8");

        const size = Buffer.byteLength(html);
        console.log(
          `${pc.green("✓")} Packed ${pc.bold(String(document.records.length))} records into ${pc.cyan(outputPath)} ${pc.dim(`(${formatBytes(size)})`)}`,
        );
        console.log(
          pc.dim("  Double-click the file. No server or account required."),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown Rowpack error";
        console.error(`${pc.red("Error:")} ${message}`);
        process.exitCode = 1;
      }
    },
  );

await program.parseAsync();

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
