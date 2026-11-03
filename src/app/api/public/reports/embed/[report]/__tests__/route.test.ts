import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/reports/powerbiEmbed", () => ({
  getEmbedToken: vi.fn(),
  setReportParameters: vi.fn(),
}));
vi.mock("@/lib/common", () => ({ isHostAllowed: vi.fn() }));

import { GET } from "@/app/api/public/reports/embed/[report]/route";
import { getEmbedToken } from "@/lib/reports/powerbiEmbed";
import { isHostAllowed } from "@/lib/common";

const mockToken = vi.mocked(getEmbedToken);
const mockHost = vi.mocked(isHostAllowed);

const req = (host = "localhost:3000") => ({ headers: new Headers({ host }) }) as unknown as NextRequest;
const ctx = (report = "Public_Embedded") => ({ params: Promise.resolve({ report }) });

describe("GET /api/public/reports/embed/[report]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHost.mockReturnValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns 403 for a disallowed host", async () => {
    mockHost.mockReturnValue(false);
    const res = await GET(req("evil.example"), ctx());
    expect(res.status).toBe(403);
    expect(mockToken).not.toHaveBeenCalled();
  });

  it("returns the embed config", async () => {
    mockToken.mockResolvedValue({ error: "Report not found" });
    const res = await GET(req(), ctx("Nope"));
    expect(mockToken).toHaveBeenCalledWith("Nope");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ error: "Report not found" });
  });

  it("returns 500 when PowerBI fails", async () => {
    mockToken.mockRejectedValue(new Error("boom"));
    const res = await GET(req(), ctx());
    expect(res.status).toBe(500);
  });
});
