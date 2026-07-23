import type { RowpackDocument } from "./types";

export const demoDocument: RowpackDocument = {
  columns: [
    { id: "name", kind: "text", label: "Name" },
    {
      id: "status",
      kind: "singleSelect",
      label: "Status",
      options: ["Backlog", "In progress", "Review", "Done"],
    },
    {
      id: "priority",
      kind: "singleSelect",
      label: "Priority",
      options: ["High", "Medium", "Low"],
    },
    { id: "owner", kind: "text", label: "Owner" },
    { id: "due", kind: "date", label: "Due" },
    { id: "notes", kind: "text", label: "Notes" },
  ],
  createdAt: "2026-07-23T12:00:00.000Z",
  description: "12 launch tasks · private and offline",
  groupBy: "status",
  records: [
    {
      id: "task-1",
      values: {
        due: "2026-07-24",
        name: "Polish the launch demo",
        notes: "Keep the first run under ten seconds.",
        owner: "Maya",
        priority: "High",
        status: "In progress",
      },
    },
    {
      id: "task-2",
      values: {
        due: "2026-07-25",
        name: "Record the README loop",
        notes: "CSV → app → edit → save.",
        owner: "Leon",
        priority: "High",
        status: "Review",
      },
    },
    {
      id: "task-3",
      values: {
        due: "2026-07-26",
        name: "Write Show HN post",
        notes: "Lead with the artifact, not the stack.",
        owner: "Nora",
        priority: "Medium",
        status: "Backlog",
      },
    },
    {
      id: "task-4",
      values: {
        due: "2026-07-23",
        name: "Verify offline save",
        notes: "Chrome, Safari and Firefox fallback.",
        owner: "Maya",
        priority: "High",
        status: "Done",
      },
    },
    {
      id: "task-5",
      values: {
        due: "2026-07-28",
        name: "Prepare inventory example",
        notes: "Use recognisable, realistic sample data.",
        owner: "Owen",
        priority: "Low",
        status: "Backlog",
      },
    },
    {
      id: "task-6",
      values: {
        due: "2026-07-24",
        name: "Tighten keyboard flow",
        notes: "Focus states should feel intentional.",
        owner: "Leon",
        priority: "Medium",
        status: "In progress",
      },
    },
  ],
  title: "Launch tracker",
  version: 1,
  view: "kanban",
};
