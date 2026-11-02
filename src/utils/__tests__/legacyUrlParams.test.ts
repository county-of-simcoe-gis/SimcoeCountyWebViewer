import { describe, it, expect } from "vitest";
import { getLegacyParam, selectLegendGroups } from "@/utils/legacyUrlParams";

describe("getLegacyParam", () => {
  it("matches parameter names case-insensitively", () => {
    expect(getLegacyParam("?url=abc&Show_Download=1", "URL")).toBe("abc");
    expect(getLegacyParam("?url=abc&Show_Download=1", "SHOW_DOWNLOAD")).toBe("1");
  });

  it("returns null when the parameter is missing", () => {
    expect(getLegacyParam("?a=1", "URL")).toBeNull();
  });

  it("decodes plus signs as spaces", () => {
    expect(getLegacyParam("?URL=Ganaraska+Trail.json", "URL")).toBe("Ganaraska Trail.json");
  });
});

describe("selectLegendGroups", () => {
  const groups = [
    { value: "Popular", label: "Popular" },
    { value: "Historical", label: "Historical" },
    { value: "All_Layers_Public", label: "All Layers Public" },
    { value: "simcoe:Topo_Overlay", label: "Topo Overlay" },
  ];

  it("selects groups set to 1", () => {
    expect(selectLegendGroups(groups, "?Popular=1&Historical=0").map((g) => g.value)).toEqual(["Popular"]);
  });

  it("matches names case-insensitively and ignores workspace prefixes", () => {
    expect(selectLegendGroups(groups, "?topo_overlay=1").map((g) => g.value)).toEqual(["simcoe:Topo_Overlay"]);
  });

  it("aliases the legacy All_Layers group", () => {
    expect(selectLegendGroups(groups, "?All_Layers=1").map((g) => g.value)).toEqual(["All_Layers_Public"]);
  });

  it("returns every group when no parameter selects one", () => {
    expect(selectLegendGroups(groups, "")).toEqual(groups);
    expect(selectLegendGroups(groups, "?Popular=0")).toEqual(groups);
    expect(selectLegendGroups(groups, "?Unknown=1")).toEqual(groups);
  });
});
