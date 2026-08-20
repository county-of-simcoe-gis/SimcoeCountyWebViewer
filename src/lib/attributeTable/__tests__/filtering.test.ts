import { describe, it, expect } from "vitest";
import { matchesColumnFilter } from "@/lib/attributeTable/filtering";
import type { ArcgisCodedValue } from "@/utils/arcgisFieldMetadata";

const MATERIAL_DOMAIN: Record<string, ArcgisCodedValue[]> = {
  material: [
    { name: "Polyvinyl Chloride", code: "PVC" },
    { name: "Ductile Iron", code: "DI" },
  ],
};

describe("matchesColumnFilter", () => {
  it("matches a domain-coded cell by the domain name", () => {
    expect(matchesColumnFilter(MATERIAL_DOMAIN, "MATERIAL", "PVC", "string", "polyvinyl")).toBe(true);
  });

  it("still matches a domain-coded cell by its raw code", () => {
    expect(matchesColumnFilter(MATERIAL_DOMAIN, "MATERIAL", "PVC", "string", "pvc")).toBe(true);
  });

  it("rejects a filter that matches neither name nor code", () => {
    expect(matchesColumnFilter(MATERIAL_DOMAIN, "MATERIAL", "PVC", "string", "steel")).toBe(false);
  });

  it("matches numeric-coded domains by both name and code", () => {
    const domains: Record<string, ArcgisCodedValue[]> = {
      diameter: [
        { name: "150 mm", code: 150 },
        { name: "300 mm", code: 300 },
      ],
    };
    expect(matchesColumnFilter(domains, "DIAMETER", 150, "number", "150 mm")).toBe(true);
    expect(matchesColumnFilter(domains, "DIAMETER", 150, "number", "150")).toBe(true);
    expect(matchesColumnFilter(domains, "DIAMETER", 150, "number", "300")).toBe(false);
  });

  it("resolves domains on qualified field names (DBO.layer.MATERIAL)", () => {
    const domains: Record<string, ArcgisCodedValue[]> = {
      "dbo.ssgravitymain.material": MATERIAL_DOMAIN.material,
    };
    expect(matchesColumnFilter(domains, "DBO.ssGravityMain.MATERIAL", "PVC", "string", "polyvinyl")).toBe(true);
  });

  it("falls back to raw formatted value when the cell has no matching code", () => {
    // Legacy value "HDPE" is not in the domain list — filter behaves as before.
    expect(matchesColumnFilter(MATERIAL_DOMAIN, "MATERIAL", "HDPE", "string", "hdp")).toBe(true);
  });

  it("matches only the raw value for columns without a domain", () => {
    const domains: Record<string, ArcgisCodedValue[]> = { owner: MATERIAL_DOMAIN.material };
    expect(matchesColumnFilter(domains, "MATERIAL", "PVC", "string", "polyvinyl")).toBe(false);
    expect(matchesColumnFilter(domains, "MATERIAL", "PVC", "string", "pvc")).toBe(true);
  });

  it("behaves like a plain text filter when domains is null (WFS layers)", () => {
    expect(matchesColumnFilter(null, "NAME", "Alpha St", "string", "alpha")).toBe(true);
    expect(matchesColumnFilter(null, "NAME", "Alpha St", "string", "beta")).toBe(false);
  });

  it('matches null/empty cells only against the "N/A" display text', () => {
    expect(matchesColumnFilter(MATERIAL_DOMAIN, "MATERIAL", null, "string", "n/a")).toBe(true);
    expect(matchesColumnFilter(MATERIAL_DOMAIN, "MATERIAL", null, "string", "polyvinyl")).toBe(false);
  });
});
