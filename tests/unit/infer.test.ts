import { describe, expect, it } from "vitest";

import { createDocument } from "../../src/shared/infer";

describe("createDocument", () => {
  it("infers useful field types and normalizes values", () => {
    const document = createDocument(
      [
        {
          Active: "yes",
          Email: "ana@example.com",
          Joined: "2026-07-01",
          Name: "Ana",
          Revenue: "1,250",
          Status: "Active",
          Website: "https://example.com/ana",
        },
        {
          Active: "no",
          Email: "bo@example.com",
          Joined: "2026-07-02",
          Name: "Bo",
          Revenue: "950",
          Status: "Paused",
          Website: "https://example.com/bo",
        },
        {
          Active: "yes",
          Email: "cy@example.com",
          Joined: "2026-07-03",
          Name: "Cy",
          Revenue: "2,300",
          Status: "Active",
          Website: "https://example.com/cy",
        },
      ],
      { title: "Customers", view: "kanban" },
    );

    expect(document.title).toBe("Customers");
    expect(document.view).toBe("kanban");
    expect(
      Object.fromEntries(
        document.columns.map((column) => [column.label, column.kind]),
      ),
    ).toEqual({
      Active: "boolean",
      Email: "email",
      Joined: "date",
      Name: "text",
      Revenue: "number",
      Status: "singleSelect",
      Website: "url",
    });
    expect(document.records[0]?.values).toMatchObject({
      active: true,
      revenue: 1250,
    });
    expect(document.groupBy).toBe("status");
  });

  it("accepts a label or id as an explicit grouping field", () => {
    const rows = [
      { Department: "Design", Name: "A" },
      { Department: "Engineering", Name: "B" },
      { Department: "Design", Name: "C" },
    ];

    expect(createDocument(rows, { groupBy: "Department" }).groupBy).toBe(
      "department",
    );
    expect(createDocument(rows, { groupBy: "department" }).groupBy).toBe(
      "department",
    );
  });

  it("rejects inputs without rows or columns", () => {
    expect(() => createDocument([])).toThrow("no records");
    expect(() => createDocument([{}])).toThrow("no columns");
  });
});
