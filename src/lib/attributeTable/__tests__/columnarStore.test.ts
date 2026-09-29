import { describe, it, expect } from "vitest";
import { ColumnarStore, inferSchema } from "@/lib/attributeTable/columnarStore";

describe("ColumnarStore", () => {
  const sample = [
    { id: "a", properties: { name: "Alpha", pop: 1000, active: true, created: "2024-01-01T00:00:00Z" } },
    { id: "b", properties: { name: "Beta", pop: 2000, active: false, created: "2024-02-01T00:00:00Z" } },
    { id: "c", properties: { name: "Alpha", pop: 3000, active: null, created: null } },
  ];

  it("infers schema for mixed primitive columns", () => {
    const schema = inferSchema(sample);
    const byName = Object.fromEntries(schema.map((s) => [s.name, s.type]));
    expect(byName).toMatchObject({
      name: "string",
      pop: "number",
      active: "boolean",
      created: "date",
    });
  });

  it("round-trips values and interns duplicate strings", () => {
    const schema = inferSchema(sample);
    const store = new ColumnarStore(schema);
    store.appendPage(sample);

    expect(store.length).toBe(3);
    expect(store.fids).toEqual(["a", "b", "c"]);
    expect(store.getCell(0, "name")).toBe("Alpha");
    expect(store.getCell(1, "name")).toBe("Beta");
    expect(store.getCell(2, "name")).toBe("Alpha");
    expect(store.getCell(0, "pop")).toBe(1000);
    expect(store.getCell(1, "active")).toBe(false);
    expect(store.getCell(2, "active")).toBeNull();
    expect(store.getCell(2, "created")).toBeNull();

    const created0 = store.getCell(0, "created");
    expect(typeof created0).toBe("number");
    expect(new Date(created0 as number).toISOString()).toBe("2024-01-01T00:00:00.000Z");
  });

  it("stores a pre-declared 'date' column whose raw values are already epoch-ms numbers (e.g. ArcGIS/EsriJSON)", () => {
    // ArcGIS field metadata declares the column type up front (see arcgis.ts
    // esriTypeToColumnType), so the schema is "date" even though the raw
    // feature attribute is a plain epoch-ms number, not an ISO string.
    const esriSchema = [{ name: "Effective_", type: "date" as const }];
    const store = new ColumnarStore(esriSchema);
    store.appendPage([{ id: 1, properties: { Effective_: 1668470400000 } }]);

    expect(store.getCell(0, "Effective_")).toBe(1668470400000);
  });

  it("grows capacity beyond initial allocation", () => {
    const schema = inferSchema(sample);
    const store = new ColumnarStore(schema, 2);
    const big = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      properties: { name: `N${i % 3}`, pop: i, active: i % 2 === 0, created: "2024-01-01T00:00:00Z" },
    }));
    store.appendPage(big);
    expect(store.length).toBe(50);
    expect(store.getCell(49, "pop")).toBe(49);
    expect(store.getCell(49, "name")).toBe("N1"); // 49 % 3 = 1
  });

  it("dispose clears all state", () => {
    const store = new ColumnarStore(inferSchema(sample));
    store.appendPage(sample);
    store.dispose();
    expect(store.length).toBe(0);
    expect(store.getCell(0, "name")).toBeNull();
  });

  it("reports non-zero memory stats", () => {
    const store = new ColumnarStore(inferSchema(sample));
    store.appendPage(sample);
    const s = store.stats();
    expect(s.rows).toBe(3);
    expect(s.columns).toBe(4);
    expect(s.bytes).toBeGreaterThan(0);
  });
});
