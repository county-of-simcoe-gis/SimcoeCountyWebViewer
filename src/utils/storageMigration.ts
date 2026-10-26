import { getStorageItem, removeStorageItem, setStorageItem } from "@/utils/storage";

/**
 * Legacy style compatibility helpers.
 *
 * The old SimcoeCountyWebViewer apps serialized OpenLayers style instances by
 * stringifying their internal `_`-suffixed properties. The NextJS app uses a
 * cleaner JSON shape internally, so MyMaps load/import paths normalize the old
 * style structure through the helpers in this module.
 */

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
  return keys.some((key) => key.endsWith("_"));
}

/**
 * Convert an OL internal style serialization to the clean JSON format used by
 * the NextJS MyMaps store.
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
    const imageType: "circle" | "regularShape" | "icon" = img.src_ ? "icon" : img.points_ != null ? "regularShape" : "circle";

    result.image = { type: imageType };

    if (img.radius_ !== undefined) result.image.radius = img.radius_;
    if (img.fill_?.color_) result.image.fill = { color: img.fill_.color_ };
    if (img.stroke_) {
      result.image.stroke = { color: img.stroke_.color_ ?? [0, 0, 0, 1] };
      if (img.stroke_.width_ !== undefined) result.image.stroke.width = img.stroke_.width_;
      if (img.stroke_.lineDash_) result.image.stroke.lineDash = img.stroke_.lineDash_;
    }
    if (img.points_ != null) result.image.points = img.points_;
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

// ---------------------------------------------------------------------------
// Versioned localStorage rules
// ---------------------------------------------------------------------------

export type StorageMigrationAction =
  | { type: "removeKey"; key: string }
  | { type: "setKey"; key: string; value: string }
  | { type: "removeField"; key: string; field: string }
  | { type: "setField"; key: string; field: string; value: unknown };

export interface StorageMigration {
  version: string;
  description: string;
  actions: StorageMigrationAction[];
}

export const STORAGE_VERSION_KEY = "currentVersion";
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";

// Add rules here. Each runs once for users upgrading from an older version; order does not matter.
export const STORAGE_MIGRATIONS: StorageMigration[] = [
  {
    version: "2.0.7",
    description: "Imagery is saved by name; clear the legacy slider index",
    actions: [
      // Must match BASEMAP_STORAGE_KEY in BasemapSwitcher.tsx.
      { type: "removeField", key: "Saved Basemap Options", field: "imagerySliderValue" },
      { type: "removeField", key: "Saved Basemap Options", field: "imageryServiceName" },
    ],
  },
];

/** Compares dotted numeric versions; missing segments count as zero. */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map((part) => parseInt(part, 10) || 0);
  const partsB = b.split(".").map((part) => parseInt(part, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < length; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function parseObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function applyStorageAction(action: StorageMigrationAction): void {
  if (action.type === "removeKey") {
    if (getStorageItem(action.key) !== null) removeStorageItem(action.key);
    return;
  }
  if (action.type === "setKey") {
    setStorageItem(action.key, action.value);
    return;
  }

  const stored = getStorageItem(action.key);
  if (stored === null) return;
  const data = parseObject(stored);
  if (!data) {
    console.warn(`[StorageMigration] "${action.key}" is not a JSON object; skipped`);
    return;
  }
  if (action.type === "removeField") {
    if (!(action.field in data)) return;
    delete data[action.field];
  } else {
    data[action.field] = action.value;
  }
  setStorageItem(action.key, JSON.stringify(data));
}

export interface RunStorageMigrationsOptions {
  appVersion?: string;
  migrations?: StorageMigration[];
}

/**
 * Applies every rule newer than the stored currentVersion, up to appVersion.
 * A missing currentVersion is treated as 0.0.0, so all rules apply to it.
 * Returns the currentVersion that was stored before this call, or null if none.
 */
export function runStorageMigrations({ appVersion = APP_VERSION, migrations = STORAGE_MIGRATIONS }: RunStorageMigrationsOptions = {}): string | null {
  const previousVersion = getStorageItem(STORAGE_VERSION_KEY);
  const storedVersion = previousVersion ?? "0.0.0";
  if (compareVersions(storedVersion, appVersion) >= 0) return previousVersion;

  const pending = migrations
    .filter((migration) => compareVersions(migration.version, storedVersion) > 0 && compareVersions(migration.version, appVersion) <= 0)
    .sort((a, b) => compareVersions(a.version, b.version));

  try {
    pending.forEach((migration) => migration.actions.forEach(applyStorageAction));
  } catch (error) {
    console.error("[StorageMigration] Failed; will retry on next load:", error);
    return previousVersion;
  }

  setStorageItem(STORAGE_VERSION_KEY, appVersion);
  return previousVersion;
}
