import { setStorageItem, getStorageItem } from "@/utils/storage";

/**
 * Attribute Table store
 * ----------------------------------------------------------------------------
 * A Zustand store holding state for the bottom-docked, tabbed Attribute Table
 * panel. One "tab" per open layer. Each tab owns a ColumnarStore (not kept in
 * Zustand's shallow comparison — we store a reference and update counters
 * like `loadedCount` to force re-renders).
 *
 * Performance notes:
 *  - Selection is a Set<fid>; row components read membership through a
 *    memoized selector, so toggling selection doesn't re-render every row.
 *  - A single AbortController is kept per tab and aborted on any param change
 *    (sort/filter/close), preventing stale appends after fast user input.
 *  - `closeTab` calls `ColumnarStore.dispose()` so the TypedArrays become
 *    collectable immediately; geometry LRU entries for that layer are cleared.
 */

import { create } from "zustand";
import type { TOCLayer } from "@/stores/tocStore";
import { ColumnarStore, type ColumnSchema } from "@/lib/attributeTable/columnarStore";
import type { WfsFieldDescriptor } from "@/lib/attributeTable/wfs";

// ---------------------------------------------------------------------------
// Constants / configuration
// ---------------------------------------------------------------------------

export const ATTRIBUTE_TABLE_DEFAULTS = {
  pageSize: 1000,
  rowCap: 1000,
  minHeight: 160,
  defaultHeight: 320,
  maxHeightRatio: 0.75, // max 75% of viewport
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SortSpec {
  field: string;
  direction: "A" | "D";
}

export type FilterMap = Record<string, string>; // column -> substring (client-side, case-insensitive)

/** Remote data source for a tab. */
export type AttributeSourceType = "wfs" | "arcgis";

export interface AttributeTableTab {
  id: string; // same as layerId for simplicity
  layerId: string;
  layerName: string; // display name
  typeName: string; // WFS typeName (ignored for ArcGIS)
  wfsUrl: string;
  sourceType: AttributeSourceType;
  secured: boolean;
  canDownload: boolean;
  /** True when the underlying ArcGIS layer exposes per-feature attachments. */
  hasAttachments: boolean;
  /** URL template ending in `/{OID}/attachments` with `#OBJECTID#` placeholder. */
  attachmentUrlTemplate: string | null;
  schema: ColumnSchema[] | null;
  /** Full field metadata from DescribeFeatureType (incl. geometry fields). */
  fields: WfsFieldDescriptor[] | null;
  /** Field used for paging when user has no explicit sort. */
  implicitSortField: string | null;
  store: ColumnarStore | null;
  totalCount: number | null; // null until first count resolves
  loadedCount: number; // duplicated from store.length to trigger subscriptions
  loading: boolean;
  error: string | null;
  sort: SortSpec | null;
  filters: FilterMap;
  bboxFilterActive: boolean;
  /** When true the grid shows only currently-selected rows. */
  selectionOnly: boolean;
  /** When true the user can click/box-select features on the map to select rows. */
  mapSelectActive: boolean;
  selection: Set<string>; // feature ids
  abortController: AbortController | null;
  capReached: boolean;
}

interface AttributeTableState {
  isOpen: boolean;
  minimized: boolean;
  height: number;
  activeLayerId: string | null;
  tabs: AttributeTableTab[];

  // Actions
  openForLayer: (layer: TOCLayer) => void;
  closeTab: (layerId: string) => void;
  closeAll: () => void;
  setActive: (layerId: string) => void;
  setHeight: (h: number) => void;
  setMinimized: (m: boolean) => void;
  toggleMinimized: () => void;

  setSort: (layerId: string, sort: SortSpec | null) => void;
  setFilter: (layerId: string, field: string, value: string) => void;
  clearFilters: (layerId: string) => void;
  setBboxFilterActive: (layerId: string, active: boolean) => void;

  /** Replace tab data (after a fresh fetch due to sort/filter change). */
  replaceData: (
    layerId: string,
    patch: {
      schema: ColumnSchema[];
      fields: WfsFieldDescriptor[];
      implicitSortField: string | null;
      store: ColumnarStore;
      totalCount: number | null;
      capReached: boolean;
    },
  ) => void;
  /** Append a page to an existing store. */
  appendPage: (layerId: string, loadedCount: number, capReached: boolean) => void;

  setLoading: (layerId: string, loading: boolean) => void;
  setError: (layerId: string, error: string | null) => void;
  setAbortController: (layerId: string, ctrl: AbortController | null) => void;

  toggleSelection: (layerId: string, fid: string, additive?: boolean) => void;
  clearSelection: (layerId: string) => void;
  setSelection: (layerId: string, fids: string[]) => void;
  /** Invert selection across all currently-loaded rows. */
  invertSelection: (layerId: string) => void;
  setSelectionOnly: (layerId: string, active: boolean) => void;
  setMapSelectActive: (layerId: string, active: boolean) => void;

  /** Bump tab counter without touching data — used after schema-only mutations. */
  touch: (layerId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTab(layer: TOCLayer): AttributeTableTab {
  const url = layer.wfsUrl ?? "";
  // ArcGIS identify/query URLs contain `/MapServer` or `/FeatureServer`.
  const sourceType: AttributeSourceType = /\/(MapServer|FeatureServer)\b/i.test(url) ? "arcgis" : "wfs";

  // `attachmentUrl` template is set on the underlying OL layer by
  // tocHelpers/ThemeServiceToggler — read it so the grid can mint a
  // per-row attachments URL (replacing `#OBJECTID#`).
  const olLayer = layer.layer as { get?: (key: string) => unknown } | null;
  const attachmentUrlTemplate = olLayer && typeof olLayer.get === "function" ? ((olLayer.get("attachmentUrl") as string | null) ?? null) : null;
  const hasAttachments = Boolean(layer.hasAttachments) && !!attachmentUrlTemplate;

  return {
    id: layer.id,
    layerId: layer.id,
    layerName: layer.tocDisplayName || layer.displayName || layer.name,
    typeName: layer.name,
    wfsUrl: url,
    sourceType,
    secured: layer.secured ?? false,
    canDownload: layer.canDownload ?? false,
    hasAttachments,
    attachmentUrlTemplate,
    schema: null,
    fields: null,
    implicitSortField: null,
    store: null,
    totalCount: null,
    loadedCount: 0,
    loading: true,
    error: null,
    sort: null,
    filters: {},
    // Default ON: many layers contain 100k+ features; restrict to the visible
    // map window so the initial fetch stays within the row cap.
    bboxFilterActive: false,
    selectionOnly: false,
    mapSelectActive: false,
    selection: new Set<string>(),
    abortController: null,
    capReached: false,
  };
}

function readPersistedHeight(): number {
  if (typeof window === "undefined") return ATTRIBUTE_TABLE_DEFAULTS.defaultHeight;
  try {
    const v = getStorageItem("sc.attributeTable.height");
    const n = v ? Number(v) : NaN;
    if (Number.isFinite(n) && n >= ATTRIBUTE_TABLE_DEFAULTS.minHeight) return n;
  } catch {
    /* ignore */
  }
  return ATTRIBUTE_TABLE_DEFAULTS.defaultHeight;
}

function persistHeight(h: number): void {
  if (typeof window === "undefined") return;
  try {
    setStorageItem("sc.attributeTable.height", String(Math.round(h)));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAttributeTableStore = create<AttributeTableState>((set, get) => ({
  isOpen: false,
  minimized: false,
  height: readPersistedHeight(),
  activeLayerId: null,
  tabs: [],

  openForLayer: (layer) => {
    const existing = get().tabs.find((t) => t.layerId === layer.id);
    if (existing) {
      set({ isOpen: true, minimized: false, activeLayerId: layer.id });
      return;
    }
    const tab = makeTab(layer);
    set((s) => ({ isOpen: true, minimized: false, activeLayerId: layer.id, tabs: [...s.tabs, tab] }));
  },

  closeTab: (layerId) => {
    const tab = get().tabs.find((t) => t.layerId === layerId);
    if (tab) {
      tab.abortController?.abort();
      tab.store?.dispose();
    }
    set((s) => {
      const tabs = s.tabs.filter((t) => t.layerId !== layerId);
      const stillOpen = tabs.length > 0;
      const nextActive = s.activeLayerId === layerId ? (tabs[0]?.layerId ?? null) : s.activeLayerId;
      return { tabs, isOpen: stillOpen, activeLayerId: nextActive };
    });
  },

  closeAll: () => {
    for (const t of get().tabs) {
      t.abortController?.abort();
      t.store?.dispose();
    }
    set({ tabs: [], isOpen: false, minimized: false, activeLayerId: null });
  },

  setActive: (layerId) => set({ activeLayerId: layerId }),

  setHeight: (h) => {
    const clamped = Math.max(ATTRIBUTE_TABLE_DEFAULTS.minHeight, Math.round(h));
    persistHeight(clamped);
    set({ height: clamped });
  },

  setMinimized: (minimized) => set({ minimized }),
  toggleMinimized: () => set((s) => ({ minimized: !s.minimized })),

  setSort: (layerId, sort) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.layerId === layerId ? { ...t, sort } : t)),
    })),

  setFilter: (layerId, field, value) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.layerId !== layerId) return t;
        const filters = { ...t.filters };
        if (value.length === 0) delete filters[field];
        else filters[field] = value;
        return { ...t, filters };
      }),
    })),

  clearFilters: (layerId) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.layerId === layerId ? { ...t, filters: {} } : t)),
    })),

  setBboxFilterActive: (layerId, active) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.layerId === layerId ? { ...t, bboxFilterActive: active } : t)),
    })),

  replaceData: (layerId, patch) => {
    // Dispose the previous store before replacing so we don't leak.
    const prev = get().tabs.find((t) => t.layerId === layerId);
    if (prev?.store && prev.store !== patch.store) prev.store.dispose();

    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.layerId === layerId
          ? {
              ...t,
              schema: patch.schema,
              fields: patch.fields,
              implicitSortField: patch.implicitSortField,
              store: patch.store,
              totalCount: patch.totalCount,
              loadedCount: patch.store.length,
              capReached: patch.capReached,
              selection: new Set<string>(), // reset selection on reload
              selectionOnly: false, // turn off when selection is cleared
              error: null,
            }
          : t,
      ),
    }));
  },

  appendPage: (layerId, loadedCount, capReached) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.layerId === layerId ? { ...t, loadedCount, capReached } : t)),
    })),

  setLoading: (layerId, loading) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.layerId === layerId ? { ...t, loading } : t)),
    })),

  setError: (layerId, error) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.layerId === layerId ? { ...t, error, ...(error ? { loading: false } : {}) } : t)),
    })),

  setAbortController: (layerId, ctrl) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.layerId === layerId ? { ...t, abortController: ctrl } : t)),
    })),

  toggleSelection: (layerId, fid, additive = true) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.layerId !== layerId) return t;
        const next = additive ? new Set(t.selection) : new Set<string>();
        if (next.has(fid)) next.delete(fid);
        else next.add(fid);
        return { ...t, selection: next };
      }),
    })),

  clearSelection: (layerId) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.layerId === layerId ? { ...t, selection: new Set<string>() } : t)),
    })),

  setSelection: (layerId, fids) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.layerId === layerId ? { ...t, selection: new Set(fids) } : t)),
    })),

  invertSelection: (layerId) =>
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.layerId !== layerId || !t.store) return t;
        const loadedFids = t.store.fids;
        const next = new Set<string>();
        for (const fid of loadedFids) {
          if (!t.selection.has(fid)) next.add(fid);
        }
        return { ...t, selection: next };
      }),
    })),

  setSelectionOnly: (layerId, active) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.layerId === layerId ? { ...t, selectionOnly: active } : t)),
    })),

  setMapSelectActive: (layerId, active) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.layerId === layerId ? { ...t, mapSelectActive: active } : t)),
    })),

  touch: (layerId) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.layerId === layerId ? { ...t } : t)),
    })),
}));

// ---------------------------------------------------------------------------
// Selectors (stable references for perf)
// ---------------------------------------------------------------------------

export const selectActiveTab = (s: AttributeTableState): AttributeTableTab | null => s.tabs.find((t) => t.layerId === s.activeLayerId) ?? null;

export const selectTab = (layerId: string) => (s: AttributeTableState) => s.tabs.find((t) => t.layerId === layerId) ?? null;
