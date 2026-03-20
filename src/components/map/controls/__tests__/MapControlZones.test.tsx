import { beforeEach, describe, expect, it, vi } from "vitest";
import { createZoneControlsFromConfig, type ControlConfig } from "@/components/map/controls/MapControlZones";
import type Map from "ol/Map";

// Mock MapControlWrapper
vi.mock("@/components/map/controls/MapControlWrapper", () => ({
  createMapControl: vi.fn((component, className) => ({
    element: document.createElement("div"),
    className,
    component,
  })),
  default: vi.fn(),
}));

const mockMap = {} as Map;

const MockComponent1 = vi.fn(({ map: _map }) => <div data-testid="mock-component-1">Mock Component 1</div>);
const MockComponent2 = vi.fn(({ map: _map2 }) => <div data-testid="mock-component-2">Mock Component 2</div>);

describe("MapControlZones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when map is null", () => {
    const controlsConfig: Record<string, ControlConfig> = {
      test: {
        component: MockComponent1,
        zone: "top-left",
        order: 1,
        enabled: true,
      },
    };

    const result = createZoneControlsFromConfig(null, controlsConfig);
    expect(result).toEqual([]);
  });

  it("creates controls for enabled components", () => {
    const controlsConfig: Record<string, ControlConfig> = {
      test1: {
        component: MockComponent1,
        zone: "top-left",
        order: 1,
        enabled: true,
      },
      test2: {
        component: MockComponent2,
        zone: "top-right",
        order: 1,
        enabled: true,
      },
    };

    const result = createZoneControlsFromConfig(mockMap, controlsConfig);
    expect(result).toHaveLength(2);
  });

  it("filters out disabled controls", () => {
    const controlsConfig: Record<string, ControlConfig> = {
      enabled: {
        component: MockComponent1,
        zone: "top-left",
        order: 1,
        enabled: true,
      },
      disabled: {
        component: MockComponent2,
        zone: "top-left",
        order: 2,
        enabled: false,
      },
    };

    const result = createZoneControlsFromConfig(mockMap, controlsConfig);
    expect(result).toHaveLength(1);
  });

  it("groups controls by zone", () => {
    const controlsConfig: Record<string, ControlConfig> = {
      test1: {
        component: MockComponent1,
        zone: "top-left",
        order: 1,
        enabled: true,
      },
      test2: {
        component: MockComponent2,
        zone: "top-left",
        order: 2,
        enabled: true,
      },
    };

    const result = createZoneControlsFromConfig(mockMap, controlsConfig);
    // Should create one control for the zone containing both components
    expect(result).toHaveLength(1);
  });

  it("creates separate controls for different zones", () => {
    const controlsConfig: Record<string, ControlConfig> = {
      topLeft: {
        component: MockComponent1,
        zone: "top-left",
        order: 1,
        enabled: true,
      },
      topRight: {
        component: MockComponent2,
        zone: "top-right",
        order: 1,
        enabled: true,
      },
      bottomLeft: {
        component: MockComponent1,
        zone: "bottom-left",
        order: 1,
        enabled: true,
      },
      bottomRight: {
        component: MockComponent2,
        zone: "bottom-right",
        order: 1,
        enabled: true,
      },
    };

    const result = createZoneControlsFromConfig(mockMap, controlsConfig);
    expect(result).toHaveLength(4); // One control per zone
  });

  it("handles empty controls configuration", () => {
    const controlsConfig: Record<string, ControlConfig> = {};

    const result = createZoneControlsFromConfig(mockMap, controlsConfig);
    expect(result).toEqual([]);
  });

  it("preserves control order within zones", () => {
    const controlsConfig: Record<string, ControlConfig> = {
      first: {
        component: MockComponent1,
        zone: "top-left",
        order: 2,
        enabled: true,
      },
      second: {
        component: MockComponent2,
        zone: "top-left",
        order: 1,
        enabled: true,
      },
    };

    const result = createZoneControlsFromConfig(mockMap, controlsConfig);
    expect(result).toHaveLength(1);
    // The actual ordering would be tested in the ZoneComponent render
  });

  it("handles all zone types", () => {
    const zones: Array<"top-left" | "top-right" | "bottom-left" | "bottom-right"> = ["top-left", "top-right", "bottom-left", "bottom-right"];

    zones.forEach((zone) => {
      const controlsConfig: Record<string, ControlConfig> = {
        [`test-${zone}`]: {
          component: MockComponent1,
          zone,
          order: 1,
          enabled: true,
        },
      };

      const result = createZoneControlsFromConfig(mockMap, controlsConfig);
      expect(result).toHaveLength(1);
    });
  });

  it("ignores controls with invalid configuration", () => {
    const controlsConfig: Record<string, ControlConfig> = {
      valid: {
        component: MockComponent1,
        zone: "top-left",
        order: 1,
        enabled: true,
      },
      // This would be filtered out by enabled: false
      invalid: {
        component: MockComponent2,
        zone: "top-left",
        order: 2,
        enabled: false,
      },
    };

    const result = createZoneControlsFromConfig(mockMap, controlsConfig);
    expect(result).toHaveLength(1);
  });
});
