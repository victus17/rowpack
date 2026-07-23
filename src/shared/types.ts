export type CellValue = string | number | boolean | null;

export type ColumnKind =
  "boolean" | "date" | "email" | "number" | "singleSelect" | "text" | "url";

export interface RowpackColumn {
  id: string;
  kind: ColumnKind;
  label: string;
  options?: string[];
}

export interface RowpackRecord {
  id: string;
  values: Record<string, CellValue>;
}

export type RowpackView = "gallery" | "grid" | "kanban";

export interface RowpackDocument {
  columns: RowpackColumn[];
  createdAt: string;
  description: string;
  groupBy?: string;
  records: RowpackRecord[];
  title: string;
  version: 1;
  view: RowpackView;
}

export interface CreateDocumentOptions {
  description?: string;
  groupBy?: string;
  title?: string;
  view?: RowpackView;
}
