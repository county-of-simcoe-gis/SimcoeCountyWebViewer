import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getUserGroups } from "./microsoftGraph";

const OID = "11111111-2222-3333-4444-555555555555";

describe("getUserGroups", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("skips the Graph call for a non-GUID id such as a pairwise sub", async () => {
    const result = await getUserGroups("4w5rbp-VfaBM9Ibks15ZxwSbYDxSRESbZGNqrT-SmyI");
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an empty list on 404 without logging an error", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "t", token_type: "Bearer", expires_in: 3600 }) })
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => "not found" });

    const result = await getUserGroups(OID);

    expect(result).toEqual([]);
    expect(console.error).not.toHaveBeenCalled();
  });
});
