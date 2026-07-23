import { z } from "zod";

export const cellValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const rowpackColumnSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "boolean",
    "date",
    "email",
    "number",
    "singleSelect",
    "text",
    "url",
  ]),
  label: z.string().min(1),
  options: z.array(z.string()).optional(),
});

export const rowpackDocumentSchema = z.object({
  columns: z.array(rowpackColumnSchema).min(1),
  createdAt: z.iso.datetime(),
  description: z.string(),
  groupBy: z.string().optional(),
  records: z.array(
    z.object({
      id: z.string().min(1),
      values: z.record(z.string(), cellValueSchema),
    }),
  ),
  title: z.string().min(1),
  version: z.literal(1),
  view: z.enum(["gallery", "grid", "kanban"]),
});
