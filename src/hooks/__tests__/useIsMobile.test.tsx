import { describe, it, expect, afterEach, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { isMobile } from "@/utils/helpersBrowser";
import { useIsMobile } from "@/hooks/useIsMobile";

function Probe() {
  return <span>{String(useIsMobile())}</span>;
}

describe("SSR safety for mobile detection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("isMobile returns false when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(isMobile()).toBe(false);
  });

  it("useIsMobile renders the server snapshot without touching window", () => {
    vi.stubGlobal("window", undefined);
    expect(renderToString(<Probe />)).toBe("<span>false</span>");
  });
});
