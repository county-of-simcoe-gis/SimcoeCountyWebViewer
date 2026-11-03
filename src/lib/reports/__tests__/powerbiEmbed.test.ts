import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/database/connections", () => ({ sqlTabular: { executeWithValues: vi.fn() } }));
vi.mock("@/lib/reports/powerbi", () => ({
  getAccessToken: vi.fn(),
  findReport: vi.fn(),
}));

import { findReport, getAccessToken } from "@/lib/reports/powerbi";
import { getEmbedToken } from "@/lib/reports/powerbiEmbed";

const mockAccessToken = vi.mocked(getAccessToken);
const mockFindReport = vi.mocked(findReport);

describe("getEmbedToken", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    mockAccessToken.mockResolvedValue("aad-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an error object when the report does not exist", async () => {
    mockFindReport.mockResolvedValue(undefined);

    expect(await getEmbedToken("Missing")).toEqual({ error: "Report not found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the legacy-shaped embed config", async () => {
    mockFindReport.mockResolvedValue({ id: "r1", name: "Public_Embedded", embedUrl: "https://embed", reportType: "PaginatedReport" });
    fetchMock.mockResolvedValue({ json: async () => ({ token: "embed-token", tokenId: "tid", expiration: "2026-01-01T00:00:00Z" }) });

    const result = await getEmbedToken("Public_Embedded");

    expect(result).toEqual({
      Id: "r1",
      EmbedUrl: "https://embed",
      Type: "PaginatedReport",
      EmbedToken: { Token: "embed-token", TokenId: "tid", Expiration: `/Date(${Date.parse("2026-01-01T00:00:00Z")})/` },
      MinutesToExpiration: 10,
      DefaultPage: null,
      MobileDefaultPage: null,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.powerbi.com/v1.0/myorg/GenerateToken");
    expect(JSON.parse(init.body)).toEqual({ lifetimeInMinutes: 10, reports: [{ allowEdit: false, id: "r1" }] });
  });

  it("throws when PowerBI does not issue a token", async () => {
    mockFindReport.mockResolvedValue({ id: "r1", name: "x" });
    fetchMock.mockResolvedValue({ json: async () => ({ error: {} }) });

    await expect(getEmbedToken("x")).rejects.toThrow();
  });
});
