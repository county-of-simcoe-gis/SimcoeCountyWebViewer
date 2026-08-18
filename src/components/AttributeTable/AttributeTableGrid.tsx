"use client";

/**
 * AttributeTableGrid
 * ----------------------------------------------------------------------------
 * Row-virtualized data grid built on TanStack Table (headless) + TanStack
 * Virtual. Reads directly from the tab's ColumnarStore via `getCell` so the
 * browser never builds a full JS-object array for the rendered rows.
 *
 * Performance:
 *  - Only ~30 rows in the DOM regardless of dataset size.
 *  - Selection is a `Set<fid>` on the store; row highlight is read via
 *    `selection.has(fid)` — no per-row React state.
 *  - Column defs are memoized against the tab's schema reference.
 *  - Filter inputs are debounced (250 ms) before dispatching a server reload.
 *  - Sort toggles a `SortSpec` on the store; the loader hook re-fetches with
 *    `sortBy=<field> A|D` and resets the store.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FaSortUp, FaSortDown, FaSort, FaSearchPlus, FaTimes, FaPaperclip } from "react-icons/fa";
import { useAttributeTableStore, type AttributeTableTab } from "@/stores/attributeTableStore";
import type { ColumnType } from "@/lib/attributeTable/columnarStore";
import { formatFieldValue, formatFieldName, formatFieldValueAsText } from "@/utils/identifyHelpers";
import { isExcludedKey } from "@/utils/identifyHelpers";
import { syncHighlight, zoomToFeature, setHoverFeature, clearHover } from "@/lib/attributeTable/mapIntegration";
import AttributeTableAttachmentsDialog from "./AttributeTableAttachmentsDialog";

interface Props {
  tab: AttributeTableTab;
  onLoadMore: () => void;
}

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 64; // includes filter row

/**
 * Row model is just an index. We never materialize per-row objects — the
 * grid cells read from the columnar store directly via `getCell`.
 */
interface RowRef {
  readonly index: number;
}

export default memo(function AttributeTableGrid({ tab, onLoadMore }: Props) {
  const toggleSelection = useAttributeTableStore((s) => s.toggleSelection);
  const setSelection = useAttributeTableStore((s) => s.setSelection);
  const clearSelection = useAttributeTableStore((s) => s.clearSelection);
  const setSort = useAttributeTableStore((s) => s.setSort);
  const setFilter = useAttributeTableStore((s) => s.setFilter);

  const parentRef = useRef<HTMLDivElement | null>(null);

  // --- Attachments dialog --------------------------------------------------
  const [attachmentFid, setAttachmentFid] = useState<string | null>(null);
  const attachmentUrl = useMemo(() => {
    if (!attachmentFid || !tab.attachmentUrlTemplate) return null;
    return tab.attachmentUrlTemplate.replace("#OBJECTID#", attachmentFid);
  }, [attachmentFid, tab.attachmentUrlTemplate]);

  // --- Debounced filter inputs (keyed by field) ---------------------------
  const [filterDrafts, setFilterDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    setFilterDrafts(tab.filters);
  }, [tab.layerId, tab.filters]);

  useEffect(() => {
    const id = setTimeout(() => {
      for (const [field, value] of Object.entries(filterDrafts)) {
        if ((tab.filters[field] ?? "") !== value) setFilter(tab.layerId, field, value);
      }
      // Clear removed drafts
      for (const field of Object.keys(tab.filters)) {
        if (!(field in filterDrafts)) setFilter(tab.layerId, field, "");
      }
    }, 250);
    return () => clearTimeout(id);
  }, [filterDrafts, tab.layerId, tab.filters, setFilter]);

  // --- Column definitions --------------------------------------------------

  const columns = useMemo<ColumnDef<RowRef>[]>(() => {
    if (!tab.schema || !tab.store) return [];
    const out: ColumnDef<RowRef>[] = [
      {
        id: "__select__",
        header: () => {
          const loaded = tab.store?.fids.length ?? 0;
          const selCount = tab.selection.size;
          const allSelected = loaded > 0 && selCount >= loaded;
          const someSelected = selCount > 0 && !allSelected;
          return (
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                if (allSelected || someSelected) {
                  clearSelection(tab.layerId);
                } else if (tab.store) {
                  setSelection(tab.layerId, tab.store.fids.slice());
                }
              }}
              aria-label={allSelected ? "Deselect all" : "Select all loaded rows"}
              title={allSelected || someSelected ? "Clear selection" : "Select all loaded rows"}
              disabled={loaded === 0}
            />
          );
        },
        size: 36,
        cell: ({ row }) => {
          const fid = tab.store!.fids[row.original.index];
          const checked = tab.selection.has(fid);
          return (
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={checked}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelection(tab.layerId, fid, true);
              }}
              aria-label={`Select row ${fid}`}
            />
          );
        },
      },
      {
        id: "__actions__",
        header: () => null,
        size: tab.hasAttachments ? 76 : 44,
        cell: ({ row }) => {
          const fid = tab.store!.fids[row.original.index];
          return (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="btn btn-xs btn-square btn-primary btn-outline"
                title="Zoom to feature"
                aria-label="Zoom to feature"
                onClick={(e) => {
                  e.stopPropagation();
                  void zoomToFeature(tab.wfsUrl, tab.typeName, tab.layerId, fid, tab.secured);
                }}
              >
                <FaSearchPlus size={12} />
              </button>
              {tab.hasAttachments ? (
                <button
                  type="button"
                  className="btn btn-xs btn-square btn-ghost"
                  title="View attachments"
                  aria-label="View attachments"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttachmentFid(fid);
                  }}
                >
                  <FaPaperclip size={12} />
                </button>
              ) : null}
            </div>
          );
        },
      },
    ];

    for (const col of tab.schema) {
      // Skip system/internal fields like objectid, geometry, shape_area, etc.
      if (isExcludedKey(col.name)) continue;

      out.push({
        id: col.name,
        header: formatFieldName(col.name),
        size: 160,
        cell: ({ row }) => {
          const v = tab.store!.getCell(row.original.index, col.name);
          const formattedValue = formatFieldValue(col.name, v, col.type);
          if (formattedValue === null) return <span className="opacity-40">—</span>;
          return <span>{formattedValue}</span>;
        },
      });
    }
    return out;
  }, [tab.schema, tab.store, tab.selection, tab.layerId, tab.wfsUrl, tab.typeName, tab.secured, tab.hasAttachments, toggleSelection, setSelection, clearSelection]);

  // --- Stable row refs (one object per loaded row, reused across renders) --

  // Build an array of active column filters for the client-side pass.
  const activeFilters = useMemo(() => {
    const entries: Array<{ field: string; normalized: string }> = [];
    for (const [field, value] of Object.entries(tab.filters)) {
      if (!value) continue;
      entries.push({ field, normalized: value.toLowerCase() });
    }
    return entries;
  }, [tab.filters]);

  // Lookup of column name -> declared type, so filter matching can format
  // cells the same way (and via the same code path) as the on-screen cells.
  const schemaTypeByField = useMemo(() => {
    const m = new Map<string, ColumnType>();
    if (tab.schema) for (const c of tab.schema) m.set(c.name, c.type);
    return m;
  }, [tab.schema]);

  const rows = useMemo<RowRef[]>(() => {
    // An array of `{ index }` is cheap (~40 bytes/row) and allows us to use
    // TanStack Table without materializing row objects.
    const out: RowRef[] = [];
    const store = tab.store;
    if (!store) return out;
    for (let i = 0; i < tab.loadedCount; i++) {
      // Selection-only filter
      if (tab.selectionOnly && !tab.selection.has(store.fids[i])) continue;
      // Client-side text/number column filters: match against formatted display values
      if (activeFilters.length > 0) {
        let match = true;
        for (const f of activeFilters) {
          const cell = store.getCell(i, f.field);
          // Format the cell value the same way it displays, then filter
          const displayed = formatFieldValueAsText(f.field, cell, schemaTypeByField.get(f.field)).toLowerCase();
          if (!displayed.includes(f.normalized)) {
            match = false;
            break;
          }
        }
        if (!match) continue;
      }
      out.push({ index: i });
    }
    return out;
  }, [tab.loadedCount, tab.selectionOnly, tab.selection, tab.store, activeFilters, schemaTypeByField]);

  const table = useReactTable<RowRef>({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (r) => String(r.index),
  });

  // --- Virtualization ------------------------------------------------------

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // Infinite-scroll: fetch more when within 20 rows of the end.
  useEffect(() => {
    const items = virtualizer.getVirtualItems();
    if (items.length === 0) return;
    const last = items[items.length - 1];
    if (last.index >= rows.length - 20) {
      onLoadMore();
    }
  }, [virtualizer, rows.length, onLoadMore]);

  // --- Selection → map highlight sync -------------------------------------

  useEffect(() => {
    if (!tab.wfsUrl) return;
    const ctrl = new AbortController();
    void syncHighlight({
      layerId: tab.layerId,
      wfsUrl: tab.wfsUrl,
      typeName: tab.typeName,
      fids: Array.from(tab.selection),
      secured: tab.secured,
      signal: ctrl.signal,
    });
    return () => ctrl.abort();
  }, [tab.selection, tab.layerId, tab.wfsUrl, tab.typeName]);

  // Clear hover highlight when the grid unmounts (tab close / minimize).
  useEffect(() => {
    return () => clearHover(tab.layerId);
  }, [tab.layerId]);

  // --- Sort handler --------------------------------------------------------

  const onHeaderClick = useCallback(
    (field: string) => {
      const s = tab.sort;
      let next: { field: string; direction: "A" | "D" } | null;
      if (!s || s.field !== field) next = { field, direction: "A" };
      else if (s.direction === "A") next = { field, direction: "D" };
      else next = null;
      setSort(tab.layerId, next);
    },
    [tab.sort, tab.layerId, setSort],
  );

  // --- Render --------------------------------------------------------------

  if (!tab.schema || !tab.store) {
    return (
      <div className="flex items-center justify-center h-full text-sm opacity-60">
        {tab.loading ? (
          <span className="flex items-center gap-2">
            <span className="loading loading-spinner loading-md" />
            Loading attribute data…
          </span>
        ) : tab.error ? (
          <span className="text-error">{tab.error}</span>
        ) : (
          "No data"
        )}
      </div>
    );
  }

  const totalWidth = table.getTotalSize();
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="relative w-full h-full overflow-auto bg-base-100" style={{ contain: "strict" }}>
      <AttributeTableAttachmentsDialog
        isOpen={attachmentFid !== null}
        onClose={() => setAttachmentFid(null)}
        title={attachmentFid ? `${tab.layerName} · ${attachmentFid}` : tab.layerName}
        attachmentUrl={attachmentUrl}
      />
      <div style={{ width: totalWidth, minWidth: "100%" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300" style={{ height: HEADER_HEIGHT }}>
          <div className="flex" style={{ width: totalWidth }}>
            {table.getHeaderGroups()[0].headers.map((header) => {
              const col = header.column.columnDef;
              const sortable = col.id !== "__select__" && col.id !== "__actions__";
              const active = tab.sort?.field === col.id;
              const arrow = !sortable ? null : !active ? <FaSort size={10} className="opacity-40" /> : tab.sort!.direction === "A" ? <FaSortUp size={10} /> : <FaSortDown size={10} />;
              return (
                <div key={header.id} className="border-r border-base-300 flex flex-col" style={{ width: col.size ?? 160, minWidth: col.size ?? 160 }}>
                  {sortable ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 px-2 py-1 text-left font-semibold text-xs truncate hover:bg-base-300 cursor-pointer"
                      onClick={() => onHeaderClick(col.id as string)}
                      title={String(col.id)}
                    >
                      <span className="truncate flex-1">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      {arrow}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center px-0 py-1 text-xs" style={{ height: 32 }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  )}
                  {sortable ? (
                    <div className="px-1 pb-1">
                      <input
                        type="text"
                        className="input input-xs input-bordered w-full"
                        placeholder="Filter…"
                        value={filterDrafts[col.id as string] ?? ""}
                        onChange={(e) => setFilterDrafts((d) => ({ ...d, [col.id as string]: e.target.value }))}
                      />
                    </div>
                  ) : (
                    <div className="px-1 pb-1 h-[24px]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Virtualized rows */}
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualItems.map((vRow) => {
            const r = table.getRowModel().rows[vRow.index];
            if (!r) return null;
            const fid = tab.store!.fids[r.original.index];
            const selected = tab.selection.has(fid);
            return (
              <div
                key={r.id}
                data-index={vRow.index}
                className={`flex border-b border-base-200 text-xs ${selected ? "bg-warning/20" : "hover:bg-base-200"}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: totalWidth,
                  height: ROW_HEIGHT,
                  transform: `translateY(${vRow.start}px)`,
                }}
                onMouseEnter={() => {
                  setHoverFeature({
                    layerId: tab.layerId,
                    fid,
                    wfsUrl: tab.wfsUrl,
                    typeName: tab.typeName,
                    secured: tab.secured,
                  });
                }}
                onMouseLeave={() => clearHover(tab.layerId)}
                onClick={(e) => {
                  // Row click toggles selection only; use the zoom icon to
                  // pan/zoom the map to a specific feature.
                  const additive = e.shiftKey || e.ctrlKey || e.metaKey;
                  toggleSelection(tab.layerId, fid, additive);
                }}
              >
                {r.getVisibleCells().map((cell) => {
                  const isUtil = cell.column.id === "__select__" || cell.column.id === "__actions__";
                  return (
                    <div
                      key={cell.id}
                      className={`${isUtil ? "px-0 justify-center" : "px-2"} py-1 border-r border-base-200 truncate flex items-center [&_a]:text-primary [&_a]:no-underline [&_a:hover]:text-primary/80 [&_a:hover]:underline`}
                      style={{ width: cell.column.columnDef.size ?? 160, minWidth: cell.column.columnDef.size ?? 160 }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {tab.loading ? (
        <div className="absolute top-2 right-2 flex items-center gap-2 bg-base-100 shadow px-2 py-1 rounded text-xs">
          <span className="loading loading-spinner loading-xs" />
          Loading…
        </div>
      ) : null}
      {tab.error ? (
        <div className="absolute bottom-2 right-2 alert alert-error text-xs py-2 px-3 max-w-[50%]">
          <FaTimes /> <span className="truncate">{tab.error}</span>
        </div>
      ) : null}
    </div>
  );
});
