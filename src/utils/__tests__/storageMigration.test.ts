import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  migrateFromLegacyStorage,
  isOldOLStyleFormat,
  transformOLStyle,
} from "../storageMigration";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Parse an envelope-wrapped localStorage value */
function parseEnvelope(key: string) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

// ─── setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

// ─── isOldOLStyleFormat ─────────────────────────────────────────────────────

describe("isOldOLStyleFormat", () => {
  it("returns true for OL-style objects with underscore-suffixed keys", () => {
    expect(isOldOLStyleFormat({ fill_: { color_: [255, 0, 0, 1] } })).toBe(true);
    expect(isOldOLStyleFormat({ stroke_: { color_: [0, 0, 0, 1], width_: 2 } })).toBe(true);
  });

  it("returns false for clean StyleJSON objects", () => {
    expect(isOldOLStyleFormat({ fill: { color: [255, 0, 0, 1] } })).toBe(false);
  });

  it("returns false for null / undefined / non-objects", () => {
    expect(isOldOLStyleFormat(null)).toBe(false);
    expect(isOldOLStyleFormat(undefined)).toBe(false);
    expect(isOldOLStyleFormat("string")).toBe(false);
    expect(isOldOLStyleFormat(42)).toBe(false);
  });
});

// ─── transformOLStyle ───────────────────────────────────────────────────────

describe("transformOLStyle", () => {
  it("transforms fill/stroke", () => {
    const result = transformOLStyle({
      fill_: { color_: [232, 9, 229, 0.8] },
      stroke_: { color_: [0, 0, 0, 1], width_: 3, lineDash_: [5, 10] },
    });

    expect(result).toEqual({
      fill: { color: [232, 9, 229, 0.8] },
      stroke: { color: [0, 0, 0, 1], width: 3, lineDash: [5, 10] },
    });
  });

  it("transforms circle image style", () => {
    const result = transformOLStyle({
      image_: {
        radius_: 5,
        fill_: { color_: [255, 0, 0, 1] },
        stroke_: { color_: [0, 0, 0, 1], width_: 1 },
      },
    });

    expect(result).toEqual({
      image: {
        type: "circle",
        radius: 5,
        fill: { color: [255, 0, 0, 1] },
        stroke: { color: [0, 0, 0, 1], width: 1 },
      },
    });
  });

  it("transforms regularShape image style (with points_)", () => {
    const result = transformOLStyle({
      image_: {
        radius_: 6,
        points_: 4,
        fill_: { color_: [0, 128, 0, 1] },
      },
    });

    expect(result).toEqual({
      image: {
        type: "regularShape",
        radius: 6,
        points: 4,
        fill: { color: [0, 128, 0, 1] },
      },
    });
  });

  it("transforms icon image style (with src_)", () => {
    const result = transformOLStyle({
      image_: {
        src_: "https://example.com/icon.png",
        scale_: 0.5,
      },
    });

    expect(result).toEqual({
      image: {
        type: "icon",
        src: "https://example.com/icon.png",
        scale: 0.5,
      },
    });
  });

  it("transforms text style", () => {
    const result = transformOLStyle({
      text_: {
        text_: "Hello",
        font_: "14px sans-serif",
        fill_: { color_: [255, 255, 255, 1] },
        stroke_: { color_: [0, 0, 0, 1], width_: 2 },
      },
    });

    expect(result).toEqual({
      text: {
        text: "Hello",
        font: "14px sans-serif",
        fill: { color: [255, 255, 255, 1] },
        stroke: { color: [0, 0, 0, 1], width: 2 },
      },
    });
  });

  it("returns empty object for empty style", () => {
    expect(transformOLStyle({})).toEqual({});
  });
});

// ─── migrateFromLegacyStorage ───────────────────────────────────────────────

describe("migrateFromLegacyStorage", () => {
  it("returns false on a fresh install with no old data", () => {
    const result = migrateFromLegacyStorage();
    expect(result).toBe(false);
    // Sentinel should still be set to prevent future checks
    expect(localStorage.getItem("__storage_migrated_v1")).toBeTruthy();
  });

  it("returns false when sentinel is already present", () => {
    localStorage.setItem("__storage_migrated_v1", "2025-01-01T00:00:00.000Z");
    localStorage.setItem("myMaps", JSON.stringify({ items: [] }));

    const result = migrateFromLegacyStorage();
    expect(result).toBe(false);
    // Old data untouched
    expect(localStorage.getItem("myMaps")).toBeTruthy();
  });

  // ─── MyMaps migration ──────────────────────────────────────────────

  it("migrates myMaps key to simcoe-mymaps-data with style transformation", () => {
    const oldItem = {
      id: "abc123",
      label: "Drawing 1",
      labelVisible: true,
      labelRotation: 0,
      labelStyle: { textColor: "#ffffff", textSize: "14px", outlineColor: "#000000", outlineWidth: 2 },
      featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[-8878504,5543492]}}',
      style: {
        fill_: { color_: [232, 9, 229, 0.8] },
        stroke_: { color_: [0, 0, 0, 1], width_: 3 },
        image_: {
          fill_: { color_: [232, 9, 229, 0.8] },
          stroke_: { color_: [0, 0, 0, 1], width_: 1 },
          radius_: 4,
        },
      },
      visible: true,
      drawType: "Point",
      geometryType: "Point",
      pointType: "circle",
      strokeType: "normal",
      hasChanged: true, // should be dropped
    };

    const oldData = {
      drawType: "Cancel",
      drawColor: "#ff0000",
      drawOpacity: 0.5,
      items: [oldItem],
    };

    localStorage.setItem("myMaps", JSON.stringify(oldData));

    const result = migrateFromLegacyStorage();
    expect(result).toBe(true);

    const newRaw = localStorage.getItem("simcoe-mymaps-data");
    expect(newRaw).toBeTruthy();

    const newData = JSON.parse(newRaw!);
    expect(newData.drawColor).toBe("#ff0000");
    expect(newData.drawOpacity).toBe(0.5);
    expect(newData.drawingCounter).toBe(2);
    expect(newData.items).toHaveLength(1);

    const item = newData.items[0];
    // Style should be transformed to clean format
    expect(item.style).toEqual({
      fill: { color: [232, 9, 229, 0.8] },
      stroke: { color: [0, 0, 0, 1], width: 3 },
      image: {
        type: "circle",
        radius: 4,
        fill: { color: [232, 9, 229, 0.8] },
        stroke: { color: [0, 0, 0, 1], width: 1 },
      },
    });

    // Alpha values extracted from old RGBA
    expect(item.fillAlpha).toBe(0.8);
    expect(item.strokeAlpha).toBe(1);

    // hasChanged should be dropped
    expect(item.hasChanged).toBeUndefined();

    // Old key should be cleaned up
    expect(localStorage.getItem("myMaps")).toBeNull();
  });

  it("does not overwrite existing simcoe-mymaps-data", () => {
    localStorage.setItem("myMaps", JSON.stringify({ items: [{ id: "old" }] }));
    localStorage.setItem("simcoe-mymaps-data", JSON.stringify({ items: [{ id: "new" }] }));

    migrateFromLegacyStorage();

    const data = JSON.parse(localStorage.getItem("simcoe-mymaps-data")!);
    expect(data.items[0].id).toBe("new"); // preserved, not overwritten
  });

  // ─── Renamed key migration ─────────────────────────────────────────

  it("migrates 'Map Control Settings' to 'Map_Control_Settings'", () => {
    const controls = {
      rotate: false,
      fullScreen: true,
      zoomInOut: true,
      currentLocation: true,
    };
    localStorage.setItem("Map Control Settings", JSON.stringify(controls));

    migrateFromLegacyStorage();

    const newRaw = localStorage.getItem("Map_Control_Settings");
    expect(newRaw).toBeTruthy();
    expect(JSON.parse(newRaw!)).toEqual(controls);

    // Old key cleaned up
    expect(localStorage.getItem("Map Control Settings")).toBeNull();
  });

  // ─── Envelope wrapping ─────────────────────────────────────────────

  it("wraps raw searchHistory array in storage envelope", () => {
    const history = [{ name: "test", dateAdded: "1/1/2025" }];
    localStorage.setItem("searchHistory", JSON.stringify(history));

    migrateFromLegacyStorage();

    const parsed = parseEnvelope("searchHistory");
    expect(parsed.value).toEqual(history);
    expect(parsed.expires).toBeNull();
    expect(typeof parsed.timestamp).toBe("number");
  });

  // ─── Layer key consolidation ─────────────────────────────────────

  it("wraps raw Layers object in storage envelope", () => {
    const layers = {
      "simcoe:Emergency Services": {
        name: "Emergency",
        value: "simcoe:Emergency Services",
        layers: { "Fire Stations": { visible: true, opacity: 1, index: 0 } },
      },
    };
    localStorage.setItem("Layers", JSON.stringify(layers));

    migrateFromLegacyStorage();

    const parsed = parseEnvelope("Layers");
    expect(parsed.value).toEqual(layers);
  });

  it("migrates Layers_Folder_View into Layers when TOC_Type is FOLDER", () => {
    const folderData = {
      "simcoe:Emergency": { label: "Emergency", layers: { "Fire Stations": { visible: true, opacity: 1, index: 0 } } },
    };
    localStorage.setItem("TOC_Type", "FOLDER");
    localStorage.setItem("Layers_Folder_View", JSON.stringify(folderData));

    migrateFromLegacyStorage();

    const parsed = parseEnvelope("Layers");
    expect(parsed.value).toEqual(folderData);
    // Folder view source key cleaned up
    expect(localStorage.getItem("Layers_Folder_View")).toBeNull();
  });

  it("prefers list-view Layers when TOC_Type is LIST", () => {
    const listData = { "group1": { label: "Group 1", layers: { "L1": { visible: true, opacity: 1, index: 0 } } } };
    const folderData = { "group2": { label: "Group 2", layers: { "L2": { visible: false, opacity: 0.5, index: 1 } } } };
    localStorage.setItem("TOC_Type", "LIST");
    localStorage.setItem("Layers", JSON.stringify(listData));
    localStorage.setItem("Layers_Folder_View", JSON.stringify(folderData));

    migrateFromLegacyStorage();

    const parsed = parseEnvelope("Layers");
    // Primary is list data, but folder groups not in list are also merged
    expect(parsed.value["group1"]).toEqual(listData["group1"]);
    expect(parsed.value["group2"]).toEqual(folderData["group2"]);
  });

  it("merges folder-view groups into list-view data when both exist (FOLDER mode)", () => {
    const listData = { "shared": { label: "Shared", layers: { "L1": { visible: true, opacity: 1, index: 0 } } } };
    const folderData = {
      "shared": { label: "Shared Folder", layers: { "L1": { visible: false, opacity: 0.5, index: 0 } } },
      "folder-only": { label: "Folder Only", layers: {} },
    };
    localStorage.setItem("TOC_Type", "FOLDER");
    localStorage.setItem("Layers", JSON.stringify(listData));
    localStorage.setItem("Layers_Folder_View", JSON.stringify(folderData));

    migrateFromLegacyStorage();

    const parsed = parseEnvelope("Layers");
    // FOLDER is primary, so "shared" comes from folderData
    expect(parsed.value["shared"].label).toBe("Shared Folder");
    expect(parsed.value["folder-only"]).toEqual(folderData["folder-only"]);
  });

  it("uses Layers_Folder_View even when TOC_Type is LIST if no Layers key exists", () => {
    const folderData = { "g1": { label: "G1", layers: {} } };
    localStorage.setItem("Layers_Folder_View", JSON.stringify(folderData));
    // No TOC_Type set, no "Layers" key

    migrateFromLegacyStorage();

    const parsed = parseEnvelope("Layers");
    expect(parsed.value).toEqual(folderData);
  });

  it("wraps raw sc_dontshowagain array in storage envelope", () => {
    const urls = [{ url: "https://example.com", dateAdded: "1/1/2025" }];
    localStorage.setItem("sc_dontshowagain", JSON.stringify(urls));

    migrateFromLegacyStorage();

    const parsed = parseEnvelope("sc_dontshowagain");
    expect(parsed.value).toEqual(urls);
  });

  it("does not re-wrap already-enveloped data", () => {
    const enveloped = { value: [{ name: "test" }], expires: null, timestamp: 1234567890 };
    localStorage.setItem("searchHistory", JSON.stringify(enveloped));

    // Need some other old key to trigger migration
    localStorage.setItem("Map Control Settings", JSON.stringify({ rotate: false }));

    migrateFromLegacyStorage();

    const parsed = parseEnvelope("searchHistory");
    // Timestamp should be preserved from original envelope, not overwritten
    expect(parsed.timestamp).toBe(1234567890);
  });

  // ─── Migrated source key cleanup ────────────────────────────────

  it("cleans up only migrated source keys, not all old keys", () => {
    // Set keys whose data gets migrated elsewhere
    localStorage.setItem("myMaps", JSON.stringify({ items: [], drawColor: "#e809e5", drawOpacity: 0.8 }));
    localStorage.setItem("Map Control Settings", JSON.stringify({ rotate: false }));
    localStorage.setItem("Layers_Folder_View", JSON.stringify({ g: {} }));
    localStorage.setItem("ArcGIS_Token", JSON.stringify({ accessToken: "abc" }));

    // Set keys that should be PRESERVED (still used or harmless)
    localStorage.setItem("TOC_Type", "LIST");
    localStorage.setItem("Saved Basemap Options", JSON.stringify({ topo: true }));
    localStorage.setItem("Saved Layers", JSON.stringify({}));
    localStorage.setItem("My Saved Layers - List View", JSON.stringify({}));
    localStorage.setItem("My Save Layers - Folder View", JSON.stringify({}));
    localStorage.setItem("Settings", JSON.stringify({}));
    localStorage.setItem("cacheVersion", "1.1.18");
    localStorage.setItem("theme-real-estate", JSON.stringify([]));

    migrateFromLegacyStorage();

    // Migrated source keys should be removed
    expect(localStorage.getItem("myMaps")).toBeNull();
    expect(localStorage.getItem("Map Control Settings")).toBeNull();
    expect(localStorage.getItem("Layers_Folder_View")).toBeNull();
    expect(localStorage.getItem("ArcGIS_Token")).toBeNull();

    // These keys should still exist (not aggressively deleted)
    expect(localStorage.getItem("TOC_Type")).toBe("LIST");
    expect(localStorage.getItem("Saved Basemap Options")).toBeTruthy();
    expect(localStorage.getItem("Saved Layers")).toBeTruthy();
    expect(localStorage.getItem("My Saved Layers - List View")).toBeTruthy();
    expect(localStorage.getItem("My Save Layers - Folder View")).toBeTruthy();
    expect(localStorage.getItem("Settings")).toBeTruthy();
    expect(localStorage.getItem("cacheVersion")).toBe("1.1.18");
    expect(localStorage.getItem("theme-real-estate")).toBeTruthy();
  });

  // ─── TOC_Type preservation ─────────────────────────────────────────

  it("preserves TOC_Type across migration", () => {
    localStorage.setItem("TOC_Type", "FOLDER");
    localStorage.setItem("Layers_Folder_View", JSON.stringify({ g: {} }));

    migrateFromLegacyStorage();

    expect(localStorage.getItem("TOC_Type")).toBe("FOLDER");
  });

  // ─── ArcGIS Token migration ────────────────────────────────────────

  it("migrates ArcGIS_Token from localStorage to sessionStorage", () => {
    const token = { accessToken: "abc123", expiresAt: 9999999999, username: "user" };
    localStorage.setItem("ArcGIS_Token", JSON.stringify(token));

    migrateFromLegacyStorage();

    // Token should be in sessionStorage now
    const sessionToken = JSON.parse(sessionStorage.getItem("ArcGIS_Token")!);
    expect(sessionToken).toEqual(token);

    // Old localStorage key should be cleaned up
    expect(localStorage.getItem("ArcGIS_Token")).toBeNull();
  });

  it("does not overwrite existing sessionStorage ArcGIS_Token", () => {
    const oldToken = { accessToken: "old", username: "old-user" };
    const newToken = { accessToken: "new", username: "new-user" };
    localStorage.setItem("ArcGIS_Token", JSON.stringify(oldToken));
    sessionStorage.setItem("ArcGIS_Token", JSON.stringify(newToken));

    migrateFromLegacyStorage();

    // Session token preserved
    expect(JSON.parse(sessionStorage.getItem("ArcGIS_Token")!)).toEqual(newToken);
  });

  // ─── Preserves compatible keys ─────────────────────────────────────

  it("preserves avlLive and SIMCOE_MAPS_APPTRACK_SCREEN_SIZE", () => {
    const avl = { groups: [], selectedSortOption: "name", sortAscendingChecked: true, showLabels: false };
    const screenSize = [1920, 1080];

    localStorage.setItem("avlLive", JSON.stringify(avl));
    localStorage.setItem("SIMCOE_MAPS_APPTRACK_SCREEN_SIZE", JSON.stringify(screenSize));

    // Trigger migration
    localStorage.setItem("Map Control Settings", JSON.stringify({ rotate: false }));
    migrateFromLegacyStorage();

    expect(JSON.parse(localStorage.getItem("avlLive")!)).toEqual(avl);
    expect(JSON.parse(localStorage.getItem("SIMCOE_MAPS_APPTRACK_SCREEN_SIZE")!)).toEqual(screenSize);
  });

  // ─── MyMaps with already-clean styles ──────────────────────────────

  it("handles myMaps items that already have clean StyleJSON", () => {
    const cleanItem = {
      id: "xyz",
      label: "Drawing 1",
      labelVisible: true,
      labelRotation: 0,
      featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
      style: {
        fill: { color: [255, 0, 0, 1] },
        stroke: { color: [0, 0, 0, 1], width: 2 },
      },
      visible: true,
      drawType: "Point",
      geometryType: "Point",
    };

    localStorage.setItem("myMaps", JSON.stringify({ items: [cleanItem], drawColor: "#e809e5", drawOpacity: 0.8 }));

    migrateFromLegacyStorage();

    const data = JSON.parse(localStorage.getItem("simcoe-mymaps-data")!);
    // Style should be passed through unchanged
    expect(data.items[0].style).toEqual({
      fill: { color: [255, 0, 0, 1] },
      stroke: { color: [0, 0, 0, 1], width: 2 },
    });
  });

  // ─── Full end-to-end scenario ──────────────────────────────────────

  it("handles a full migration scenario with all key types", () => {
    // Old MyMaps data
    localStorage.setItem("myMaps", JSON.stringify({
      items: [{
        id: "item1",
        label: "Drawing 1",
        labelVisible: true,
        labelRotation: 0,
        featureGeoJSON: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}',
        style: { fill_: { color_: [255, 0, 0, 0.5] }, stroke_: { color_: [0, 0, 0, 1], width_: 2 } },
        visible: true,
        drawType: "Polygon",
        geometryType: "Polygon",
      }],
      drawColor: "#00ff00",
      drawOpacity: 0.6,
    }));

    // Old controls
    localStorage.setItem("Map Control Settings", JSON.stringify({ rotate: true, fullScreen: false }));

    // Old search history (raw)
    localStorage.setItem("searchHistory", JSON.stringify([{ name: "Barrie", dateAdded: "1/1/2025" }]));

    // Old layers (raw) — list and folder views
    localStorage.setItem("TOC_Type", "FOLDER");
    localStorage.setItem("Layers", JSON.stringify({ "group1": { label: "G1", layers: {} } }));
    localStorage.setItem("Layers_Folder_View", JSON.stringify({ "group2": { label: "G2", layers: {} } }));

    // Old dont-show (raw)
    localStorage.setItem("sc_dontshowagain", JSON.stringify([{ url: "https://help.com" }]));

    // Old ArcGIS token
    localStorage.setItem("ArcGIS_Token", JSON.stringify({ accessToken: "tok123" }));

    // Keys the migration should NOT delete
    localStorage.setItem("cacheVersion", "1.1.18");
    localStorage.setItem("Saved Basemap Options", JSON.stringify({ topo: true }));

    // Compatible keys (should be preserved as-is)
    localStorage.setItem("avlLive", JSON.stringify({ groups: [] }));

    const result = migrateFromLegacyStorage();
    expect(result).toBe(true);

    // Verify MyMaps migrated
    expect(localStorage.getItem("simcoe-mymaps-data")).toBeTruthy();
    expect(localStorage.getItem("myMaps")).toBeNull();

    // Verify controls migrated
    expect(localStorage.getItem("Map_Control_Settings")).toBeTruthy();
    expect(localStorage.getItem("Map Control Settings")).toBeNull();

    // Verify envelope wrapping
    expect(parseEnvelope("searchHistory").value).toEqual([{ name: "Barrie", dateAdded: "1/1/2025" }]);
    expect(parseEnvelope("sc_dontshowagain").value).toEqual([{ url: "https://help.com" }]);

    // Verify layer consolidation (FOLDER mode: folder data is primary, list groups merged)
    const layersParsed = parseEnvelope("Layers");
    expect(layersParsed.value["group2"]).toEqual({ label: "G2", layers: {} });
    expect(layersParsed.value["group1"]).toEqual({ label: "G1", layers: {} }); // merged from list

    // Verify TOC_Type preserved
    expect(localStorage.getItem("TOC_Type")).toBe("FOLDER");

    // Verify Layers_Folder_View cleaned up (data merged into Layers)
    expect(localStorage.getItem("Layers_Folder_View")).toBeNull();

    // Verify ArcGIS token moved to sessionStorage
    expect(sessionStorage.getItem("ArcGIS_Token")).toBeTruthy();
    expect(localStorage.getItem("ArcGIS_Token")).toBeNull();

    // Verify old keys that have no new-app counterpart are NOT deleted
    expect(localStorage.getItem("cacheVersion")).toBe("1.1.18");
    expect(localStorage.getItem("Saved Basemap Options")).toBeTruthy();

    // Verify compatible keys preserved
    expect(JSON.parse(localStorage.getItem("avlLive")!)).toEqual({ groups: [] });

    // Verify sentinel set
    expect(localStorage.getItem("__storage_migrated_v1")).toBeTruthy();
  });

  // ─── Detection triggers ────────────────────────────────────────────

  it("detects Layers_Folder_View as trigger for migration", () => {
    // No renamed keys, no raw envelope keys, but folder view exists
    localStorage.setItem("Layers_Folder_View", JSON.stringify({ g: { layers: {} } }));

    const result = migrateFromLegacyStorage();
    expect(result).toBe(true);
    expect(parseEnvelope("Layers")).toBeTruthy();
  });

  it("detects ArcGIS_Token in localStorage as trigger for migration", () => {
    localStorage.setItem("ArcGIS_Token", JSON.stringify({ accessToken: "x" }));

    const result = migrateFromLegacyStorage();
    expect(result).toBe(true);
    expect(sessionStorage.getItem("ArcGIS_Token")).toBeTruthy();
  });
});
