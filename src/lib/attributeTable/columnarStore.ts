/**
 * ColumnarStore
 * ----------------------------------------------------------------------------
 * Memory-efficient, append-only columnar store for WFS attribute rows.
 *
 * Motivation: the old React viewer held parsed OpenLayers Features in memory
 * (rows-of-objects) and ran out of heap on layers with tens of thousands of
 * features. This store keeps columns in TypedArrays when possible, de-dupes
 * repeated strings via an interning dictionary, and deliberately excludes
 * geometry (geometry is fetched on demand for selected rows only).
 *
 * Typical savings vs. `Feature[]`:
 *  - numeric/date columns: ~8× smaller (Float64Array vs. boxed Number)
 *  - repetitive string columns: 3–5× smaller after interning
 *  - no geometry: often 10× on polygon/line layers
 *
 * Public API is intentionally tiny — the store is a dumb container; sort,
 * filter, and render logic live elsewhere so they can be moved to a Web
 * Worker in a future pass without touching this file.
 */

export type ColumnType = "number" | "string" | "boolean" | "date";

export interface ColumnSchema {
  name: string;
  type: ColumnType;
  /** Display alias (ArcGIS layers only); grid headers prefer this over `name`. */
  alias?: string;
}

/** One column's backing storage. */
type ColumnData =
  | { kind: "number"; values: Float64Array; capacity: number }
  | { kind: "string"; indices: Uint32Array; dict: string[]; dictIndex: Map<string, number>; capacity: number }
  | { kind: "boolean"; values: Uint8Array; capacity: number } // 0 = false, 1 = true, 2 = null
  | { kind: "date"; values: Float64Array; capacity: number }; // ms epoch, NaN = null

const NULL_NUM = Number.NaN;

export interface ColumnarStoreStats {
  rows: number;
  columns: number;
  bytes: number;
}

export class ColumnarStore {
  readonly schema: ColumnSchema[];
  private columns = new Map<string, ColumnData>();
  private _fids: string[] = [];
  private _length = 0;
  private _capacity = 0;

  constructor(schema: ColumnSchema[], initialCapacity = 1024) {
    this.schema = schema;
    this._capacity = Math.max(16, initialCapacity);
    for (const col of schema) {
      this.columns.set(col.name, this.allocColumn(col.type, this._capacity));
    }
  }

  get length(): number {
    return this._length;
  }

  get fids(): readonly string[] {
    return this._fids;
  }

  /**
   * Append a page of features (as plain GeoJSON-style `{ id, properties }` objects).
   * Geometry is intentionally ignored.
   */
  appendPage(features: Array<{ id?: string | number; properties?: Record<string, unknown> | null }>): void {
    if (features.length === 0) return;
    this.ensureCapacity(this._length + features.length);

    for (const f of features) {
      const row = this._length;
      this._fids.push(String(f.id ?? row));
      const props = f.properties ?? {};

      for (const col of this.schema) {
        this.writeCell(col, row, props[col.name]);
      }
      this._length++;
    }
  }

  /** Read a cell as a display-friendly JS value (or null). */
  getCell(row: number, name: string): string | number | boolean | null {
    const c = this.columns.get(name);
    if (!c || row >= this._length) return null;
    switch (c.kind) {
      case "number": {
        const v = c.values[row];
        return Number.isNaN(v) ? null : v;
      }
      case "string": {
        const i = c.indices[row];
        return i === 0 ? null : c.dict[i];
      }
      case "boolean": {
        const v = c.values[row];
        return v === 2 ? null : v === 1;
      }
      case "date": {
        const v = c.values[row];
        return Number.isNaN(v) ? null : v;
      }
    }
  }

  /** Get an entire row as a plain object (allocates — prefer getCell in hot paths). */
  getRow(row: number): Record<string, string | number | boolean | null> {
    const out: Record<string, string | number | boolean | null> = {};
    for (const col of this.schema) out[col.name] = this.getCell(row, col.name);
    return out;
  }

  /** Coarse memory estimate in bytes. */
  stats(): ColumnarStoreStats {
    let bytes = 0;
    for (const c of this.columns.values()) {
      switch (c.kind) {
        case "number":
        case "date":
          bytes += c.values.byteLength;
          break;
        case "boolean":
          bytes += c.values.byteLength;
          break;
        case "string":
          bytes += c.indices.byteLength;
          for (const s of c.dict) bytes += s.length * 2; // approx UTF-16
          break;
      }
    }
    bytes += this._fids.reduce((a, s) => a + s.length * 2, 0);
    return { rows: this._length, columns: this.schema.length, bytes };
  }

  /** Release references so GC can reclaim the backing buffers. */
  dispose(): void {
    this.columns.clear();
    this._fids = [];
    this._length = 0;
    this._capacity = 0;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private allocColumn(type: ColumnType, cap: number): ColumnData {
    switch (type) {
      case "number":
        return { kind: "number", values: new Float64Array(cap).fill(NULL_NUM), capacity: cap };
      case "date":
        return { kind: "date", values: new Float64Array(cap).fill(NULL_NUM), capacity: cap };
      case "boolean":
        return { kind: "boolean", values: new Uint8Array(cap).fill(2), capacity: cap };
      case "string":
        // index 0 is reserved for null; dict[0] = "" sentinel
        return { kind: "string", indices: new Uint32Array(cap), dict: [""], dictIndex: new Map([["", 0]]), capacity: cap };
    }
  }

  private ensureCapacity(needed: number): void {
    if (needed <= this._capacity) return;
    let cap = this._capacity;
    while (cap < needed) cap *= 2;
    for (const [name, col] of this.columns) {
      this.columns.set(name, this.growColumn(col, cap));
    }
    this._capacity = cap;
  }

  private growColumn(c: ColumnData, cap: number): ColumnData {
    switch (c.kind) {
      case "number":
      case "date": {
        const next = new Float64Array(cap).fill(NULL_NUM);
        next.set(c.values);
        return { ...c, values: next, capacity: cap };
      }
      case "boolean": {
        const next = new Uint8Array(cap).fill(2);
        next.set(c.values);
        return { ...c, values: next, capacity: cap };
      }
      case "string": {
        const next = new Uint32Array(cap);
        next.set(c.indices);
        return { ...c, indices: next, capacity: cap };
      }
    }
  }

  private writeCell(col: ColumnSchema, row: number, raw: unknown): void {
    const c = this.columns.get(col.name)!;
    if (raw === null || raw === undefined) return; // leaves default null sentinel

    switch (c.kind) {
      case "number": {
        const n = typeof raw === "number" ? raw : Number(raw);
        c.values[row] = Number.isFinite(n) ? n : NULL_NUM;
        return;
      }
      case "date": {
        if (raw instanceof Date) {
          c.values[row] = raw.getTime();
        } else if (typeof raw === "number") {
          // ArcGIS/EsriJSON date fields arrive as raw epoch-millisecond
          // numbers (not ISO strings) — use directly rather than routing
          // through Date.parse(), which can't parse a bare numeric string.
          c.values[row] = Number.isFinite(raw) ? raw : NULL_NUM;
        } else {
          const t = Date.parse(String(raw));
          c.values[row] = Number.isFinite(t) ? t : NULL_NUM;
        }
        return;
      }
      case "boolean": {
        if (typeof raw === "boolean") c.values[row] = raw ? 1 : 0;
        else if (raw === "true" || raw === 1) c.values[row] = 1;
        else if (raw === "false" || raw === 0) c.values[row] = 0;
        return;
      }
      case "string": {
        const s = typeof raw === "string" ? raw : String(raw);
        if (s.length === 0) return; // keep null sentinel
        let idx = c.dictIndex.get(s);
        if (idx === undefined) {
          idx = c.dict.length;
          c.dict.push(s);
          c.dictIndex.set(s, idx);
        }
        c.indices[row] = idx;
        return;
      }
    }
  }
}

/**
 * Infer a ColumnSchema from a sample of GeoJSON features.
 * Falls back to `string` for ambiguous / mixed columns.
 */
export function inferSchema(features: Array<{ properties?: Record<string, unknown> | null }>, sampleSize = 50): ColumnSchema[] {
  const seen = new Map<string, { num: number; str: number; bool: number; date: number; nulls: number }>();
  const limit = Math.min(features.length, sampleSize);

  for (let i = 0; i < limit; i++) {
    const props = features[i]?.properties ?? {};
    for (const [name, v] of Object.entries(props)) {
      const rec = seen.get(name) ?? { num: 0, str: 0, bool: 0, date: 0, nulls: 0 };
      if (v === null || v === undefined) rec.nulls++;
      else if (typeof v === "boolean") rec.bool++;
      else if (typeof v === "number") rec.num++;
      else if (typeof v === "string") {
        // crude ISO-date sniff
        if (/^\d{4}-\d{2}-\d{2}(T|\s|$)/.test(v) && !Number.isNaN(Date.parse(v))) rec.date++;
        else rec.str++;
      } else rec.str++;
      seen.set(name, rec);
    }
  }

  const schema: ColumnSchema[] = [];
  for (const [name, rec] of seen) {
    const { num, str, bool, date } = rec;
    if (str === 0 && num > 0 && bool === 0 && date === 0) schema.push({ name, type: "number" });
    else if (str === 0 && num === 0 && bool > 0 && date === 0) schema.push({ name, type: "boolean" });
    else if (str === 0 && num === 0 && bool === 0 && date > 0) schema.push({ name, type: "date" });
    else schema.push({ name, type: "string" });
  }
  return schema;
}
