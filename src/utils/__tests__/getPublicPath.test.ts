import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getBasePath, getPublicPath, getAbsolutePublicUrl } from "@/utils/getPublicPath";

const ORIGIN = "https://opengis.simcoe.ca";

describe("getBasePath", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns NEXT_PUBLIC_BASE_PATH when set", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/viewer");
    expect(getBasePath()).toBe("/viewer");
  });

  it("returns an empty string when NEXT_PUBLIC_BASE_PATH is not set and window is unavailable", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate SSR/test environment without window
    globalThis.window = undefined;

    expect(getBasePath()).toBe("");

    // @ts-expect-error restore window
    globalThis.window = originalWindow;
  });
});

describe("getPublicPath", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prepends the basePath to absolute paths", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/viewer");
    expect(getPublicPath("/images/logo.png")).toBe("/viewer/images/logo.png");
  });

  it("adds a leading slash when missing", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/viewer");
    expect(getPublicPath("images/logo.png")).toBe("/viewer/images/logo.png");
  });

  it("works with no basePath", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    expect(getPublicPath("/images/logo.png")).toBe("/images/logo.png");
  });
});

describe("getAbsolutePublicUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/viewer");

    const url = new URL(`${ORIGIN}/viewer`);
    // @ts-expect-error jsdom url override
    delete (window as Window & typeof globalThis).location;
    window.location = {
      href: url.href,
      origin: url.origin,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    } as Location;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns absolute http URLs unchanged", () => {
    expect(getAbsolutePublicUrl("http://example.com/icon.png")).toBe("http://example.com/icon.png");
  });

  it("returns absolute https URLs unchanged", () => {
    expect(getAbsolutePublicUrl("https://example.com/icon.png")).toBe("https://example.com/icon.png");
  });

  it("returns protocol-relative URLs unchanged", () => {
    expect(getAbsolutePublicUrl("//example.com/icon.png")).toBe("//example.com/icon.png");
  });

  it("returns data URLs unchanged", () => {
    const dataUrl = "data:image/png;base64,abc123";
    expect(getAbsolutePublicUrl(dataUrl)).toBe(dataUrl);
  });

  it("prepends origin and basePath to relative paths", () => {
    expect(getAbsolutePublicUrl("/images/map-marker.png")).toBe(`${ORIGIN}/viewer/images/map-marker.png`);
  });

  it("does not double-prefix paths that already include the basePath", () => {
    expect(getAbsolutePublicUrl("/viewer/images/map-marker.png")).toBe(`${ORIGIN}/viewer/images/map-marker.png`);
  });

  it("handles paths without a leading slash", () => {
    expect(getAbsolutePublicUrl("images/map-marker.png")).toBe(`${ORIGIN}/viewer/images/map-marker.png`);
  });

  it("works when basePath is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    window.location.pathname = "/";
    expect(getAbsolutePublicUrl("/images/map-marker.png")).toBe(`${ORIGIN}/images/map-marker.png`);
  });

  it("falls back to basePath-only when window is undefined", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error simulate SSR/test environment without window
    globalThis.window = undefined;

    expect(getAbsolutePublicUrl("/images/map-marker.png")).toBe("/viewer/images/map-marker.png");

    // @ts-expect-error restore window
    globalThis.window = originalWindow;
  });
});
