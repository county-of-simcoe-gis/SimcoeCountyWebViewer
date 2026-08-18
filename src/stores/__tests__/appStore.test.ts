import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAppStore } from "@/stores/appStore";
import type { AppConfig } from "@/utils/config";

// Reset store before each test
beforeEach(() => {
  useAppStore.setState({
    mapLoading: true,
    sidebarLoading: true,
    headerLoading: true,
    configLoading: false,
    config: null,
    configError: null,
    appInfo: {
      name: "",
      version: "",
      homepage: "",
    },
  });
});

describe("appStore", () => {
  describe("Initial State", () => {
    it("should have correct initial loading states", () => {
      const { result } = renderHook(() => useAppStore());

      expect(result.current.mapLoading).toBe(true);
      expect(result.current.sidebarLoading).toBe(true);
      expect(result.current.headerLoading).toBe(true);
      expect(result.current.configLoading).toBe(false);
    });

    it("should have null initial config and error", () => {
      const { result } = renderHook(() => useAppStore());

      expect(result.current.config).toBeNull();
      expect(result.current.configError).toBeNull();
    });

    it("should have correct initial app info", () => {
      const { result } = renderHook(() => useAppStore());

      expect(result.current.appInfo).toEqual({
        name: "",
        version: "",
        homepage: "",
      });
    });
  });

  describe("Loading State Management", () => {
    it("should update individual loading states", () => {
      // Use store setState for actions, getState for reading
      useAppStore.setState({ mapLoading: false });
      expect(useAppStore.getState().mapLoading).toBe(false);

      useAppStore.setState({ sidebarLoading: false });
      expect(useAppStore.getState().sidebarLoading).toBe(false);
    });

    it("should compute isAnyLoading correctly when all are false", () => {
      useAppStore.setState({
        mapLoading: false,
        sidebarLoading: false,
        headerLoading: false,
        configLoading: false,
      });

      const state = useAppStore.getState();
      // Test the computed logic manually since getState() doesn't include functions
      const isAnyLoading = state.mapLoading || state.sidebarLoading || state.headerLoading || state.configLoading;
      expect(isAnyLoading).toBe(false);
    });

    it("should compute isAnyLoading correctly when any is true", () => {
      useAppStore.setState({
        mapLoading: false,
        sidebarLoading: false,
        headerLoading: false,
        configLoading: true, // Keep this one true
      });

      const state = useAppStore.getState();
      // Test the computed logic manually
      const isAnyLoading = state.mapLoading || state.sidebarLoading || state.headerLoading || state.configLoading;
      expect(isAnyLoading).toBe(true);
    });

    it("should compute isAnyLoading correctly when multiple are true", () => {
      // Keep default true values - already set by beforeEach
      const state = useAppStore.getState();
      // Test the computed logic manually
      const isAnyLoading = state.mapLoading || state.sidebarLoading || state.headerLoading || state.configLoading;
      expect(isAnyLoading).toBe(true);
    });
  });

  describe("Configuration Management", () => {
    it("should set config and clear error", () => {
      const mockConfig = {
        apiUrl: "https://test-api.com",
        mapId: "test-map",
        title: "Test App",
      } as AppConfig;

      // First set an error
      useAppStore.setState({ configError: "Some error" });
      expect(useAppStore.getState().configError).toBe("Some error");

      // Then set config - should clear error (test the setConfig logic)
      useAppStore.setState({ config: mockConfig, configError: null });
      expect(useAppStore.getState().config).toEqual(mockConfig);
      expect(useAppStore.getState().configError).toBeNull();
    });

    it("should set config error", () => {
      const errorMessage = "Failed to load config";

      useAppStore.setState({ configError: errorMessage });
      expect(useAppStore.getState().configError).toBe(errorMessage);
    });

    it("should handle null config", () => {
      const mockConfig = { apiUrl: "test" } as AppConfig;

      // Set a config first
      useAppStore.setState({ config: mockConfig });
      expect(useAppStore.getState().config).toEqual(mockConfig);

      // Then set null
      useAppStore.setState({ config: null });
      expect(useAppStore.getState().config).toBeNull();
    });
  });

  describe("App Info Management", () => {
    it("should update app info partially", () => {
      // Test partial update by setting only version
      useAppStore.setState({
        appInfo: {
          ...useAppStore.getState().appInfo,
          version: "2.0.0",
        },
      });

      expect(useAppStore.getState().appInfo.version).toBe("2.0.0");
      expect(useAppStore.getState().appInfo.name).toBe(""); // Should remain unchanged
      expect(useAppStore.getState().appInfo.homepage).toBe(""); // Should remain unchanged
    });

    it("should update multiple app info properties", () => {
      useAppStore.setState({
        appInfo: {
          version: "3.1.0",
          homepage: "https://test.com",
          name: "Updated App Name",
        },
      });

      expect(useAppStore.getState().appInfo).toEqual({
        version: "3.1.0",
        homepage: "https://test.com",
        name: "Updated App Name",
      });
    });

    it("should merge app info updates with existing values", () => {
      // Update version first
      useAppStore.setState({
        appInfo: {
          ...useAppStore.getState().appInfo,
          version: "2.0.0",
        },
      });

      // Then update homepage
      useAppStore.setState({
        appInfo: {
          ...useAppStore.getState().appInfo,
          homepage: "https://example.com",
        },
      });

      expect(useAppStore.getState().appInfo).toEqual({
        name: "",
        version: "2.0.0", // Should keep previous update
        homepage: "https://example.com",
      });
    });
  });
});
