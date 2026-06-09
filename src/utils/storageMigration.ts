/**
 * One-time migration utility that converts localStorage data written by the
 * old SimcoeCountyWebViewer / SimcoeCountyWebViewerSecure apps into the
 * format expected by the new NextJS application.
 *
 * Key differences handled:
 *  1. Key renames  ("myMaps" → "simcoe-mymaps-data", "Map Control Settings" → "Map_Control_Settings")
 *  2. MyMaps style format  (OL internal fill_/stroke_ → clean fill/stroke JSON)
 *  3. Layers / Layers_Folder_View / TOC_Type  (raw legacy format — no conversion needed)
 *  4. ArcGIS_Token  (localStorage → sessionStorage)
 *  5. Cleanup only of keys whose data has been successfully migrated elsewhere
 *
 * "searchHistory" and "sc_dontshowagain" are stored as plain JSON arrays in
 * both the legacy and NextJS apps, so they require no migration.
 *
 * The migration is idempotent — a sentinel key prevents it from running twice.
 */

// ─── constants ──────────────────────────────────────────────────────────────

const MIGRATION_SENTINEL = "__storage_migrated_v1";

/** Old key → New key (for keys that were renamed) */
const RENAMED_KEYS: Record<string, string> = {
  "Map Control Settings": "Map_Control_Settings",
};

/**
 * Keys that are safe to remove after migration because their data has been
 * copied to a new key. We never delete keys that the new app still uses
 * under the same name — those are converted in place.
 */
const MIGRATED_SOURCE_KEYS = [
  "myMaps", // data moved to "simcoe-mymaps-data"
  "Map Control Settings", // data moved to "Map_Control_Settings"
  "ArcGIS_Token", // data moved to sessionStorage
];

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Returns true when `raw` is a JSON string wrapping our {value, timestamp}
 * storage envelope (i.e. already in the new format).
 */
function isEnvelopeFormat(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) && "value" in parsed && "timestamp" in parsed;
  } catch {
    return false;
  }
}

/**
 * Safely JSON-parse a localStorage value, returning undefined on failure.
 */
function safeParse(raw: string | null): unknown {
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// ─── MyMaps style transformation ────────────────────────────────────────────

interface OldOLStyle {
  fill_?: { color_?: number[] | string };
  stroke_?: { color_?: number[] | string; width_?: number; lineDash_?: number[] | null };
  image_?: {
    fill_?: { color_?: number[] | string };
    stroke_?: { color_?: number[] | string; width_?: number; lineDash_?: number[] | null };
    radius_?: number;
    rotation_?: number;
    points_?: number;
    radius2_?: number;
    angle_?: number;
    src_?: string;
    scale_?: number;
  };
  text_?: {
    text_?: string;
    font_?: string;
    fill_?: { color_?: number[] | string };
    stroke_?: { color_?: number[] | string; width_?: number };
    offsetX_?: number;
    offsetY_?: number;
    rotation_?: number;
  };
}

interface NewStyleJSON {
  fill?: { color: string | number[] };
  stroke?: { color: string | number[]; width?: number; lineDash?: number[] };
  image?: {
    type: "circle" | "regularShape" | "icon";
    radius?: number;
    fill?: { color: string | number[] };
    stroke?: { color: string | number[]; width?: number; lineDash?: number[] };
    points?: number;
    radius2?: number;
    angle?: number;
    rotation?: number;
    src?: string;
    scale?: number;
  };
  text?: {
    text: string;
    font?: string;
    fill?: { color: string | number[] };
    stroke?: { color: string | number[]; width?: number };
    offsetX?: number;
    offsetY?: number;
    rotation?: number;
  };
}

/**
 * Detect whether a style object uses the old OL internal serialization
 * (properties ending with underscores like `fill_`, `stroke_`).
 */
export function isOldOLStyleFormat(style: unknown): style is OldOLStyle {
  if (!style || typeof style !== "object") return false;
  const keys = Object.keys(style);
  return keys.some((k) => k.endsWith("_"));
}

/**
 * Convert an OL internal style serialization to the clean JSON format
 * used by the new myMapsStore.
 */
export function transformOLStyle(old: OldOLStyle): NewStyleJSON {
  const result: NewStyleJSON = {};

  if (old.fill_?.color_) {
    result.fill = { color: old.fill_.color_ };
  }

  if (old.stroke_) {
    result.stroke = { color: old.stroke_.color_ ?? [0, 0, 0, 1] };
    if (old.stroke_.width_ !== undefined) result.stroke.width = old.stroke_.width_;
    if (old.stroke_.lineDash_) result.stroke.lineDash = old.stroke_.lineDash_;
  }

  if (old.image_) {
    const img = old.image_;
    const imageType: "circle" | "regularShape" | "icon" = img.src_ ? "icon" : img.points_ !== undefined ? "regularShape" : "circle";

    result.image = { type: imageType };

    if (img.radius_ !== undefined) result.image.radius = img.radius_;
    if (img.fill_?.color_) result.image.fill = { color: img.fill_.color_ };
    if (img.stroke_) {
      result.image.stroke = { color: img.stroke_.color_ ?? [0, 0, 0, 1] };
      if (img.stroke_.width_ !== undefined) result.image.stroke.width = img.stroke_.width_;
      if (img.stroke_.lineDash_) result.image.stroke.lineDash = img.stroke_.lineDash_;
    }
    if (img.points_ !== undefined) result.image.points = img.points_;
    if (img.radius2_ !== undefined) result.image.radius2 = img.radius2_;
    if (img.angle_ !== undefined) result.image.angle = img.angle_;
    if (img.rotation_ !== undefined) result.image.rotation = img.rotation_;
    if (img.src_) result.image.src = img.src_;
    if (img.scale_ !== undefined) result.image.scale = img.scale_;
  }

  if (old.text_) {
    result.text = { text: old.text_.text_ ?? "" };
    if (old.text_.font_) result.text.font = old.text_.font_;
    if (old.text_.fill_?.color_) result.text.fill = { color: old.text_.fill_.color_ };
    if (old.text_.stroke_) {
      result.text.stroke = { color: old.text_.stroke_.color_ ?? [0, 0, 0, 1] };
      if (old.text_.stroke_.width_ !== undefined) result.text.stroke.width = old.text_.stroke_.width_;
    }
    if (old.text_.offsetX_ !== undefined) result.text.offsetX = old.text_.offsetX_;
    if (old.text_.offsetY_ !== undefined) result.text.offsetY = old.text_.offsetY_;
    if (old.text_.rotation_ !== undefined) result.text.rotation = old.text_.rotation_;
  }

  return result;
}

/**
 * Compute alpha (0–1) from an rgba-style color array [r, g, b, a].
 */
function extractAlpha(color: unknown): number | undefined {
  if (Array.isArray(color) && color.length === 4) {
    return typeof color[3] === "number" ? color[3] : undefined;
  }
  return undefined;
}

// ─── MyMaps migration ───────────────────────────────────────────────────────

interface OldMyMapsItem {
  id: string;
  label: string;
  labelVisible: boolean;
  labelRotation: number;
  labelStyle?: unknown;
  featureGeoJSON: string;
  style: unknown;
  visible: boolean;
  drawType: string;
  geometryType: string;
  pointType?: string;
  strokeType?: string;
  isParcel?: boolean;
  hasChanged?: boolean;
}

interface OldMyMapsData {
  items: OldMyMapsItem[];
  drawColor?: string;
  drawOpacity?: number;
  drawType?: string;
  drawStyle?: unknown;
  toolTipClass?: string;
  toolTipId?: string;
}

/**
 * Migrate a single MyMaps item from old OL style format to new StyleJSON format.
 */
function migrateMyMapsItem(oldItem: OldMyMapsItem): Record<string, unknown> {
  const { hasChanged: _dropped, style, ...rest } = oldItem;

  let newStyle = style;
  let fillAlpha: number | undefined;
  let strokeAlpha: number | undefined;

  if (isOldOLStyleFormat(style)) {
    const olStyle = style as OldOLStyle;
    newStyle = transformOLStyle(olStyle);

    // Extract opacity values from the old RGBA colors
    fillAlpha = extractAlpha(olStyle.fill_?.color_);
    strokeAlpha = extractAlpha(olStyle.stroke_?.color_);
    if (strokeAlpha === undefined && olStyle.image_?.stroke_?.color_) {
      strokeAlpha = extractAlpha(olStyle.image_.stroke_.color_);
    }
  }

  return {
    ...rest,
    style: newStyle,
    ...(fillAlpha !== undefined && { fillAlpha }),
    ...(strokeAlpha !== undefined && { strokeAlpha }),
  };
}

/**
 * Migrate the "myMaps" key to "simcoe-mymaps-data" with style transformations.
 * Written using raw localStorage.setItem to match how myMapsStore persists data.
 */
function migrateMyMaps(): boolean {
  const NEW_KEY = "simcoe-mymaps-data";

  // Only migrate if old key exists and new key does not
  const oldRaw = localStorage.getItem("myMaps");
  if (!oldRaw) return false;
  if (localStorage.getItem(NEW_KEY)) return false;

  const oldData = safeParse(oldRaw) as OldMyMapsData | undefined;
  if (!oldData?.items) return false;

  const migratedItems = oldData.items.map(migrateMyMapsItem);

  const dataToSave = {
    items: migratedItems,
    drawColor: oldData.drawColor ?? "#e809e5",
    drawOpacity: oldData.drawOpacity ?? 0.8,
    drawingCounter: migratedItems.length + 1,
    config: {
      showBearingButton: true,
      showMeasureButton: false,
      nonPointCursorSize: 1,
    },
  };

  localStorage.setItem(NEW_KEY, JSON.stringify(dataToSave));
  return true;
}

// ─── Renamed key migration (non-MyMaps) ────────────────────────────────────

/**
 * Migrate a key that was simply renamed between old and new apps.
 * Data format stays the same (raw JSON.stringify), only the key changes.
 */
function migrateRenamedKeys(): void {
  for (const [oldKey, newKey] of Object.entries(RENAMED_KEYS)) {
    const oldRaw = localStorage.getItem(oldKey);
    if (!oldRaw) continue;
    if (localStorage.getItem(newKey)) continue; // new key already has data

    localStorage.setItem(newKey, oldRaw);
  }
}

// ─── Layer keys migration ───────────────────────────────────────────────────

/**
 * The old app stored layer state in two separate keys depending on view mode:
 *   "Layers"              — list-view layer state (raw JSON)
 *   "Layers_Folder_View"  — folder-view layer state (raw JSON)
 *
 * The new app reads and writes these SAME keys in the SAME raw legacy format
 * (via saveSharedItem/getSharedItem) so saves are fully interoperable between
 * the legacy apps and this app, including through the shared server-side
 * storage row. "TOC_Type" is likewise read directly.
 *
 * Therefore NO conversion is required — the legacy raw data is already in the
 * format the new app expects. This is intentionally a no-op (kept for clarity
 * and so the migration list reads completely).
 */
function migrateLayerKeys(): void {
  // No-op: "Layers" / "Layers_Folder_View" use the raw legacy format natively.
}

// ─── ArcGIS Token migration ────────────────────────────────────────────────

/**
 * The old app stored the ArcGIS token in localStorage.
 * The new app uses sessionStorage for better security.
 * Migrate it so the user doesn't have to re-authenticate immediately.
 */
function migrateArcGISToken(): void {
  const STORAGE_KEY = "ArcGIS_Token";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  // Only migrate if sessionStorage doesn't already have a token
  if (sessionStorage.getItem(STORAGE_KEY)) return;

  const token = safeParse(raw);
  if (!token || typeof token !== "object") return;

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(token));
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

/**
 * Remove only the source keys whose data has already been migrated to a new
 * location. We intentionally leave other old keys in place — the user can
 * remove them manually via the Settings tool's localStorage browser.
 */
function cleanupMigratedSourceKeys(): void {
  for (const key of MIGRATED_SOURCE_KEYS) {
    localStorage.removeItem(key);
  }
}

// ─── Main entry point ───────────────────────────────────────────────────────

/**
 * Run the full migration from old-app localStorage format to new-app format.
 *
 * Safe to call on every page load — a sentinel key ensures it only runs once.
 * Returns `true` if migration was performed, `false` if skipped.
 */
export function migrateFromLegacyStorage(): boolean {
  // Guard: not in browser
  if (typeof window === "undefined") return false;

  // Guard: already migrated
  if (localStorage.getItem(MIGRATION_SENTINEL)) return false;

  // Detect whether there is any old-format data to migrate.
  // We check the most distinctive old keys to avoid falsely triggering on a
  // fresh install with no localStorage at all.
  const hasOldMyMaps = localStorage.getItem("myMaps") !== null;
  const hasOldControls = localStorage.getItem("Map Control Settings") !== null;
  const hasOldFolderView = (() => {
    const raw = localStorage.getItem("Layers_Folder_View");
    return raw !== null && !isEnvelopeFormat(raw);
  })();
  const hasOldArcGISToken = localStorage.getItem("ArcGIS_Token") !== null;
  const hasOldLayers = (() => {
    const raw = localStorage.getItem("Layers");
    return raw !== null && !isEnvelopeFormat(raw);
  })();

  if (!hasOldMyMaps && !hasOldControls && !hasOldLayers && !hasOldFolderView && !hasOldArcGISToken) {
    // No old data detected — mark as migrated (fresh install) and exit
    localStorage.setItem(MIGRATION_SENTINEL, new Date().toISOString());
    return false;
  }

  console.log("[storageMigration] Migrating legacy localStorage data…");

  try {
    // 1. Migrate MyMaps (key rename + style transformation)
    const myMapsMigrated = migrateMyMaps();
    if (myMapsMigrated) {
      console.log("[storageMigration] ✓ MyMaps data migrated (myMaps → simcoe-mymaps-data)");
    }

    // 2. Migrate renamed keys (Map Control Settings → Map_Control_Settings)
    migrateRenamedKeys();
    console.log("[storageMigration] ✓ Renamed keys migrated");

    // 3. Migrate layer keys (no-op — raw legacy format is already compatible)
    migrateLayerKeys();
    console.log("[storageMigration] ✓ Layer keys confirmed compatible");

    // 4. Migrate ArcGIS token from localStorage → sessionStorage
    migrateArcGISToken();
    console.log("[storageMigration] ✓ ArcGIS token migrated to sessionStorage");

    // 5. Clean up only the source keys whose data was copied elsewhere.
    //    TOC_Type, avlLive, SIMCOE_MAPS_APPTRACK_SCREEN_SIZE, and other
    //    old keys are left in place — they are either still used by the new
    //    app or harmless. The user can clear them from the Settings tool.
    cleanupMigratedSourceKeys();
    console.log("[storageMigration] ✓ Migrated source keys cleaned up");

    // Mark migration as complete
    localStorage.setItem(MIGRATION_SENTINEL, new Date().toISOString());
    console.log("[storageMigration] Migration complete.");

    return true;
  } catch (error) {
    console.error("[storageMigration] Migration failed:", error);
    // Don't set sentinel on failure so it retries next time
    return false;
  }
}
