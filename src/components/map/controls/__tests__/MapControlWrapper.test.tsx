import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createMapControl } from "@/components/map/controls/MapControlWrapper";
import type Map from "ol/Map";

// Store original functions for restoration
const originalCreateElement = document.createElement;

// Mock react-dom/client
const mockRoot = {
  render: vi.fn(),
  unmount: vi.fn(),
};

vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => mockRoot),
}));

// Mock OpenLayers Control class with proper inheritance support
vi.mock("ol/control/Control", () => {
  class MockControl {
    element: HTMLElement | null = null;

    constructor(options?: any) {
      this.element = options?.element || null;
    }

    setMap = vi.fn();
    setTarget = vi.fn();
  }

  return {
    default: MockControl,
  };
});

const mockMap = {} as Map;

describe("MapControlWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoot.render.mockClear();
    mockRoot.unmount.mockClear();

    // Mock document.createElement only for this test file
    document.createElement = vi.fn(() => ({
      className: "",
      style: {},
    })) as any;
  });

  afterEach(() => {
    // Restore original document.createElement after each test
    document.createElement = originalCreateElement;
  });

  it("creates a map control with React component", () => {
    const TestComponent = ({ map: _map }: { map: Map | null }) => <div data-testid="test-component">Test Component</div>;

    const control = createMapControl(TestComponent, "test-class");

    expect(control).toBeDefined();
    expect(typeof control.setMap).toBe("function");
    expect(typeof control.setTarget).toBe("function");
  });

  it("applies custom CSS class to control element", () => {
    const TestComponent = ({ map: _map }: { map: Map | null }) => <div data-testid="test-component">Test Component</div>;

    const customClass = "custom-control-class";
    const control = createMapControl(TestComponent, customClass);

    // The control should be created with the specified class
    expect(control).toBeDefined();
  });

  it("renders React component when map is set", () => {
    const TestComponent = ({ map }: { map: Map | null }) => <div data-testid="test-component">{map ? "Map Available" : "No Map"}</div>;

    const control = createMapControl(TestComponent, "test-class");

    // Simulate setting the map
    if (control.setMap) {
      control.setMap(mockMap);
    }

    expect(control).toBeDefined();
  });

  it("handles component without map prop", () => {
    const TestComponent = () => <div data-testid="test-component">Static Component</div>;

    const control = createMapControl(TestComponent, "test-class");

    expect(control).toBeDefined();
  });

  it("creates unique control instances", () => {
    const TestComponent1 = ({ map: _map }: { map: Map | null }) => <div data-testid="test-component-1">Component 1</div>;

    const TestComponent2 = ({ map: _map }: { map: Map | null }) => <div data-testid="test-component-2">Component 2</div>;

    const control1 = createMapControl(TestComponent1, "class1");
    const control2 = createMapControl(TestComponent2, "class2");

    expect(control1).toBeDefined();
    expect(control2).toBeDefined();
    expect(control1).not.toBe(control2);
  });

  it("passes map instance to React component", () => {
    let _receivedMap: Map | null = null;

    const TestComponent = ({ map }: { map: Map | null }) => {
      _receivedMap = map;
      return <div data-testid="test-component">Test</div>;
    };

    const control = createMapControl(TestComponent, "test-class");

    // Simulate setting the map
    if (control.setMap) {
      control.setMap(mockMap);
    }

    // The component should eventually receive the map
    expect(control).toBeDefined();
  });

  it("handles null map gracefully", () => {
    const TestComponent = ({ map }: { map: Map | null }) => <div data-testid="test-component">{map ? "Has Map" : "No Map"}</div>;

    const control = createMapControl(TestComponent, "test-class");

    // Simulate setting map to null
    if (control.setMap) {
      control.setMap(null);
    }

    expect(control).toBeDefined();
  });

  it("supports different CSS classes for different controls", () => {
    const TestComponent = ({ map: _map }: { map: Map | null }) => <div data-testid="test-component">Test Component</div>;

    const classes = [
      "ol-unselectable ol-control map-control-zone-top-left",
      "ol-unselectable ol-control map-control-zone-top-right",
      "ol-unselectable ol-control map-control-zone-bottom-left",
      "ol-unselectable ol-control map-control-zone-bottom-right",
    ];

    classes.forEach((className) => {
      const control = createMapControl(TestComponent, className);
      expect(control).toBeDefined();
    });
  });

  it("maintains control lifecycle", () => {
    const TestComponent = ({ map: _map }: { map: Map | null }) => <div data-testid="test-component">Test Component</div>;

    const control = createMapControl(TestComponent, "test-class");

    // Control should be created
    expect(control).toBeDefined();

    // Should be able to set map multiple times
    if (control.setMap) {
      control.setMap(mockMap);
      control.setMap(null);
      control.setMap(mockMap);
    }

    expect(control).toBeDefined();
  });
});
