import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Circle,
  Columns3,
  Download,
  FileDown,
  GalleryHorizontalEnd,
  GripVertical,
  LayoutGrid,
  ListFilter,
  PackageOpen,
  PencilLine,
  Plus,
  Redo2,
  Rows3,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import { recordsToCsv } from "../shared/csv";
import { demoDocument } from "../shared/demo";
import { rowpackDocumentSchema } from "../shared/schema";
import type {
  CellValue,
  RowpackColumn,
  RowpackDocument,
  RowpackRecord,
  RowpackView,
} from "../shared/types";

interface FileSystemWritable {
  close(): Promise<void>;
  write(data: Blob): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritable>;
}

declare global {
  interface Window {
    showSaveFilePicker?: (options: {
      suggestedName: string;
      types: Array<{
        accept: Record<string, string[]>;
        description: string;
      }>;
    }) => Promise<FileSystemFileHandle>;
  }
}

interface SortState {
  columnId: string;
  direction: "asc" | "desc";
}

type ToastKind = "success" | "warning";

interface ToastMessage {
  id: number;
  kind: ToastKind;
  message: string;
}

function readEmbeddedDocument(): RowpackDocument {
  const element = document.querySelector<HTMLScriptElement>("#rowpack-data");
  const contents = element?.textContent.trim();

  if (!contents || contents[0] !== "{") {
    return structuredClone(demoDocument);
  }

  try {
    return rowpackDocumentSchema.parse(JSON.parse(contents));
  } catch (error) {
    console.error("Invalid Rowpack payload", error);
    return structuredClone(demoDocument);
  }
}

function compareValues(
  left: CellValue | undefined,
  right: CellValue | undefined,
): number {
  if (left === right) {
    return 0;
  }
  if (left === null || left === undefined) {
    return 1;
  }
  if (right === null || right === undefined) {
    return -1;
  }
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "rowpack"
  );
}

function serializeCurrentDocument(rowpackDocument: RowpackDocument): string {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  const app = clone.querySelector("#app");
  const payload = clone.querySelector("#rowpack-data");

  if (!app || !payload) {
    throw new Error("This file is missing its Rowpack shell.");
  }

  app.replaceChildren();
  payload.textContent = JSON.stringify(rowpackDocument)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");

  clone.querySelectorAll("[data-rowpack-transient]").forEach((element) => {
    element.remove();
  });

  return `<!doctype html>\n${clone.outerHTML}`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function useDocumentHistory(initial: RowpackDocument) {
  const [current, setCurrent] = useState(initial);
  const [past, setPast] = useState<RowpackDocument[]>([]);
  const [future, setFuture] = useState<RowpackDocument[]>([]);

  const commit = (next: RowpackDocument): void => {
    setPast((items) => [...items.slice(-39), current]);
    setCurrent(next);
    setFuture([]);
  };

  const undo = (): void => {
    const previous = past.at(-1);
    if (!previous) {
      return;
    }
    setFuture((items) => [current, ...items].slice(0, 40));
    setCurrent(previous);
    setPast((items) => items.slice(0, -1));
  };

  const redo = (): void => {
    const next = future[0];
    if (!next) {
      return;
    }
    setPast((items) => [...items.slice(-39), current]);
    setCurrent(next);
    setFuture((items) => items.slice(1));
  };

  return {
    canRedo: future.length > 0,
    canUndo: past.length > 0,
    commit,
    current,
    redo,
    undo,
  };
}

export function App() {
  const history = useDocumentHistory(readEmbeddedDocument());
  const data = history.current;
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, kind: ToastKind = "success"): void => {
    setToast({ id: Date.now(), kind, message });
  };

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const modifier = event.metaKey || event.ctrlKey;

      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveHtml();
      }

      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (modifier && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        history.undo();
      }

      if (
        modifier &&
        (event.key.toLowerCase() === "y" ||
          (event.key.toLowerCase() === "z" && event.shiftKey))
      ) {
        event.preventDefault();
        history.redo();
      }

      if (event.key === "Escape") {
        setSelectedId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const visibleRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? data.records.filter((record) =>
          data.columns.some((column) =>
            String(record.values[column.id] ?? "")
              .toLowerCase()
              .includes(normalizedQuery),
          ),
        )
      : [...data.records];

    if (!sort) {
      return filtered;
    }

    return filtered.sort((left, right) => {
      const comparison = compareValues(
        left.values[sort.columnId],
        right.values[sort.columnId],
      );
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [data, query, sort]);

  const selectedRecord =
    data.records.find((record) => record.id === selectedId) ?? null;

  const updateView = (view: RowpackView): void => {
    if (view === data.view) {
      return;
    }
    history.commit({ ...data, view });
  };

  const updateGroupBy = (columnId: string): void => {
    history.commit({ ...data, groupBy: columnId });
  };

  const changeSort = (columnId: string): void => {
    setSort((current) => {
      if (!current || current.columnId !== columnId) {
        return { columnId, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { columnId, direction: "desc" };
      }
      return null;
    });
  };

  const updateRecord = (record: RowpackRecord): void => {
    history.commit({
      ...data,
      records: data.records.map((item) =>
        item.id === record.id ? record : item,
      ),
    });
    setSelectedId(null);
    showToast("Record updated");
  };

  const deleteRecord = (recordId: string): void => {
    history.commit({
      ...data,
      records: data.records.filter((record) => record.id !== recordId),
    });
    setSelectedId(null);
    showToast("Record removed", "warning");
  };

  const duplicateRecord = (record: RowpackRecord): void => {
    const copy = {
      id: crypto.randomUUID(),
      values: { ...record.values },
    };
    history.commit({ ...data, records: [...data.records, copy] });
    setSelectedId(copy.id);
    showToast("Record duplicated");
  };

  const addRecord = (): void => {
    const record: RowpackRecord = {
      id: crypto.randomUUID(),
      values: Object.fromEntries(
        data.columns.map((column) => [column.id, null]),
      ),
    };
    history.commit({ ...data, records: [...data.records, record] });
    setSelectedId(record.id);
  };

  const updateRecordGroup = (
    recordId: string,
    columnId: string,
    value: string | null,
  ): void => {
    history.commit({
      ...data,
      records: data.records.map((record) =>
        record.id === recordId
          ? {
              ...record,
              values: { ...record.values, [columnId]: value },
            }
          : record,
      ),
    });
  };

  const saveHtml = async (): Promise<void> => {
    try {
      const html = serializeCurrentDocument(data);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const fileName = `${slugify(data.title)}.html`;

      if (window.showSaveFilePicker && window.self === window.top) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                accept: { "text/html": [".html"] },
                description: "Rowpack HTML app",
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          downloadBlob(blob, fileName);
        }
      } else {
        downloadBlob(blob, fileName);
      }

      const time = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date());
      setSavedAt(time);
      showToast("HTML app saved");
    } catch (error) {
      console.error(error);
      showToast("Could not save this file", "warning");
    }
  };

  const exportCsv = (): void => {
    const csv = recordsToCsv(data.columns, data.records);
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `${slugify(data.title)}.csv`,
    );
    showToast("CSV exported");
  };

  return (
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <Logo />
          <span class="brand-name">Rowpack</span>
          <span class="local-badge">
            <ShieldCheck size={13} strokeWidth={2.4} />
            Local
          </span>
        </div>
        <div class="topbar-actions">
          <span class="save-state">
            {savedAt ? `Saved ${savedAt}` : "Stored in this file"}
          </span>
          <button
            class="button button-secondary"
            onClick={exportCsv}
            type="button"
          >
            <FileDown size={16} />
            Export CSV
          </button>
          <button
            class="button button-primary"
            data-testid="save-html"
            onClick={() => void saveHtml()}
            type="button"
          >
            <Save size={16} />
            Save HTML
          </button>
        </div>
      </header>

      <main class="workspace">
        <section class="dataset-heading">
          <div class="eyebrow">
            <PackageOpen size={14} />
            Packed base
          </div>
          <h1 class="sr-only">{data.title}</h1>
          <input
            aria-label="Dataset title"
            class="title-input"
            onBlur={(event) => {
              const title = event.currentTarget.value.trim();
              if (title && title !== data.title) {
                history.commit({ ...data, title });
              }
            }}
            value={data.title}
          />
          <div class="dataset-meta">
            <span>{data.records.length.toLocaleString()} records</span>
            <i />
            <span>{data.columns.length} fields</span>
            <i />
            <span>zero network requests</span>
          </div>
        </section>

        <section class="control-deck" aria-label="Data controls">
          <div class="view-switcher" role="group" aria-label="Choose view">
            <ViewButton
              active={data.view === "grid"}
              icon={<Rows3 size={16} />}
              label="Grid"
              onClick={() => updateView("grid")}
            />
            <ViewButton
              active={data.view === "kanban"}
              icon={<Columns3 size={16} />}
              label="Kanban"
              onClick={() => updateView("kanban")}
            />
            <ViewButton
              active={data.view === "gallery"}
              icon={<GalleryHorizontalEnd size={16} />}
              label="Gallery"
              onClick={() => updateView("gallery")}
            />
          </div>

          <div class="control-spacer" />

          <label class="search-control">
            <Search size={17} />
            <input
              data-testid="search"
              onInput={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search every field…"
              ref={searchRef}
              value={query}
            />
            <kbd>⌘ K</kbd>
          </label>

          <button
            aria-label="Undo"
            class="icon-button"
            disabled={!history.canUndo}
            onClick={history.undo}
            title="Undo"
            type="button"
          >
            <Undo2 size={17} />
          </button>
          <button
            aria-label="Redo"
            class="icon-button"
            disabled={!history.canRedo}
            onClick={history.redo}
            title="Redo"
            type="button"
          >
            <Redo2 size={17} />
          </button>
          <button
            class="button button-add"
            data-testid="add-record"
            onClick={addRecord}
            type="button"
          >
            <Plus size={17} strokeWidth={2.5} />
            Add record
          </button>
        </section>

        {data.view === "kanban" && (
          <div class="subcontrol">
            <div class="subcontrol-label">
              <ListFilter size={15} />
              Group cards by
            </div>
            <label class="select-wrap">
              <select
                aria-label="Group Kanban cards by"
                onChange={(event) => updateGroupBy(event.currentTarget.value)}
                value={data.groupBy ?? data.columns[0]?.id}
              >
                {data.columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            <span class="subcontrol-hint">Drag cards between columns</span>
          </div>
        )}

        <section class="data-surface">
          {data.view === "grid" && (
            <GridView
              columns={data.columns}
              onOpen={setSelectedId}
              onSort={changeSort}
              records={visibleRecords}
              sort={sort}
            />
          )}
          {data.view === "kanban" && (
            <KanbanView
              columns={data.columns}
              groupBy={data.groupBy}
              onMove={updateRecordGroup}
              onOpen={setSelectedId}
              records={visibleRecords}
            />
          )}
          {data.view === "gallery" && (
            <GalleryView
              columns={data.columns}
              onOpen={setSelectedId}
              records={visibleRecords}
            />
          )}

          {visibleRecords.length === 0 && (
            <EmptyState hasQuery={Boolean(query)} onAdd={addRecord} />
          )}
        </section>

        <footer class="product-footer">
          <div>
            <Sparkles size={14} />A complete app inside one HTML file.
          </div>
          <a
            href="https://github.com/victus17/rowpack"
            rel="noreferrer"
            target="_blank"
          >
            Made with Rowpack
          </a>
        </footer>
      </main>

      {selectedRecord && (
        <RecordDrawer
          columns={data.columns}
          onClose={() => setSelectedId(null)}
          onDelete={() => deleteRecord(selectedRecord.id)}
          onDuplicate={() => duplicateRecord(selectedRecord)}
          onSave={updateRecord}
          record={selectedRecord}
        />
      )}

      {toast && <Toast key={toast.id} toast={toast} />}
    </div>
  );
}

function Logo() {
  return (
    <div class="logo" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

function ViewButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: preact.ComponentChildren;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      class={active ? "view-button active" : "view-button"}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function GridView({
  columns,
  onOpen,
  onSort,
  records,
  sort,
}: {
  columns: RowpackColumn[];
  onOpen: (id: string) => void;
  onSort: (columnId: string) => void;
  records: RowpackRecord[];
  sort: SortState | null;
}) {
  if (records.length === 0) {
    return null;
  }

  return (
    <div class="table-scroll">
      <table class="data-grid">
        <thead>
          <tr>
            <th class="row-number">#</th>
            {columns.map((column) => (
              <th key={column.id}>
                <button
                  class="sort-button"
                  onClick={() => onSort(column.id)}
                  type="button"
                >
                  <FieldIcon kind={column.kind} />
                  <span>{column.label}</span>
                  {sort?.columnId === column.id &&
                    (sort.direction === "asc" ? (
                      <ArrowUp size={13} />
                    ) : (
                      <ArrowDown size={13} />
                    ))}
                </button>
              </th>
            ))}
            <th class="edit-heading">
              <span class="sr-only">Actions</span>
              <PencilLine size={14} />
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => (
            <tr
              data-testid="grid-row"
              key={record.id}
              onClick={() => onOpen(record.id)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onOpen(record.id);
                }
              }}
            >
              <td class="row-number">{index + 1}</td>
              {columns.map((column) => (
                <td key={column.id}>
                  <Cell column={column} value={record.values[column.id]} />
                </td>
              ))}
              <td class="edit-cell">
                <PencilLine size={14} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KanbanView({
  columns,
  groupBy,
  onMove,
  onOpen,
  records,
}: {
  columns: RowpackColumn[];
  groupBy?: string;
  onMove: (recordId: string, columnId: string, value: string | null) => void;
  onOpen: (id: string) => void;
  records: RowpackRecord[];
}) {
  if (records.length === 0) {
    return null;
  }

  const groupColumn =
    columns.find((column) => column.id === groupBy) ?? columns[0];
  if (!groupColumn) {
    return null;
  }

  const uniqueValues = Array.from(
    new Set(
      records
        .map((record) => record.values[groupColumn.id])
        .filter(
          (value): value is string | number | boolean =>
            value !== null && value !== undefined && String(value) !== "",
        )
        .map(String),
    ),
  );
  const preferred = groupColumn.options ?? [];
  const groupValues = Array.from(new Set([...preferred, ...uniqueValues]));
  const groups: Array<{ label: string; value: string | null }> = [
    ...groupValues.map((value) => ({ label: value, value })),
    { label: "Unassigned", value: null },
  ];

  return (
    <div class="kanban" data-testid="kanban">
      {groups.map((group, groupIndex) => {
        const groupRecords = records.filter((record) => {
          const value = record.values[groupColumn.id];
          return group.value === null
            ? value === null || value === undefined || String(value) === ""
            : String(value) === group.value;
        });

        if (group.value === null && groupRecords.length === 0) {
          return null;
        }

        return (
          <section
            class="kanban-column"
            key={group.label}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const recordId = event.dataTransfer?.getData(
                "application/x-rowpack-record",
              );
              if (recordId) {
                onMove(recordId, groupColumn.id, group.value);
              }
            }}
          >
            <header>
              <div>
                <span
                  class={`group-dot group-dot-${String((groupIndex % 5) + 1)}`}
                />
                <h2>{group.label}</h2>
              </div>
              <span>{groupRecords.length}</span>
            </header>
            <div class="kanban-cards">
              {groupRecords.map((record) => (
                <KanbanCard
                  columns={columns}
                  key={record.id}
                  onOpen={() => onOpen(record.id)}
                  record={record}
                />
              ))}
              <div class="drop-hint">Drop here</div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function KanbanCard({
  columns,
  onOpen,
  record,
}: {
  columns: RowpackColumn[];
  onOpen: () => void;
  record: RowpackRecord;
}) {
  const titleColumn =
    columns.find((column) => column.kind === "text") ?? columns[0];
  const detailColumns = columns
    .filter((column) => column.id !== titleColumn?.id)
    .filter(
      (column) =>
        record.values[column.id] !== null &&
        record.values[column.id] !== undefined,
    )
    .slice(0, 3);

  return (
    <article
      class="kanban-card"
      data-testid="kanban-card"
      draggable
      onClick={onOpen}
      onDragStart={(event) => {
        event.dataTransfer?.setData("application/x-rowpack-record", record.id);
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
        }
      }}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onOpen();
        }
      }}
    >
      <div class="card-drag">
        <GripVertical size={14} />
      </div>
      <h3>{String(record.values[titleColumn?.id ?? ""] ?? "Untitled")}</h3>
      <div class="card-fields">
        {detailColumns.map((column) => (
          <div key={column.id}>
            <span>{column.label}</span>
            <Cell column={column} value={record.values[column.id]} compact />
          </div>
        ))}
      </div>
    </article>
  );
}

function GalleryView({
  columns,
  onOpen,
  records,
}: {
  columns: RowpackColumn[];
  onOpen: (id: string) => void;
  records: RowpackRecord[];
}) {
  if (records.length === 0) {
    return null;
  }

  const titleColumn =
    columns.find((column) => column.kind === "text") ?? columns[0];

  return (
    <div class="gallery" data-testid="gallery">
      {records.map((record, index) => (
        <article
          class="gallery-card"
          data-testid="gallery-card"
          key={record.id}
          onClick={() => onOpen(record.id)}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onOpen(record.id);
            }
          }}
        >
          <div class={`gallery-art gallery-art-${String((index % 5) + 1)}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <LayoutGrid size={24} />
          </div>
          <div class="gallery-body">
            <h2>
              {String(record.values[titleColumn?.id ?? ""] ?? "Untitled")}
            </h2>
            <dl>
              {columns
                .filter((column) => column.id !== titleColumn?.id)
                .slice(0, 4)
                .map((column) => (
                  <div key={column.id}>
                    <dt>{column.label}</dt>
                    <dd>
                      <Cell
                        column={column}
                        compact
                        value={record.values[column.id]}
                      />
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        </article>
      ))}
    </div>
  );
}

function FieldIcon({ kind }: { kind: RowpackColumn["kind"] }) {
  if (kind === "number") {
    return <span class="field-symbol">#</span>;
  }
  if (kind === "boolean") {
    return <Check size={13} />;
  }
  if (kind === "date") {
    return <span class="field-symbol">◷</span>;
  }
  if (kind === "singleSelect") {
    return <Circle size={10} fill="currentColor" />;
  }
  if (kind === "url" || kind === "email") {
    return <span class="field-symbol">↗</span>;
  }
  return <span class="field-symbol">A</span>;
}

function Cell({
  column,
  compact = false,
  value,
}: {
  column: RowpackColumn;
  compact?: boolean;
  value: CellValue | undefined;
}) {
  if (value === null || value === undefined || value === "") {
    return <span class="empty-cell">—</span>;
  }

  if (column.kind === "boolean") {
    return (
      <span class={value ? "boolean-cell true" : "boolean-cell"}>
        {value ? <Check size={13} /> : <X size={12} />}
        {!compact && (value ? "Yes" : "No")}
      </span>
    );
  }

  if (column.kind === "singleSelect") {
    const colorIndex =
      (Math.abs(
        String(value)
          .split("")
          .reduce((total, character) => total + character.charCodeAt(0), 0),
      ) %
        5) +
      1;
    return (
      <span class={`pill pill-${String(colorIndex)}`}>
        <i />
        {String(value)}
      </span>
    );
  }

  if (column.kind === "url") {
    const href = String(value);
    const safe = /^https?:\/\//i.test(href);
    return safe ? (
      <a
        class="link-cell"
        href={href}
        onClick={(event) => event.stopPropagation()}
        rel="noreferrer"
        target="_blank"
      >
        {compact ? "Open" : href.replace(/^https?:\/\//, "")}
      </a>
    ) : (
      <span>{href}</span>
    );
  }

  if (column.kind === "email") {
    return (
      <a
        class="link-cell"
        href={`mailto:${String(value)}`}
        onClick={(event) => event.stopPropagation()}
      >
        {String(value)}
      </a>
    );
  }

  if (column.kind === "number") {
    return (
      <span class="number-cell">
        {Number(value).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        })}
      </span>
    );
  }

  if (column.kind === "date") {
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return (
      <span class="date-cell">
        {Number.isNaN(date.valueOf())
          ? String(value)
          : new Intl.DateTimeFormat(undefined, {
              day: "numeric",
              month: "short",
              year: compact ? undefined : "numeric",
            }).format(date)}
      </span>
    );
  }

  return <span class="text-cell">{String(value)}</span>;
}

function RecordDrawer({
  columns,
  onClose,
  onDelete,
  onDuplicate,
  onSave,
  record,
}: {
  columns: RowpackColumn[];
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSave: (record: RowpackRecord) => void;
  record: RowpackRecord;
}) {
  const [draft, setDraft] = useState<RowpackRecord>(() =>
    structuredClone(record),
  );
  const titleColumn =
    columns.find((column) => column.kind === "text") ?? columns[0];

  return (
    <div class="drawer-layer" data-testid="record-drawer">
      <button
        aria-label="Close record"
        class="drawer-scrim"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby="drawer-title"
        aria-modal="true"
        class="drawer"
        role="dialog"
      >
        <header class="drawer-header">
          <div class="drawer-kicker">Record details</div>
          <button
            aria-label="Close"
            class="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={19} />
          </button>
          <h2 id="drawer-title">
            {String(draft.values[titleColumn?.id ?? ""] ?? "New record")}
          </h2>
          <p>Edit locally. Nothing leaves this file.</p>
        </header>
        <div class="drawer-fields">
          {columns.map((column) => (
            <FieldEditor
              column={column}
              key={column.id}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  values: { ...current.values, [column.id]: value },
                }))
              }
              value={draft.values[column.id]}
            />
          ))}
        </div>
        <footer class="drawer-footer">
          <div class="record-actions">
            <button
              class="icon-button danger"
              onClick={onDelete}
              title="Delete record"
              type="button"
            >
              <Trash2 size={17} />
            </button>
            <button
              class="button button-secondary"
              onClick={onDuplicate}
              type="button"
            >
              <Archive size={16} />
              Duplicate
            </button>
          </div>
          <button
            class="button button-primary"
            data-testid="save-record"
            onClick={() => onSave(draft)}
            type="button"
          >
            <Check size={17} />
            Save changes
          </button>
        </footer>
      </aside>
    </div>
  );
}

function FieldEditor({
  column,
  onChange,
  value,
}: {
  column: RowpackColumn;
  onChange: (value: CellValue) => void;
  value: CellValue | undefined;
}) {
  const stringValue =
    value === null || value === undefined ? "" : String(value);

  if (column.kind === "boolean") {
    return (
      <label class="field-row field-checkbox">
        <span>
          {column.label}
          <small>Boolean</small>
        </span>
        <input
          checked={Boolean(value)}
          onChange={(event) => onChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <i aria-hidden="true" />
      </label>
    );
  }

  if (column.kind === "singleSelect") {
    const options = Array.from(
      new Set([
        ...(column.options ?? []),
        ...(stringValue ? [stringValue] : []),
      ]),
    );
    return (
      <label class="field-row">
        <span>
          {column.label}
          <small>Single select</small>
        </span>
        <div class="editor-select">
          <select
            onChange={(event) => onChange(event.currentTarget.value || null)}
            value={stringValue}
          >
            <option value="">Unassigned</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </div>
      </label>
    );
  }

  if (column.kind === "text") {
    return (
      <label class="field-row">
        <span>
          {column.label}
          <small>Text</small>
        </span>
        <textarea
          onInput={(event) => onChange(event.currentTarget.value || null)}
          rows={stringValue.length > 50 ? 4 : 2}
          value={stringValue}
        />
      </label>
    );
  }

  return (
    <label class="field-row">
      <span>
        {column.label}
        <small>{column.kind}</small>
      </span>
      <input
        inputMode={column.kind === "number" ? "decimal" : undefined}
        onInput={(event) => {
          const nextValue = event.currentTarget.value;
          onChange(
            nextValue === ""
              ? null
              : column.kind === "number"
                ? Number(nextValue)
                : nextValue,
          );
        }}
        type={
          column.kind === "date"
            ? "date"
            : column.kind === "email"
              ? "email"
              : column.kind === "url"
                ? "url"
                : "text"
        }
        value={stringValue}
      />
    </label>
  );
}

function EmptyState({
  hasQuery,
  onAdd,
}: {
  hasQuery: boolean;
  onAdd: () => void;
}) {
  return (
    <div class="empty-state" data-testid="empty-state">
      <div>{hasQuery ? <Search size={25} /> : <PackageOpen size={25} />}</div>
      <h2>{hasQuery ? "No matching records" : "This base is empty"}</h2>
      <p>
        {hasQuery
          ? "Try another phrase or clear your search."
          : "Add the first record. It stays entirely inside this file."}
      </p>
      {!hasQuery && (
        <button class="button button-primary" onClick={onAdd} type="button">
          <Plus size={16} />
          Add record
        </button>
      )}
    </div>
  );
}

function Toast({ toast }: { toast: ToastMessage }) {
  return (
    <div
      aria-live="polite"
      class={`toast toast-${toast.kind}`}
      data-rowpack-transient
      role="status"
    >
      <span>
        {toast.kind === "success" ? (
          <Check size={16} />
        ) : (
          <Download size={16} />
        )}
      </span>
      {toast.message}
    </div>
  );
}
