import { describe, it, expect, beforeEach } from "vitest";
import { useHelpModalStore } from "@/stores/helpModalStore";

beforeEach(() => {
  useHelpModalStore.setState({
    isOpen: false,
  });
});

describe("helpModalStore", () => {
  describe("Initial State", () => {
    it("should have isOpen as false by default", () => {
      const state = useHelpModalStore.getState();
      expect(state.isOpen).toBe(false);
    });
  });

  describe("openHelp", () => {
    it("should set isOpen to true", () => {
      useHelpModalStore.getState().openHelp();
      expect(useHelpModalStore.getState().isOpen).toBe(true);
    });

    it("should remain open when called multiple times", () => {
      useHelpModalStore.getState().openHelp();
      useHelpModalStore.getState().openHelp();
      expect(useHelpModalStore.getState().isOpen).toBe(true);
    });
  });

  describe("closeHelp", () => {
    it("should set isOpen to false", () => {
      useHelpModalStore.getState().openHelp();
      expect(useHelpModalStore.getState().isOpen).toBe(true);

      useHelpModalStore.getState().closeHelp();
      expect(useHelpModalStore.getState().isOpen).toBe(false);
    });

    it("should be safe to call when already closed", () => {
      useHelpModalStore.getState().closeHelp();
      expect(useHelpModalStore.getState().isOpen).toBe(false);
    });
  });

  describe("open/close cycle", () => {
    it("should support repeated open/close cycles", () => {
      const store = useHelpModalStore.getState();

      store.openHelp();
      expect(useHelpModalStore.getState().isOpen).toBe(true);

      store.closeHelp();
      expect(useHelpModalStore.getState().isOpen).toBe(false);

      store.openHelp();
      expect(useHelpModalStore.getState().isOpen).toBe(true);

      store.closeHelp();
      expect(useHelpModalStore.getState().isOpen).toBe(false);
    });
  });
});
