import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { rowpackDocumentSchema } from "../shared/schema";
import type { RowpackDocument } from "../shared/types";

const PAYLOAD_SENTINEL = "__ROWPACK_PAYLOAD__";

export function serializeForHtml(document: RowpackDocument): string {
  const validated = rowpackDocumentSchema.parse(document);
  return JSON.stringify(validated)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function compileDocument(
  runtimeHtml: string,
  document: RowpackDocument,
): string {
  if (!runtimeHtml.includes(PAYLOAD_SENTINEL)) {
    throw new Error(
      "The Rowpack runtime is missing its payload placeholder. Rebuild the package.",
    );
  }

  const title = escapeHtml(document.title);
  const description = escapeHtml(document.description);

  const compiled = runtimeHtml
    .replace(PAYLOAD_SENTINEL, serializeForHtml(document))
    .replace(/<title>.*?<\/title>/s, `<title>${title} · Rowpack</title>`)
    .replace(
      /<meta\s+name="description"\s+content=".*?"\s*\/?>/s,
      `<meta name="description" content="${description}" />`,
    );

  return replaceMetaProperty(
    replaceMetaProperty(compiled, "og:title", `${document.title} · Rowpack`),
    "og:description",
    document.description,
  );
}

export async function loadRuntimeHtml(): Promise<string> {
  const cliDirectory = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(cliDirectory, "../runtime/index.html"),
    resolve(cliDirectory, "../../dist/runtime/index.html"),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch {
      // Try the next location. The first is used by the packed CLI.
    }
  }

  throw new Error(
    "Could not find the Rowpack runtime. Run `pnpm build:runtime` first.",
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceMetaProperty(
  html: string,
  property: string,
  content: string,
): string {
  const pattern = new RegExp(
    `<meta\\s+property="${property}"\\s+content=".*?"\\s*\\/?>`,
    "s",
  );
  return html.replace(
    pattern,
    `<meta property="${property}" content="${escapeHtml(content)}" />`,
  );
}
