"use client";

/**
 * AttributeTablePanel
 * ----------------------------------------------------------------------------
 * Bottom-docked, vertically-resizable panel that hosts the attribute-table
 * tabs and grid. Mounted once at the root by Layout.tsx; renders null when
 * no tabs are open.
 *
 * Resize is done with pointer events directly on a 6 px drag handle — no
 * extra dependency. Height is persisted to localStorage by the store.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaTimes, FaTrash, FaDownload, FaMapMarkedAlt, FaFilter, FaWindowMinimize, FaChevronUp, FaEllipsisV, FaMapMarkerAlt, FaExchangeAlt, FaSearchPlus, FaMousePointer } from "react-icons/fa";
import { ATTRIBUTE_TABLE_DEFAULTS, selectActiveTab, useAttributeTableStore } from "@/stores/attributeTableStore";
import { useAttributeTableLoader } from "@/hooks/useAttributeTableLoader";
import { isWorkerSupported, workerExportCsv } from "@/lib/attributeTable/workerClient";
import { getCachedFeatures, zoomToFeatures, clearHighlightsForLayer } from "@/lib/attributeTable/mapIntegration";
import { useMyMapsStore, createMyMapsItem } from "@/stores/myMapsStore";
import { useToastStore } from "@/hooks/useToast";
import { useEventStore } from "@/stores/eventStore";
import { activateTab } from "@/utils/helpersUI";
import { createDefaultDrawStyle, featureToGeoJSON, styleToJSON } from "@/utils/myMapsHelpers";
import { formatFieldValueAsText } from "@/utils/identifyHelpers";
import AttributeTableTabs from "./AttributeTableTabs";
import AttributeTableGrid from "./AttributeTableGrid";
import AttributeTableMapSelect from "./AttributeTableMapSelect";

/**
 * Track the map element's on-screen rect so the panel can sit flush under
 * the map and not overlap the sidebar. Uses ResizeObserver for width changes
 * (sidebar open/close animates) and window resize for viewport changes.
 */
function useMapRect(isOpen: boolean): { left: number; width: number } {
  const [rect, setRect] = useState<{ left: number; width: number }>(() => ({ left: 0, width: typeof window !== "undefined" ? window.innerWidth : 0 }));

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    const update = () => {
      const r = mapEl.getBoundingClientRect();
      setRect({ left: Math.round(r.left), width: Math.round(r.width) });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(mapEl);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  return rect;
}

function useVerticalResize(onChange: (h: number) => void, currentHeight: number) {
  const dragState = useRef<{ startY: number; startH: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragState.current = { startY: e.clientY, startH: currentHeight };
    },
    [currentHeight],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      const delta = dragState.current.startY - e.clientY; // dragging up increases height
      const maxH = typeof window !== "undefined" ? Math.floor(window.innerHeight * ATTRIBUTE_TABLE_DEFAULTS.maxHeightRatio) : 800;
      const next = Math.min(maxH, Math.max(ATTRIBUTE_TABLE_DEFAULTS.minHeight, dragState.current.startH + delta));
      onChange(next);
    },
    [onChange],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragState.current = null;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}

export default function AttributeTablePanel(): React.ReactElement | null {
  const isOpen = useAttributeTableStore((s) => s.isOpen);
  const minimized = useAttributeTableStore((s) => s.minimized);
  const toggleMinimized = useAttributeTableStore((s) => s.toggleMinimized);
  const tabCount = useAttributeTableStore((s) => s.tabs.length);
  const height = useAttributeTableStore((s) => s.height);
  const setHeight = useAttributeTableStore((s) => s.setHeight);
  const active = useAttributeTableStore(selectActiveTab);
  const closeAll = useAttributeTableStore((s) => s.closeAll);
  const clearSelection = useAttributeTableStore((s) => s.clearSelection);
  const clearFilters = useAttributeTableStore((s) => s.clearFilters);
  const setBboxFilterActive = useAttributeTableStore((s) => s.setBboxFilterActive);
  const invertSelection = useAttributeTableStore((s) => s.invertSelection);
  const setSelectionOnly = useAttributeTableStore((s) => s.setSelectionOnly);
  const setMapSelectActive = useAttributeTableStore((s) => s.setMapSelectActive);

  const { loadMore } = useAttributeTableLoader();

  // Track open tab IDs so we can clear map highlights when a tab is removed.
  // Join to a primitive string so Zustand's default === comparison stays stable.
  const tabLayerIdsKey = useAttributeTableStore((s) => s.tabs.map((t) => t.layerId).join("|"));
  const prevTabIdsRef = useRef<Set<string>>(new Set(tabLayerIdsKey ? tabLayerIdsKey.split("|") : []));
  useEffect(() => {
    const current = new Set(tabLayerIdsKey ? tabLayerIdsKey.split("|") : []);
    for (const id of prevTabIdsRef.current) {
      if (!current.has(id)) clearHighlightsForLayer(id);
    }
    prevTabIdsRef.current = current;
  }, [tabLayerIdsKey]);

  const resize = useVerticalResize(setHeight, height);

  const [exporting, setExporting] = React.useState(false);
  const actionsMenuRef = useRef<HTMLDetailsElement | null>(null);

  // Close the actions dropdown whenever the active tab changes — its
  // enabled/disabled state and selection count are tab-specific, so leaving
  // it open against stale data would be confusing.
  useEffect(() => {
    actionsMenuRef.current?.removeAttribute("open");
  }, [active?.layerId]);

  const mapRect = useMapRect(isOpen);

  // Keyboard: Escape closes the panel.
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [isOpen, closeAll]);

  if (!isOpen || !active) return null;

  if (minimized) {
    return (
      <div
        className="fixed bottom-0 z-[500] bg-base-200 border-t border-base-300 shadow-[0_-2px_8px_rgba(0,0,0,0.12)] flex items-center justify-between gap-2 px-3 py-1 text-xs print:hidden"
        style={{ left: mapRect.left, width: mapRect.width, height: 32 }}
        role="region"
        aria-label="Attribute Table (minimized)"
      >
        <button type="button" className="btn btn-xs btn-ghost flex-1 justify-start" onClick={() => toggleMinimized()} title="Restore attribute table" aria-label="Restore attribute table">
          <FaChevronUp size={10} />
          <span className="truncate font-semibold">Attribute Table</span>
          <span className="opacity-60 truncate">— {active.layerName}</span>
          {tabCount > 1 ? <span className="badge badge-xs badge-neutral ml-1">{tabCount} tabs</span> : null}
        </button>
        <button type="button" className="btn btn-xs btn-ghost btn-square" onClick={closeAll} title="Close attribute table" aria-label="Close attribute table">
          <FaTimes size={10} />
        </button>
      </div>
    );
  }

  const onExportCsv = async () => {
    if (!active.schema || !active.store || exporting) return;
    if (active.selection.size === 0) return;
    setExporting(true);
    try {
      const store = active.store;
      const columns = active.schema.map((c) => c.name);
      // Build the list of row indices matching the current selection, in
      // on-screen order (store.fids order).
      const selectedRows: number[] = [];
      const fids = store.fids;
      for (let i = 0; i < fids.length; i++) {
        if (active.selection.has(fids[i])) selectedRows.push(i);
      }

      // Materialize rows as a 2D array of primitive values. This is the only
      // place we pay a per-row allocation cost; the worker then handles the
      // CPU-heavy stringify/escape/join off the main thread.
      const rows: Array<Array<string | number | boolean | null>> = new Array(selectedRows.length);
      for (let i = 0; i < selectedRows.length; i++) {
        const srcRow = selectedRows[i];
        const r: Array<string | number | boolean | null> = new Array(columns.length);
        for (let c = 0; c < columns.length; c++) {
          const v = store.getCell(srcRow, columns[c]);
          // Format each cell the same way it displays on-screen (dates,
          // booleans, etc.) so the CSV matches the grid; keep null/undefined
          // as an empty cell rather than the formatter's "N/A" placeholder.
          const col = active.schema![c];
          r[c] = v === null || v === undefined ? "" : formatFieldValueAsText(col.name, v, col.type);
        }
        rows[i] = r;
      }

      let blob: Blob;
      if (isWorkerSupported()) {
        blob = await workerExportCsv(columns, rows);
      } else {
        // Fallback: build on main thread (test envs, SSR).
        const escape = (v: string | number | boolean | null) => {
          if (v === null || v === undefined) return "";
          const s = String(v);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const parts = [columns.map(escape).join(",")];
        for (const r of rows) parts.push(r.map(escape).join(","));
        blob = new Blob([parts.join("\n")], { type: "text/csv;charset=utf-8" });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${active.layerName.replace(/[^a-z0-9_\-]+/gi, "_")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const onAddSelectionToMyMaps = async () => {
    if (!active.store || active.selection.size === 0) return;
    try {
      const fids = Array.from(active.selection);
      const feats = await getCachedFeatures({
        layerId: active.layerId,
        wfsUrl: active.wfsUrl,
        typeName: active.typeName,
        fids,
        secured: active.secured,
      });
      if (feats.length === 0) {
        useToastStore.getState().addToast("No geometries available for the selected rows.", "warning");
        return;
      }

      const addItem = useMyMapsStore.getState().addItem;
      const drawColor = useMyMapsStore.getState().drawColor;
      const safeName = active.layerName.replace(/[^a-z0-9_\-\s]+/gi, "").trim();
      // Pick the first non-utility column as the "label column". The schema
      // already excludes geometry fields, so the first entry is the natural
      // human-readable attribute for most layers.
      const labelColumn = active.schema?.[0]?.name ?? null;
      const store = active.store;
      let added = 0;
      for (let i = 0; i < feats.length; i++) {
        const f = feats[i];
        const geomType = f.getGeometry()?.getType();
        if (!geomType) continue;
        // Pick a drawType that roughly matches the geometry so MyMaps styles
        // it sensibly. Point/Line/Polygon cover the WFS/ArcGIS common cases;
        // everything else falls back to Polygon (MyMaps treats buffer-like
        // geometries that way).
        const drawType = geomType === "Point" || geomType === "MultiPoint" ? "Point" : geomType === "LineString" || geomType === "MultiLineString" ? "LineString" : "Polygon";

        // Label resolution order:
        //   1. Value of the first schema column for this feature (if non-empty)
        //   2. The feature's short fid
        //   3. Fallback: `${layerName} ${i+1}` (matches old behaviour)
        // The OL feature id is the compound `${layerId}::${fid}`; strip the
        // prefix to get back the raw fid, then look up its row in the store.
        const compoundFid = String(f.getId() ?? "");
        const shortFid = compoundFid.startsWith(`${active.layerId}::`) ? compoundFid.slice(active.layerId.length + 2) : compoundFid;
        let label: string | undefined;
        if (labelColumn && shortFid) {
          const rowIdx = store.fids.indexOf(shortFid);
          if (rowIdx !== -1) {
            const v = store.getCell(rowIdx, labelColumn);
            if (v !== null && v !== undefined && String(v).trim() !== "") label = String(v);
          }
        }
        if (!label) label = shortFid || `${safeName} ${i + 1}`;

        // Give the feature a visible default MyMaps style. Without this the
        // item is created with an empty style object and renders invisibly.
        const defaultStyle = styleToJSON(createDefaultDrawStyle({ drawColor, geometryType: drawType === "Point" ? "Point" : drawType === "LineString" ? "LineString" : "Polygon" }));

        const item = createMyMapsItem(f, drawType, label, defaultStyle);
        item.featureGeoJSON = featureToGeoJSON(f);
        addItem(item);
        useEventStore.getState().emit("mymap-item-created", { item });
        added++;
      }

      if (added > 0) {
        activateTab("mymaps");
        useToastStore.getState().addToast(`Added ${added} feature${added === 1 ? "" : "s"} to My Maps.`, "success");
      }
    } catch (err) {
      console.error("[attributeTable] addSelectionToMyMaps failed", err);
      useToastStore.getState().addToast("Failed to add selection to My Maps.", "error");
    }
  };

  const selectedCount = active.selection.size;
  const capBanner = active.capReached && active.totalCount !== null && active.totalCount > ATTRIBUTE_TABLE_DEFAULTS.rowCap;

  // Tooltip text for the "Select from map" button. When active, include a
  // short hint about disabling; otherwise show usage instructions.
  const mapSelectTooltip = active.mapSelectActive
    ? "Map selection active — click to disable. Click a feature to select (replaces selection). Hold Shift/Ctrl/Cmd to add/toggle. Shift+drag to box-select multiple features."
    : "Click a feature to select (replaces selection). Hold Shift/Ctrl/Cmd to add/toggle. Shift+drag to box-select multiple features.";

  return (
    <div
      className="fixed bottom-0 z-[500] bg-base-100 border-t border-base-300 shadow-[0_-4px_16px_rgba(0,0,0,0.15)] flex flex-col print:hidden"
      style={{ height, left: mapRect.left, width: mapRect.width }}
      role="region"
      aria-label="Attribute Table"
    >
      {/* Resize handle */}
      <div
        className="h-1.5 cursor-row-resize bg-base-300 hover:bg-primary/60 transition-colors"
        onPointerDown={resize.onPointerDown}
        onPointerMove={resize.onPointerMove}
        onPointerUp={resize.onPointerUp}
        title="Drag to resize"
        role="separator"
        aria-orientation="horizontal"
      />

      {/* Tabs */}
      <AttributeTableTabs />

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-base-300 bg-base-200 text-xs">
        <span className="opacity-70">
          {active.totalCount !== null ? `${active.loadedCount.toLocaleString()} of ${active.totalCount.toLocaleString()} loaded` : `${active.loadedCount.toLocaleString()} loaded`}
        </span>

        <div className="divider divider-horizontal mx-0" />

        <label className="label cursor-pointer gap-1 py-0">
          <input type="checkbox" className="toggle toggle-xs" checked={active.bboxFilterActive} onChange={(e) => setBboxFilterActive(active.layerId, e.target.checked)} />
          <span className="flex items-center gap-1">
            <FaMapMarkedAlt size={10} /> Map extent
          </span>
        </label>

        <button
          type="button"
          className={`btn btn-xs ${active.mapSelectActive ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMapSelectActive(active.layerId, !active.mapSelectActive)}
          title={mapSelectTooltip}
          aria-label="Select from map"
        >
          <FaMousePointer size={10} /> Select from map
        </button>

        {Object.keys(active.filters).length > 0 ? (
          <button type="button" className="btn btn-xs btn-ghost" onClick={() => clearFilters(active.layerId)} title="Clear filters">
            <FaFilter size={10} /> Clear filters
          </button>
        ) : null}

        {selectedCount > 0 || active.selectionOnly ? (
          <>
            <span className="ml-1 opacity-70">{selectedCount} selected</span>
            <button type="button" className="btn btn-xs btn-ghost" onClick={() => invertSelection(active.layerId)} title="Invert selection (loaded rows)" aria-label="Invert selection">
              <FaExchangeAlt size={10} /> Invert
            </button>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() =>
                void zoomToFeatures({
                  layerId: active.layerId,
                  wfsUrl: active.wfsUrl,
                  typeName: active.typeName,
                  fids: Array.from(active.selection),
                  secured: active.secured,
                })
              }
              title="Zoom to selection"
              aria-label="Zoom to selection"
            >
              <FaSearchPlus size={10} /> Zoom
            </button>
            <label className="label cursor-pointer gap-1 py-0" title="Show only selected rows in the grid">
              <input type="checkbox" className="toggle toggle-xs" checked={active.selectionOnly} onChange={(e) => setSelectionOnly(active.layerId, e.target.checked)} />
              <span className="flex items-center gap-1">
                <FaFilter size={10} /> Only selected
              </span>
            </label>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => {
                // Clearing the selection with "only selected" on would leave
                // an empty grid — flip the toggle off for the user.
                if (active.selectionOnly) setSelectionOnly(active.layerId, false);
                clearSelection(active.layerId);
              }}
              title="Clear selection"
            >
              <FaTrash size={10} />
            </button>
          </>
        ) : null}

        <div className="flex-1" />

        {/* Actions menu — CSV export + Add selection to My Maps. The menu
            uses a <details> element so clicking anywhere else closes it
            without us wiring up outside-click handlers. */}
        <details ref={actionsMenuRef} className="dropdown dropdown-top dropdown-end">
          <summary
            className={`btn btn-xs btn-ghost ${active.selection.size === 0 || !active.store ? "btn-disabled" : ""}`}
            title={active.selection.size === 0 ? "Select rows to use actions" : `Actions for ${active.selection.size} selected row(s)`}
            aria-label="Actions menu"
          >
            <FaEllipsisV size={10} />
            Actions
            {active.selection.size > 0 ? <span className="opacity-70">({active.selection.size})</span> : null}
          </summary>
          <ul className="menu dropdown-content menu-sm bg-base-100 rounded-box z-[1] w-56 p-1 shadow-md border border-base-300">
            {active.canDownload ? (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    actionsMenuRef.current?.removeAttribute("open");
                    void onExportCsv();
                  }}
                  disabled={!active.store || active.selection.size === 0 || exporting}
                >
                  <FaDownload size={10} /> {exporting ? "Exporting…" : "Download as CSV"}
                </button>
              </li>
            ) : null}
            <li>
              <button
                type="button"
                onClick={() => {
                  actionsMenuRef.current?.removeAttribute("open");
                  void onAddSelectionToMyMaps();
                }}
                disabled={!active.store || active.selection.size === 0}
              >
                <FaMapMarkerAlt size={10} /> Add selection to My Maps
              </button>
            </li>
          </ul>
        </details>
        <button type="button" className="btn btn-xs btn-ghost" onClick={toggleMinimized} title="Minimize attribute table" aria-label="Minimize attribute table">
          <FaWindowMinimize size={10} />
        </button>
        <button type="button" className="btn btn-xs btn-ghost" onClick={closeAll} title="Close attribute table" aria-label="Close attribute table">
          <FaTimes size={10} />
        </button>
      </div>

      {capBanner ? (
        <div className="alert alert-warning rounded-none text-xs py-1 px-2">
          Maximum of {ATTRIBUTE_TABLE_DEFAULTS.rowCap.toLocaleString()} records reached ({active.totalCount?.toLocaleString()} match). Zoom in to a more focused area
          {active.bboxFilterActive ? (
            ""
          ) : (
            <>
              {" "}
              or enable <span className="font-semibold">Map extent</span>
            </>
          )}{" "}
          to see all results.
        </div>
      ) : null}

      {/* Grid */}
      <div className="flex-1 min-h-0">
        <AttributeTableGrid tab={active} onLoadMore={loadMore} />
      </div>

      {/* Map selection interaction (when active) */}
      {active.mapSelectActive && <AttributeTableMapSelect tab={active} />}
    </div>
  );
}
