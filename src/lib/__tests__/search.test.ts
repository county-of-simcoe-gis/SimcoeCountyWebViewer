import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  selectAllWithValues: vi.fn(),
  selectAll: vi.fn(),
}));

vi.mock("@/lib/database/connections", () => ({
  pgTabular: {
    selectAllWithValues: dbMocks.selectAllWithValues,
    selectAll: dbMocks.selectAll,
  },
}));

import { search } from "@/lib/services/search";

describe("search", () => {
  beforeEach(() => {
    dbMocks.selectAllWithValues.mockResolvedValue([]);
    dbMocks.selectAll.mockResolvedValue([]);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("Access denied", {
            status: 403,
            headers: { "content-type": "text/plain" },
          }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty result set when OSM responds with non-JSON text", async () => {
    const result = await search("customer", "All", undefined, 100);

    expect(result).toEqual([]);
    expect(dbMocks.selectAllWithValues).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalled();
  });
});
