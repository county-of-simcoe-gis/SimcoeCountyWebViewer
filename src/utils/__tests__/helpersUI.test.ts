import { describe, it, expect, vi, beforeEach } from "vitest";
import { activateTab, showMessage, showURLWindow, addAppStat } from "@/utils/helpersUI";
import { useToastStore } from "@/hooks/useToast";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useURLModalStore } from "@/stores/urlModalStore";
import { useAppStore } from "@/stores/appStore";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();

  // Reset sidebar store to default state
  useSidebarStore.setState({
    isOpen: false,
    activeTab: 0,
    hideLayers: false,
    hideTools: false,
    hideMyMaps: false,
    hideThemes: false,
    hideReports: false,
  });

  // Reset URL modal store
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

describe("helpersUI", () => {
  describe("activateTab", () => {
    it("opens sidebar and sets correct tab index for layers", () => {
      activateTab("layers");
      const state = useSidebarStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.activeTab).toBe(0);
    });

    it("sets correct tab index for tools", () => {
      activateTab("tools");
      expect(useSidebarStore.getState().activeTab).toBe(1);
    });

    it("sets correct tab index for mymaps", () => {
      activateTab("mymaps");
      expect(useSidebarStore.getState().activeTab).toBe(2);
    });

    it("sets correct tab index for themes", () => {
      activateTab("themes");
      expect(useSidebarStore.getState().activeTab).toBe(3);
    });

    it("sets correct tab index for reports", () => {
      activateTab("reports");
      expect(useSidebarStore.getState().activeTab).toBe(4);
    });

    it("logs warning for invalid tab name", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      // @ts-expect-error - testing invalid input
      activateTab("invalid");
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("unknown tab"));
    });
  });

  describe("showMessage", () => {
    it("logs info messages to console", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      showMessage("Test", "Hello", "info");
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("INFO"));
    });

    it("shows toast for error messages", () => {
      useToastStore.setState({ toasts: [] });
      vi.spyOn(console, "log").mockImplementation(() => {});
      showMessage("Error", "Something went wrong", "error");
      expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "Error: Something went wrong", type: "error" }));
    });
  });

  describe("showURLWindow", () => {
    it("opens modal with URL and default parameters", () => {
      const openSpy = vi.spyOn(useURLModalStore.getState(), "open");
      showURLWindow("https://example.com");
      expect(openSpy).toHaveBeenCalledWith("https://example.com", "Information", {
        showFooter: false,
        honorDontShow: false,
        mode: "normal",
        hideScroll: false,
      });
    });

    it("passes all parameters to modal store", () => {
      const openSpy = vi.spyOn(useURLModalStore.getState(), "open");
      showURLWindow("https://example.com", true, "fullscreen", false, true, "Help");
      expect(openSpy).toHaveBeenCalledWith("https://example.com", "Help", {
        showFooter: true,
        honorDontShow: false,
        mode: "fullscreen",
        hideScroll: true,
      });
    });

    it("skips opening when honorDontShow is true and URL is in storage", () => {
      const openSpy = vi.spyOn(useURLModalStore.getState(), "open");
      // Add the URL to dont-show storage
      localStorage.setItem("sc_dontshowagain", JSON.stringify([{ url: "https://example.com" }]));

      showURLWindow("https://example.com", false, "normal", true);
      expect(openSpy).not.toHaveBeenCalled();
    });

    it("opens when honorDontShow is true but URL is not in storage", () => {
      const openSpy = vi.spyOn(useURLModalStore.getState(), "open");
      localStorage.setItem("sc_dontshowagain", JSON.stringify([{ url: "https://other.com" }]));

      showURLWindow("https://example.com", false, "normal", true);
      expect(openSpy).toHaveBeenCalled();
    });

    it("handles wrapped {value: [...]} storage format", () => {
      const openSpy = vi.spyOn(useURLModalStore.getState(), "open");
      localStorage.setItem("sc_dontshowagain", JSON.stringify({ value: [{ url: "https://example.com" }] }));

      showURLWindow("https://example.com", false, "normal", true);
      expect(openSpy).not.toHaveBeenCalled();
    });

    it("handles invalid JSON in storage gracefully", () => {
      const openSpy = vi.spyOn(useURLModalStore.getState(), "open");
      localStorage.setItem("sc_dontshowagain", "invalid-json");

      // Should not throw, should still open
      showURLWindow("https://example.com", false, "normal", true);
      expect(openSpy).toHaveBeenCalled();
    });
  });

  describe("addAppStat", () => {
    it("sends stat via fetch when collection is enabled", () => {
      vi.stubEnv("NEXT_PUBLIC_COLLECT_APP_STATS", "true");
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(() => Promise.resolve(new Response()));
      useAppStore.setState({
        config: { title: "TestApp" } as any,
        appInfo: { name: "myapp", version: "1.2.3", homepage: "public" },
      });

      addAppStat("click", "button-pressed");
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("myapp-1.2.3-public"), expect.objectContaining({ method: "GET" }));
      fetchSpy.mockRestore();
    });
  });
});
