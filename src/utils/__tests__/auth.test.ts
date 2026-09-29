import { describe, it, expect, vi, beforeEach } from "vitest";
import { isSecuredUrl, getAccessToken, buildAuthFetchOptions, fetchWithAuth } from "@/utils/auth";
import { getSession } from "next-auth/react";

vi.mock("next-auth/react", () => ({
  getSession: vi.fn(),
}));

describe("auth utils", () => {
  beforeEach(() => {
    vi.mocked(getSession).mockReset();
  });

  describe("isSecuredUrl", () => {
    it("returns true for opengis2.simcoe.ca URLs", () => {
      expect(isSecuredUrl("https://opengis2.simcoe.ca/geoserver/simcoe/ows")).toBe(true);
    });

    it("returns false for non-secured URLs", () => {
      expect(isSecuredUrl("https://opengis.simcoe.ca/geoserver/simcoe/ows")).toBe(false);
    });
  });

  describe("getAccessToken", () => {
    it("returns token from session.accessToken", async () => {
      vi.mocked(getSession).mockResolvedValue({ accessToken: "abc123" } as never);
      expect(await getAccessToken()).toBe("abc123");
    });

    it("returns token from session.user.accessToken fallback", async () => {
      vi.mocked(getSession).mockResolvedValue({ user: { accessToken: "xyz" } } as never);
      expect(await getAccessToken()).toBe("xyz");
    });

    it("returns undefined when no session", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      expect(await getAccessToken()).toBeUndefined();
    });

    it("returns undefined when session has RefreshAccessTokenError", async () => {
      vi.mocked(getSession).mockResolvedValue({ error: "RefreshAccessTokenError", accessToken: "stale" } as never);
      expect(await getAccessToken()).toBeUndefined();
    });

    it("returns undefined when getSession throws", async () => {
      vi.mocked(getSession).mockRejectedValue(new Error("fail"));
      expect(await getAccessToken()).toBeUndefined();
    });
  });

  describe("buildAuthFetchOptions", () => {
    it("returns basic options for non-secured requests", async () => {
      const opts = await buildAuthFetchOptions(false);
      expect(opts.method).toBe("GET");
      expect(opts.mode).toBe("cors");
      expect(opts.headers).toBeUndefined();
    });

    it("adds Authorization header for secured requests with provided token", async () => {
      const opts = await buildAuthFetchOptions(true, "mytoken");
      expect(opts.headers).toEqual({ Authorization: "Bearer mytoken" });
    });

    it("auto-fetches token when secured and no token provided", async () => {
      vi.mocked(getSession).mockResolvedValue({ accessToken: "auto" } as never);
      const opts = await buildAuthFetchOptions(true);
      expect(opts.headers).toEqual({ Authorization: "Bearer auto" });
    });

    it("throws when secured but no token available", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      await expect(buildAuthFetchOptions(true)).rejects.toThrow("Authentication required");
    });
  });

  describe("fetchWithAuth", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok")));
    });

    it("calls fetch without auth headers for public URLs", async () => {
      await fetchWithAuth("https://opengis.simcoe.ca/geoserver/ows");
      expect(fetch).toHaveBeenCalledWith("https://opengis.simcoe.ca/geoserver/ows", expect.objectContaining({ method: "GET" }));
      const callOpts = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      expect(callOpts.headers).toBeUndefined();
    });

    it("calls fetch with auth headers for secured URLs", async () => {
      await fetchWithAuth("https://opengis2.simcoe.ca/geoserver/ows", true, "token123");
      const callOpts = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      expect(callOpts.headers).toEqual({ Authorization: "Bearer token123" });
    });

    it("auto-detects secured URLs", async () => {
      vi.mocked(getSession).mockResolvedValue({ accessToken: "auto" } as never);
      await fetchWithAuth("https://opengis2.simcoe.ca/geoserver/ows");
      const callOpts = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
      expect(callOpts.headers).toEqual({ Authorization: "Bearer auto" });
    });
  });
});
