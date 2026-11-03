import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/reports/reportImages", () => ({
  getPlanningReportImageUrl: vi.fn(),
  proxyImage: vi.fn(),
  parseDimension: (value: string | null, fallback: number) => {
    if (value === null || value === "") return fallback;
    return /^\d+$/.test(value) && parseInt(value, 10) >= 1 ? parseInt(value, 10) : null;
  },
}));

import { GET } from "@/app/api/public/reports/planning/images/route";
import { getPlanningReportImageUrl, proxyImage } from "@/lib/reports/reportImages";

const mockUrl = vi.mocked(getPlanningReportImageUrl);
const mockProxy = vi.mocked(proxyImage);

const req = (qs = "") => new NextRequest(`http://localhost/api/public/reports/planning/images${qs}`);

describe("GET /api/public/reports/planning/images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("applies legacy defaults", async () => {
    mockUrl.mockResolvedValue("https://print/img");
    mockProxy.mockResolvedValue(new Response("img"));

    await GET(req());

    expect(mockUrl).toHaveBeenCalledWith({ fieldValue: "434602000705701", reportType: "WETLAND", bufDistance: 0, width: 300, height: 300, token: "" });
    expect(mockProxy).toHaveBeenCalledWith("https://print/img");
  });

  it("passes query parameters through", async () => {
    mockUrl.mockResolvedValue("https://print/img");
    mockProxy.mockResolvedValue(new Response("img"));

    await GET(req("?value=1&reporttype=MAIN&bufferdistance=50&width=400&height=200&token=t"));

    expect(mockUrl).toHaveBeenCalledWith({ fieldValue: "1", reportType: "MAIN", bufDistance: 50, width: 400, height: 200, token: "t" });
  });

  it("returns 400 for an invalid width", async () => {
    const res = await GET(req("?width=abc"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when no image could be generated", async () => {
    mockUrl.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(404);
  });

  it("returns 500 on error", async () => {
    mockUrl.mockRejectedValue(new Error("boom"));
    const res = await GET(req());
    expect(res.status).toBe(500);
  });
});
