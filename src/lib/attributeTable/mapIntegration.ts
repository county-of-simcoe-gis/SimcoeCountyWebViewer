/**
 * Map integration for the Attribute Table.
 * ----------------------------------------------------------------------------
 * Manages a single dedicated OpenLayers VectorLayer used to highlight rows
 * selected in the attribute table. Also provides zoom/pan-to-feature helpers.
 *
 * Design: one vector layer, features keyed by `layerId::fid` in their `id`
 * so we can surgically add/remove per tab without stomping other tabs'
 * highlights. A small LRU caps geometry memory to avoid unbounded growth
 * when a user selects many rows across many tabs.
 */

import type OLMap from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Feature from "ol/Feature";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import Fill from "ol/style/Fill";
import CircleStyle from "ol/style/Circle";
import { intersects as extentIntersects } from "ol/extent";
import { useMapStore } from "@/stores/mapStore";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { fetchFeatureById } from "@/lib/attributeTable/wfs";
import { fetchArcgisFeatureById, parseArcgisLayerUrl } from "@/lib/attributeTable/arcgis";
import type { AttributeTableTab } from "@/stores/attributeTableStore";

// Stable managed-layer IDs in the layer manager store. We keep them as
// module constants so repeated calls to `getOrCreate…` always find the
// same registered layer regardless of how many attribute-table tabs are open.
const HIGHLIGHT_MANAGED_ID = "attributeTable::highlight";
const HOVER_MANAGED_ID = "attributeTable::hover";
// Hold one geometry per loaded row across all open tabs. The attribute-table
// row cap is 100k per tab, so this bounds memory predictably. Entries are
// purged when a tab is closed via `clearHighlightsForLayer`.
const GEOMETRY_LRU_CAP = 200_000;

// ---------------------------------------------------------------------------
// Style
// ---------------------------------------------------------------------------

const highlightStyle = new Style({
  stroke: new Stroke({ color: "#38bdf8", width: 3 }),
  fill: new Fill({ color: "rgba(56,189,248,0.25)" }),
  image: new CircleStyle({
    radius: 7,
    stroke: new Stroke({ color: "#38bdf8", width: 2 }),
    fill: new Fill({ color: "rgba(56,189,248,0.5)" }),
  }),
});

/**
 * Hover style — distinct from the selection style so a hovered row over an
 * already-selected feature is still visible. Light blue + thicker casing.
 */
const hoverStyle = new Style({
  stroke: new Stroke({ color: "#7dd3fc", width: 4 }),
  fill: new Fill({ color: "rgba(125,211,252,0.25)" }),
  image: new CircleStyle({
    radius: 8,
    stroke: new Stroke({ color: "#7dd3fc", width: 3 }),
    fill: new Fill({ color: "rgba(125,211,252,0.5)" }),
  }),
});

// ---------------------------------------------------------------------------
// Layer lifecycle
// ---------------------------------------------------------------------------

function getOrCreateLayer(map: OLMap): VectorLayer<VectorSource> {
  // Look up by stable managed ID; the layer manager owns add/remove lifecycle.
  const existing = useLayerManagerStore.getState().getLayer(HIGHLIGHT_MANAGED_ID);
  if (existing) return existing.layer as VectorLayer<VectorSource>;

  const layer = new VectorLayer({
    source: new VectorSource(),
    style: highlightStyle,
  });
  LayerManager.addLayer(layer, "Graphics", "Attribute Table Highlight", {
    id: HIGHLIGHT_MANAGED_ID,
  });
  // Suppress unused-param lint; kept for API symmetry / future per-map scope.
  void map;
  return layer;
}

function getOrCreateHoverLayer(map: OLMap): VectorLayer<VectorSource> {
  const existing = useLayerManagerStore.getState().getLayer(HOVER_MANAGED_ID);
  if (existing) return existing.layer as VectorLayer<VectorSource>;

  const layer = new VectorLayer({
    source: new VectorSource(),
    style: hoverStyle,
  });
  // Insert after the highlight so the hover casing renders on top of any
  // selection highlight for the same feature. `index` is per-category.
  LayerManager.addLayer(layer, "Graphics", "Attribute Table Hover", {
    id: HOVER_MANAGED_ID,
  });
  void map;
  return layer;
}

// ---------------------------------------------------------------------------
// Geometry LRU
// ---------------------------------------------------------------------------

/** Key: `${layerId}::${fid}`. Value: OL Feature (with geometry). */
const geomLRU = new Map<string, Feature>();

function lruTouch(key: string, feat: Feature): void {
  if (geomLRU.has(key)) geomLRU.delete(key);
  geomLRU.set(key, feat);
  while (geomLRU.size > GEOMETRY_LRU_CAP) {
    const oldestKey = geomLRU.keys().next().value as string | undefined;
    if (!oldestKey) break;
    geomLRU.delete(oldestKey);
  }
}

function compoundId(layerId: string, fid: string): string {
  return `${layerId}::${fid}`;
}

/**
 * Fetch a single feature (with geometry) by fid for either a WFS or an
 * ArcGIS layer. Auto-detects by URL shape.
 */
async function fetchOneFeature(
  queryUrl: string,
  typeName: string,
  fid: string,
  secured: boolean,
  signal?: AbortSignal,
): Promise<{ id?: string | number; properties: Record<string, unknown> | null; geometry: unknown } | null> {
  const arc = parseArcgisLayerUrl(queryUrl);
  if (arc) {
    // ArcGIS: the objectIdField is usually "OBJECTID"; caller may pass a
    // different column name in `typeName`, but the `fid` itself is the OID
    // value so we just plug it into the default OID field.
    return fetchArcgisFeatureById(arc, secured, "OBJECTID", fid, signal);
  }
  return fetchFeatureById(queryUrl, typeName, fid, signal);
}

/**
 * Cache geometries for a page of freshly-loaded features.
 * Called by the attribute-table loader so zoom-to-feature and highlight can
 * use geometries already delivered with the page — this is essential for
 * layers without a primary key whose auto-generated fids (e.g.
 * `Library.fid--1574c53d_…`) cannot be re-queried by WFS featureID.
 */
export function cacheGeometries(layerId: string, features: ReadonlyArray<{ id?: string | number; geometry?: unknown }>): void {
  if (features.length === 0) return;
  const map = useMapStore.getState().map;
  const mapProj = map ? map.getView().getProjection().getCode() : "EPSG:3857";
  // Page fetches in `fetchWfsPage` request srsName=EPSG:3857 by default, so
  // the GeoJSON coordinates are already in the map's projection — no transform.
  const fmt = new GeoJSON();
  for (const f of features) {
    if (!f.geometry || f.id === undefined || f.id === null) continue;
    try {
      const olFeat = fmt.readFeature({ type: "Feature", id: f.id, geometry: f.geometry, properties: {} }, { featureProjection: mapProj, dataProjection: mapProj }) as Feature;
      const key = compoundId(layerId, String(f.id));
      olFeat.setId(key);
      lruTouch(key, olFeat);
    } catch {
      // best-effort
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Ensure that a set of features for a given layerId is highlighted on the map.
 * Missing geometries are fetched lazily via WFS featureID=… requests.
 */
export async function syncHighlight(params: { layerId: string; wfsUrl: string; typeName: string; fids: string[]; secured?: boolean; signal?: AbortSignal }): Promise<void> {
  const { layerId, wfsUrl, typeName, fids, secured = false, signal } = params;
  const map = useMapStore.getState().map;
  if (!map) return;

  const layer = getOrCreateLayer(map);
  const src = layer.getSource();
  if (!src) return;

  // 1. Remove any highlighted features for this layerId that are no longer selected.
  const wanted = new Set(fids.map((f) => compoundId(layerId, f)));
  for (const f of src.getFeatures()) {
    const id = f.getId();
    if (typeof id !== "string") continue;
    if (id.startsWith(`${layerId}::`) && !wanted.has(id)) {
      src.removeFeature(f);
    }
  }

  if (fids.length === 0) return;

  // 2. Add any missing. Use LRU cache first; fall back to WFS.
  const missing: string[] = [];
  for (const fid of fids) {
    const key = compoundId(layerId, fid);
    const cached = geomLRU.get(key);
    if (cached) {
      if (!src.getFeatureById(key)) src.addFeature(cached);
      lruTouch(key, cached);
    } else {
      missing.push(fid);
    }
  }

  if (missing.length === 0 || !wfsUrl) return;

  // Serial fetch — these are usually few (users rarely select 100s).
  // Individual GetFeature?featureID requests are cheap and cancellable.
  const fmt = new GeoJSON();
  const mapProj = map.getView().getProjection().getCode();
  for (const fid of missing) {
    if (signal?.aborted) return;
    try {
      const f = await fetchOneFeature(wfsUrl, typeName, fid, secured, signal);
      if (!f || !f.geometry) continue;
      const olFeat = fmt.readFeature({ type: "Feature", id: f.id, geometry: f.geometry, properties: f.properties ?? {} }, { featureProjection: mapProj, dataProjection: mapProj }) as Feature;
      const key = compoundId(layerId, fid);
      olFeat.setId(key);
      lruTouch(key, olFeat);
      if (!src.getFeatureById(key)) src.addFeature(olFeat);
    } catch {
      // swallow individual geometry errors — highlight is best-effort
    }
  }
}

/** Remove all highlights for a layer (call on tab close or selection clear). */
export function clearHighlightsForLayer(layerId: string): void {
  const managed = useLayerManagerStore.getState().getLayer(HIGHLIGHT_MANAGED_ID);
  const src = (managed?.layer as VectorLayer<VectorSource> | undefined)?.getSource();
  if (src) {
    for (const f of src.getFeatures()) {
      const id = f.getId();
      if (typeof id === "string" && id.startsWith(`${layerId}::`)) {
        src.removeFeature(f);
      }
    }
  }
  // Also drop from LRU
  for (const k of Array.from(geomLRU.keys())) {
    if (k.startsWith(`${layerId}::`)) geomLRU.delete(k);
  }
  // Also clear any hover for this layer.
  clearHover(layerId);
}

// ---------------------------------------------------------------------------
// Hover highlight
// ---------------------------------------------------------------------------

let hoverController: AbortController | null = null;

/**
 * Show a transient hover highlight for a single row. Intended to be called
 * on `mouseenter` of a grid row and paired with {@link clearHover} on leave.
 * If the geometry is already in the LRU, this is fully synchronous.
 */
export function setHoverFeature(params: { layerId: string; fid: string; wfsUrl?: string; typeName?: string; secured?: boolean }): void {
  const { layerId, fid, wfsUrl, typeName = "", secured = false } = params;
  const map = useMapStore.getState().map;
  if (!map) return;

  const layer = getOrCreateHoverLayer(map);
  const src = layer.getSource();
  if (!src) return;

  // Cancel any in-flight hover fetch from a previous row.
  hoverController?.abort();

  // If the wanted feature is already shown, nothing to do.
  const wantedKey = compoundId(layerId, fid);
  const current = src.getFeatures();
  if (current.length === 1 && current[0].getId() === wantedKey) return;

  src.clear();

  // Fast path: geometry already cached (typical — page loads populate LRU).
  const cached = geomLRU.get(wantedKey);
  if (cached) {
    src.addFeature(cached);
    lruTouch(wantedKey, cached);
    return;
  }

  if (!wfsUrl) return;

  // Slow path: fetch lazily. Abort if the user moves to another row quickly.
  const ctrl = new AbortController();
  hoverController = ctrl;
  const mapProj = map.getView().getProjection().getCode();
  const fmt = new GeoJSON();
  void (async () => {
    try {
      const f = await fetchOneFeature(wfsUrl, typeName, fid, secured, ctrl.signal);
      if (ctrl.signal.aborted || !f || !f.geometry) return;
      const olFeat = fmt.readFeature({ type: "Feature", id: f.id, geometry: f.geometry, properties: f.properties ?? {} }, { featureProjection: mapProj, dataProjection: mapProj }) as Feature;
      olFeat.setId(wantedKey);
      lruTouch(wantedKey, olFeat);
      // Only add if this hover is still the active one.
      if (hoverController === ctrl && src.getFeatures().length === 0) {
        src.addFeature(olFeat);
      }
    } catch {
      // best-effort
    }
  })();
}

/**
 * Clear the hover highlight. If `layerId` is provided, only clears when the
 * currently-hovered feature belongs to that layer (useful on tab close).
 */
export function clearHover(layerId?: string): void {
  hoverController?.abort();
  hoverController = null;
  const managed = useLayerManagerStore.getState().getLayer(HOVER_MANAGED_ID);
  const src = (managed?.layer as VectorLayer<VectorSource> | undefined)?.getSource();
  if (!src) return;
  if (!layerId) {
    src.clear();
    return;
  }
  for (const f of src.getFeatures()) {
    const id = f.getId();
    if (typeof id === "string" && id.startsWith(`${layerId}::`)) {
      src.removeFeature(f);
    }
  }
}

/** Zoom the map to a specific feature (lazy-fetches geometry if needed). */
export async function zoomToFeature(wfsUrl: string, typeName: string, layerId: string, fid: string, secured = false): Promise<void> {
  const map = useMapStore.getState().map;
  if (!map) {
    console.warn("[attributeTable] zoomToFeature: map not initialized");
    return;
  }
  if (!wfsUrl) {
    console.warn("[attributeTable] zoomToFeature: no wfsUrl for layer", layerId);
    return;
  }

  const key = compoundId(layerId, fid);
  let feat = geomLRU.get(key);
  if (!feat) {
    let f: { id?: string | number; properties?: Record<string, unknown> | null; geometry?: unknown } | null = null;
    try {
      f = await fetchOneFeature(wfsUrl, typeName, fid, secured);
    } catch (err) {
      console.error("[attributeTable] zoomToFeature: feature fetch failed", { wfsUrl, typeName, fid, err });
      return;
    }
    if (!f || !f.geometry) {
      console.warn("[attributeTable] zoomToFeature: no geometry returned", { typeName, fid, response: f });
      return;
    }
    // Page fetches request srsName=EPSG:3857 (same as the map), so the
    // coordinates are already in the map projection — no transform needed.
    const mapProj = map.getView().getProjection().getCode();
    feat = new GeoJSON().readFeature({ type: "Feature", id: f.id, geometry: f.geometry, properties: f.properties ?? {} }, { featureProjection: mapProj, dataProjection: mapProj }) as Feature;
    feat.setId(key);
    lruTouch(key, feat);
  } else {
    lruTouch(key, feat);
  }

  const geom = feat.getGeometry();
  if (!geom) {
    console.warn("[attributeTable] zoomToFeature: feature has no geometry after read", { typeName, fid });
    return;
  }
  const extent = geom.getExtent();
  if (!extent || extent.some((n) => !Number.isFinite(n))) {
    console.warn("[attributeTable] zoomToFeature: invalid extent", { extent, typeName, fid });
    return;
  }
  const view = map.getView();
  view.fit(extent, {
    duration: 600,
    maxZoom: 18,
    padding: [60, 60, 60, 60],
  });
}

/** Current map extent in EPSG:3857 — used for the "filter by map extent" button. */
export function getCurrentMapExtent(): [number, number, number, number] | null {
  const map = useMapStore.getState().map;
  if (!map) return null;
  const ext = map.getView().calculateExtent(map.getSize());
  if (!ext || ext.some((n) => !Number.isFinite(n))) return null;
  return [ext[0], ext[1], ext[2], ext[3]];
}

/**
 * Zoom the map to the combined extent of a set of features (by fid).
 * Uses {@link getCachedFeatures} to pull geometries from the LRU first and
 * fall back to per-feature fetches for any missing ones.
 */
export async function zoomToFeatures(params: { layerId: string; wfsUrl: string; typeName: string; fids: string[]; secured?: boolean; signal?: AbortSignal }): Promise<void> {
  const map = useMapStore.getState().map;
  if (!map || params.fids.length === 0) return;

  const feats = await getCachedFeatures(params);
  if (feats.length === 0) return;

  // Accumulate an extent manually to avoid pulling in `ol/extent`.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of feats) {
    const e = f.getGeometry()?.getExtent();
    if (!e || e.some((n) => !Number.isFinite(n))) continue;
    if (e[0] < minX) minX = e[0];
    if (e[1] < minY) minY = e[1];
    if (e[2] > maxX) maxX = e[2];
    if (e[3] > maxY) maxY = e[3];
  }
  if (!Number.isFinite(minX)) return;

  map.getView().fit([minX, minY, maxX, maxY], {
    duration: 600,
    maxZoom: 18,
    padding: [60, 60, 60, 60],
  });
}

/**
 * Return OpenLayers Features for the given fids of a layer, drawing from
 * the geometry LRU first and falling back to the WFS/ArcGIS feature-by-id
 * endpoint for any that are missing. Used by "Add selection to My Maps".
 */
export async function getCachedFeatures(params: { layerId: string; wfsUrl: string; typeName: string; fids: string[]; secured?: boolean; signal?: AbortSignal }): Promise<Feature[]> {
  const { layerId, wfsUrl, typeName, fids, secured = false, signal } = params;
  const out: Feature[] = [];
  const missing: string[] = [];

  for (const fid of fids) {
    const key = compoundId(layerId, fid);
    const cached = geomLRU.get(key);
    if (cached) {
      lruTouch(key, cached);
      out.push(cached);
    } else {
      missing.push(fid);
    }
  }

  if (missing.length === 0 || !wfsUrl) return out;

  const map = useMapStore.getState().map;
  const mapProj = map ? map.getView().getProjection().getCode() : "EPSG:3857";
  const fmt = new GeoJSON();
  for (const fid of missing) {
    if (signal?.aborted) break;
    try {
      const f = await fetchOneFeature(wfsUrl, typeName, fid, secured, signal);
      if (!f || !f.geometry) continue;
      const olFeat = fmt.readFeature({ type: "Feature", id: f.id, geometry: f.geometry, properties: f.properties ?? {} }, { featureProjection: mapProj, dataProjection: mapProj }) as Feature;
      const key = compoundId(layerId, fid);
      olFeat.setId(key);
      lruTouch(key, olFeat);
      out.push(olFeat);
    } catch {
      // best-effort
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Spatial selection (click / box-select from map)
// ---------------------------------------------------------------------------

/**
 * Select features from the tab's loaded data that intersect the given extent.
 * Uses cached geometries from the LRU (populated during highlight operations)
 * plus any vector layer source on the map. No server query needed.
 *
 * Used by the "Select from map" feature (click + DragBox).
 */
export function selectFeaturesByExtent(tab: AttributeTableTab, extent: [number, number, number, number]): string[] {
  if (!tab.store) return [];

  const matchedFids: string[] = [];
  const layerId = tab.layerId;
  const prefix = `${layerId}::`;

  // Check geometries in the LRU cache
  for (const [key, feat] of geomLRU.entries()) {
    if (!key.startsWith(prefix)) continue;
    const geom = feat.getGeometry();
    if (!geom) continue;
    const geomExtent = geom.getExtent();
    if (extentIntersects(extent, geomExtent)) {
      const fid = key.slice(prefix.length);
      // Only include if this fid is in the loaded store
      if (tab.store.fids.includes(fid)) {
        matchedFids.push(fid);
      }
    }
  }

  return matchedFids;
}
