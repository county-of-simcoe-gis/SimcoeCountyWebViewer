import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isMobile, glowContainer, downloadFile } from "@/utils/helpersBrowser";

describe("helpersBrowser", () => {
  describe("isMobile", () => {
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
      Object.defineProperty(window, "innerWidth", { value: originalInnerWidth, writable: true });
    });

    it("returns true when window width < 770", () => {
      Object.defineProperty(window, "innerWidth", { value: 500, writable: true });
      expect(isMobile()).toBe(true);
    });

    it("returns false when window width >= 770", () => {
      Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
      expect(isMobile()).toBe(false);
    });

    it("returns false at exactly 770", () => {
      Object.defineProperty(window, "innerWidth", { value: 770, writable: true });
      expect(isMobile()).toBe(false);
    });
  });

  describe("glowContainer", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("adds and removes glow class after 1 second", () => {
      const elem = document.createElement("div");
      elem.id = "test-glow";
      document.body.appendChild(elem);

      glowContainer("test-glow", "green");
      expect(elem.classList.contains("glow-container-green")).toBe(true);

      vi.advanceTimersByTime(1000);
      expect(elem.classList.contains("glow-container-green")).toBe(false);

      document.body.removeChild(elem);
    });

    it("defaults to blue color", () => {
      const elem = document.createElement("div");
      elem.id = "test-glow-default";
      document.body.appendChild(elem);

      glowContainer("test-glow-default");
      expect(elem.classList.contains("glow-container-blue")).toBe(true);

      document.body.removeChild(elem);
    });

    it("does nothing if element not found", () => {
      // Should not throw
      expect(() => glowContainer("nonexistent")).not.toThrow();
    });
  });

  describe("downloadFile", () => {
    it("creates link, triggers download, and cleans up", () => {
      const mockClick = vi.fn();
      const mockLink = {
        href: "",
        download: "",
        click: mockClick,
      } as unknown as HTMLAnchorElement;

      vi.spyOn(document, "createElement").mockReturnValue(mockLink as never);
      const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => mockLink as never);
      const removeSpy = vi.spyOn(document.body, "removeChild").mockImplementation(() => mockLink as never);

      downloadFile("csv,data", "export.csv", "text/csv");

      expect(mockLink.download).toBe("export.csv");
      expect(mockClick).toHaveBeenCalled();
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });
});
