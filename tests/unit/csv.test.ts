import { describe, expect, it } from "vitest";

import { parseCsv, recordsToCsv } from "../../src/shared/csv";
import type { RowpackColumn, RowpackRecord } from "../../src/shared/types";

describe("CSV handling", () => {
  it("parses quoted and multiline values", () => {
    const rows = parseCsv(
      'Name,Notes\r\nAna,"One, two"\r\nBo,"First line\nSecond line"\r\n',
    );

    expect(rows).toEqual([
      { Name: "Ana", Notes: "One, two" },
      { Name: "Bo", Notes: "First line\nSecond line" },
    ]);
  });

  it("neutralizes spreadsheet formulas during export", () => {
    const columns: RowpackColumn[] = [
      { id: "name", kind: "text", label: "Name" },
      { id: "value", kind: "text", label: "Value" },
    ];
    const records: RowpackRecord[] = [
      { id: "1", values: { name: "Safe", value: "=2+2" } },
      { id: "2", values: { name: "Also safe", value: "@SUM(A1:A2)" } },
    ];

    const csv = recordsToCsv(columns, records);
    expect(csv).toContain("'=2+2");
    expect(csv).toContain("'@SUM(A1:A2)");
  });
});
