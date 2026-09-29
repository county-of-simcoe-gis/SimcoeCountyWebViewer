/// <reference lib="webworker" />

/**
 * Attribute Table Web Worker
 * ----------------------------------------------------------------------------
 * Runs off the main thread to keep the UI responsive when the user triggers
 * expensive operations on an attribute-table tab. Currently exposes:
 *
 *   - `parseGeoJson`: JSON.parse a WFS response and strip geometry. Used when
 *     the response is larger than a threshold (see wfs.ts). For typical 1000-
 *     row pages (~1–2 MB) main-thread parsing is fine and this message is not
 *     invoked; the worker is ready for future larger pages / chunk sizes.
 *
 *   - `exportCsv`: convert a columnar tab snapshot into a CSV Blob. This is
 *     the current hot path for large exports (100k rows) — doing it on the
 *     main thread causes multi-second freezes.
 *
 * Messages are request/response keyed by `id`. All errors are reported back
 * via a dedicated `error` type rather than throwing (which would kill the
 * worker).
 */

// ---------------------------------------------------------------------------
// Message protocol
// ---------------------------------------------------------------------------

export type WorkerRequest =
  | { kind: "parseGeoJson"; id: number; buffer: ArrayBuffer; keepGeometry?: boolean }
  | {
      kind: "exportCsv";
      id: number;
      /** Attribute column names in display order. */
      columns: string[];
      /** Column values already extracted by the store — worker just formats. */
      rows: Array<Array<string | number | boolean | null>>;
    };

export type WorkerResponse =
  | {
      kind: "parseGeoJson";
      id: number;
      features: Array<{ id?: string | number; properties: Record<string, unknown> | null; geometry?: unknown }>;
      numberMatched?: number;
      numberReturned: number;
    }
  | { kind: "exportCsv"; id: number; blob: Blob }
  | { kind: "error"; id: number; message: string };

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const decoder = new TextDecoder("utf-8");

function handleParseGeoJson(msg: Extract<WorkerRequest, { kind: "parseGeoJson" }>): WorkerResponse {
  try {
    const text = decoder.decode(new Uint8Array(msg.buffer));
    if (text.startsWith("<?xml") || /<ows:ExceptionReport/i.test(text.slice(0, 200))) {
      return { kind: "error", id: msg.id, message: "WFS returned an XML exception." };
    }
    const json = JSON.parse(text) as {
      features?: Array<{ id?: string | number; properties?: Record<string, unknown> | null; geometry?: unknown }>;
      numberMatched?: number | string;
      numberReturned?: number | string;
      totalFeatures?: number | string;
    };
    const features = (json.features ?? []).map((f) => ({
      id: f.id,
      properties: f.properties ?? {},
      geometry: msg.keepGeometry ? f.geometry : undefined,
    }));
    const n = json.numberMatched ?? json.totalFeatures;
    return {
      kind: "parseGeoJson",
      id: msg.id,
      features,
      numberMatched: typeof n === "number" ? n : typeof n === "string" ? Number(n) : undefined,
      numberReturned: features.length,
    };
  } catch (e) {
    return { kind: "error", id: msg.id, message: (e as Error).message };
  }
}

function csvEscape(v: string | number | boolean | null): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function handleExportCsv(msg: Extract<WorkerRequest, { kind: "exportCsv" }>): WorkerResponse {
  try {
    // Build the CSV as an array of string chunks to avoid a giant concatenation
    // cost. Joining once at the end is O(n) and avoids the quadratic hazard of
    // repeated `str += line`.
    const parts: string[] = [];
    parts.push(msg.columns.map(csvEscape).join(","));
    const rows = msg.rows;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Manual loop is ~2× faster than row.map(csvEscape) in V8 for large N.
      let line = "";
      for (let c = 0; c < row.length; c++) {
        if (c > 0) line += ",";
        line += csvEscape(row[c]);
      }
      parts.push(line);
    }
    const blob = new Blob([parts.join("\n")], { type: "text/csv;charset=utf-8" });
    return { kind: "exportCsv", id: msg.id, blob };
  } catch (e) {
    return { kind: "error", id: msg.id, message: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

self.addEventListener("message", (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  let res: WorkerResponse;
  switch (msg.kind) {
    case "parseGeoJson":
      res = handleParseGeoJson(msg);
      break;
    case "exportCsv":
      res = handleExportCsv(msg);
      break;
    default: {
      const _exhaustive: never = msg;
      void _exhaustive;
      res = { kind: "error", id: (msg as { id: number }).id, message: "Unknown message kind" };
    }
  }
  (self as unknown as Worker).postMessage(res);
});

export {}; // ensure this file is a module
