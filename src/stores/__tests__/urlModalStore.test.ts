import { describe, it, expect, beforeEach } from "vitest";
import { useURLModalStore } from "@/stores/urlModalStore";

beforeEach(() => {
  useURLModalStore.setState({
    isOpen: false,
    url: "",
    title: "Information",
    showFooter: false,
    honorDontShow: false,
    mode: "normal",
    hideScroll: false,
  });
});

describe("urlModalStore", () => {
  describe("Initial State", () => {
    it("should have correct defaults", () => {
      const state = useURLModalStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.url).toBe("");
      expect(state.title).toBe("Information");
      expect(state.showFooter).toBe(false);
      expect(state.honorDontShow).toBe(false);
      expect(state.mode).toBe("normal");
      expect(state.hideScroll).toBe(false);
    });
  });

  describe("open", () => {
    it("should open with url and default title", () => {
      useURLModalStore.getState().open("https://example.com");

      const state = useURLModalStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.url).toBe("https://example.com");
      expect(state.title).toBe("Information");
    });

    it("should open with custom title", () => {
      useURLModalStore.getState().open("https://example.com", "Help Page");

      expect(useURLModalStore.getState().title).toBe("Help Page");
    });

    it("should accept all options", () => {
      useURLModalStore.getState().open("https://example.com", "Custom", {
        showFooter: true,
        honorDontShow: true,
        mode: "fullscreen",
        hideScroll: true,
      });

      const state = useURLModalStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.url).toBe("https://example.com");
      expect(state.title).toBe("Custom");
      expect(state.showFooter).toBe(true);
      expect(state.honorDontShow).toBe(true);
      expect(state.mode).toBe("fullscreen");
      expect(state.hideScroll).toBe(true);
    });

    it("should default options to false/normal when not provided", () => {
      useURLModalStore.getState().open("https://example.com", "Title", {});

      const state = useURLModalStore.getState();
      expect(state.showFooter).toBe(false);
      expect(state.honorDontShow).toBe(false);
      expect(state.mode).toBe("normal");
      expect(state.hideScroll).toBe(false);
    });
  });

  describe("close", () => {
    it("should reset all fields to defaults", () => {
      // First open with all options set
      useURLModalStore.getState().open("https://example.com", "Custom", {
        showFooter: true,
        honorDontShow: true,
        mode: "fullscreen",
        hideScroll: true,
      });

      // Then close
      useURLModalStore.getState().close();

      const state = useURLModalStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.url).toBe("");
      expect(state.title).toBe("Information");
      expect(state.showFooter).toBe(false);
      expect(state.honorDontShow).toBe(false);
      expect(state.mode).toBe("normal");
      expect(state.hideScroll).toBe(false);
    });
  });
});
