import { describe, expect, it } from "vitest";

import { compileDocument, serializeForHtml } from "../../src/cli/compiler";
import type { RowpackDocument } from "../../src/shared/types";

const documentFixture: RowpackDocument = {
  columns: [{ id: "name", kind: "text", label: "Name" }],
  createdAt: "2026-07-23T12:00:00.000Z",
  description: "Private <base>",
  records: [
    {
      id: "record-1",
      values: { name: "</script><script>alert('xss')</script>" },
    },
  ],
  title: "Customers & partners",
  version: 1,
  view: "grid",
};

describe("HTML compiler", () => {
  it("escapes payloads so values cannot break out of the data script", () => {
    const payload = serializeForHtml(documentFixture);

    expect(payload).not.toContain("</script>");
    expect(payload).toContain("\\u003c/script>");
  });

  it("injects data and SEO metadata into the self-contained runtime", () => {
    const runtime =
      '<!doctype html><html><head><title>Rowpack</title><meta name="description" content="old" /></head><body><script id="rowpack-data" type="application/json">__ROWPACK_PAYLOAD__</script></body></html>';
    const html = compileDocument(runtime, documentFixture);

    expect(html).toContain("<title>Customers &amp; partners · Rowpack</title>");
    expect(html).toContain('content="Private &lt;base&gt;"');
    expect(html).not.toContain("__ROWPACK_PAYLOAD__");
    expect(html).not.toContain("</script><script>alert");
  });

  it("fails loudly when the runtime is incomplete", () => {
    expect(() => compileDocument("<html></html>", documentFixture)).toThrow(
      "payload placeholder",
    );
  });
});
