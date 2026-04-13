import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useMapStore } from "@/stores/mapStore";

// We need to mock the mapStore before importing the module under test
vi.mock("@/stores/mapStore", () => ({
  useMapStore: {
    getState: vi.fn(),
  },
}));

// Import after mock setup
import { waitForLoad, isLoaded, addIsLoaded, removeIsLoaded } from "@/utils/helpersStore";

describe("helpersStore", () => {
  const mockAreItemsLoaded = vi.fn();
  const mockAddLoadedItem = vi.fn();
  const mockRemoveLoadedItem = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(useMapStore.getState).mockReturnValue({
      areItemsLoaded: mockAreItemsLoaded,
      addLoadedItem: mockAddLoadedItem,
      removeLoadedItem: mockRemoveLoadedItem,
    } as never);
    mockAreItemsLoaded.mockReset();
    mockAddLoadedItem.mockReset();
    mockRemoveLoadedItem.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isLoaded", () => {
    it("delegates to mapStore.areItemsLoaded", () => {
      mockAreItemsLoaded.mockReturnValue(true);
      expect(isLoaded("map")).toBe(true);
      expect(mockAreItemsLoaded).toHaveBeenCalledWith("map");
    });

    it("accepts array of items", () => {
      mockAreItemsLoaded.mockReturnValue(false);
      expect(isLoaded(["map", "layers"])).toBe(false);
      expect(mockAreItemsLoaded).toHaveBeenCalledWith(["map", "layers"]);
    });
  });

  describe("addIsLoaded", () => {
    it("delegates to mapStore.addLoadedItem", () => {
      addIsLoaded("map");
      expect(mockAddLoadedItem).toHaveBeenCalledWith("map");
    });
  });

  describe("removeIsLoaded", () => {
    it("delegates to mapStore.removeLoadedItem", () => {
      removeIsLoaded("map");
      expect(mockRemoveLoadedItem).toHaveBeenCalledWith("map");
    });
  });

  describe("waitForLoad", () => {
    it("calls callback immediately when items are loaded", () => {
      mockAreItemsLoaded.mockReturnValue(true);
      const callback = vi.fn();
      waitForLoad("map", Date.now(), 30, callback);
      expect(callback).toHaveBeenCalled();
    });

    it("retries via setTimeout when items not yet loaded", () => {
      mockAreItemsLoaded.mockReturnValueOnce(false).mockReturnValueOnce(true);
      const callback = vi.fn();
      waitForLoad("map", Date.now(), 30, callback);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(callback).toHaveBeenCalled();
    });

    it("logs error and gives up after timeout", () => {
      mockAreItemsLoaded.mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const callback = vi.fn();

      // Start with a time in the past beyond the timeout
      const pastTime = Date.now() - 31000;
      waitForLoad("map", pastTime, 30, callback);

      expect(callback).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("Timeout loading", "map");
      consoleSpy.mockRestore();
    });
  });
});
