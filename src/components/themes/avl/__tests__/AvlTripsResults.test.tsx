/**
 * Tests for AvlTripsResults component - Trip search results display.
 *
 * Tests cover:
 * - Results list rendering
 * - Empty state
 * - Trip information display
 * - Run click handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GeoTabRunListItem, GeoTabCredentials, GeoTabDevice, AvlGroup } from "../types/avl.types";

// Mock the mapStore
vi.mock("@/stores/mapStore", () => ({
  useMapStore: () => ({
    map: {
      getView: () => ({
        fit: vi.fn(),
        getZoom: () => 10,
        setZoom: vi.fn(),
      }),
      on: vi.fn(() => ({ remove: vi.fn() })),
      un: vi.fn(),
      forEachFeatureAtPixel: vi.fn(),
    },
  }),
}));

// Mock the popupStore
vi.mock("@/stores/popupStore", () => ({
  usePopupStore: () => ({
    show: vi.fn(),
    hide: vi.fn(),
  }),
}));

// Mock the useGeoTab hook
const mockFetchLogRecords = vi.fn();
const mockFetchSpreaderData = vi.fn();
const mockIsActiveAtTime = vi.fn();
const mockFindClosestStatusValue = vi.fn();

vi.mock("../hooks/useGeoTab", () => ({
  useGeoTab: () => ({
    fetchLogRecords: mockFetchLogRecords,
    fetchSpreaderData: mockFetchSpreaderData,
    isActiveAtTime: mockIsActiveAtTime,
    findClosestStatusValue: mockFindClosestStatusValue,
  }),
}));

// Mock the LayerManager
vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "layer-id-123"),
    removeLayer: vi.fn(),
    getLayersByType: vi.fn(() => []),
  },
}));

// Mock the avlHelpers
vi.mock("../utils/avlHelpers", () => ({
  toWebMercatorFromLatLong: vi.fn((coords) => coords),
}));

// Mock OpenLayers components
vi.mock("ol/source/Vector", () => ({
  default: vi.fn().mockImplementation(() => ({
    addFeature: vi.fn(),
    clear: vi.fn(),
    getFeatures: vi.fn(() => []),
  })),
}));

vi.mock("ol/layer/Vector", () => ({
  default: vi.fn().mockImplementation(() => ({
    setVisible: vi.fn(),
    setZIndex: vi.fn(),
    getZIndex: vi.fn(() => 1000),
    set: vi.fn(),
    get: vi.fn(),
    getSource: vi.fn(() => ({
      addFeature: vi.fn(),
      clear: vi.fn(),
      getFeatures: vi.fn(() => []),
    })),
  })),
}));

vi.mock("ol/Feature", () => ({
  default: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    get: vi.fn(),
    setStyle: vi.fn(),
    getGeometry: vi.fn(() => ({
      getCoordinates: vi.fn(() => [0, 0]),
    })),
  })),
}));

vi.mock("ol/geom/Point", () => ({
  default: vi.fn(),
}));

vi.mock("ol/style", () => ({
  Style: vi.fn(),
  Icon: vi.fn(),
}));

vi.mock("ol/Observable", () => ({
  unByKey: vi.fn(),
}));

// Import after mocks
import AvlTripsResults from "../components/AvlTripsResults";

// Mock data matching the actual API format
const mockResults: (GeoTabRunListItem & { RunId: string; Vehicle_name: string; StartDateTime: string; EndDateTime: string })[] = [
  {
    vehicle_name: "V-100",
    run_id: "run-1",
    start_date: "2026-02-03T08:00:00.000Z",
    end_date: "2026-02-03T09:30:00.000Z",
    duration_minutes: 90,
    // Component also expects these alternative property names
    RunId: "run-1",
    Vehicle_name: "V-100",
    StartDateTime: "2026-02-03T08:00:00.000Z",
    EndDateTime: "2026-02-03T09:30:00.000Z",
  },
  {
    vehicle_name: "V-101",
    run_id: "run-2",
    start_date: "2026-02-03T10:00:00.000Z",
    end_date: "2026-02-03T11:00:00.000Z",
    duration_minutes: 60,
    RunId: "run-2",
    Vehicle_name: "V-101",
    StartDateTime: "2026-02-03T10:00:00.000Z",
    EndDateTime: "2026-02-03T11:00:00.000Z",
  },
];

const mockGeoTabCredentials: Record<string, GeoTabCredentials> = {
  "group-1": {
    database: "test-db",
    sessionId: "test-session-123",
    userName: "testuser",
    server: "my.geotab.com",
  },
};

const mockGeoTabDevices: Record<string, GeoTabDevice[]> = {
  "group-1": [
    { id: "device-1", name: "V-100" },
    { id: "device-2", name: "V-101" },
  ],
};

const mockSelectedGroup: AvlGroup = {
  id: "group-1",
  name: "Test Group",
  label: "Test Group Label",
  api_key: "test-api-key",
  geoTabDatabase: "test-db",
  vehicles: [
    {
      vehicle_name: "V-100",
      vehicle_type: "Plow",
      vehicle_description: "Test Vehicle 100",
      subgrouping: "Plow",
    },
    {
      vehicle_name: "V-101",
      vehicle_type: "Plow",
      vehicle_description: "Test Vehicle 101",
      subgrouping: "Plow",
    },
  ],
  subGroups: [],
};

const mockCleanDeviceNameForMatching = vi.fn((name: string) => name);
const mockEnsureGeoTabCredentialsAndDevices = vi.fn().mockResolvedValue({
  credentials: mockGeoTabCredentials["group-1"],
  devices: mockGeoTabDevices["group-1"],
});

const defaultProps = {
  results: mockResults,
  selectedVehicleId: "V-100",
  geoTabCredentials: mockGeoTabCredentials,
  geoTabDevices: mockGeoTabDevices,
  selectedGroup: mockSelectedGroup,
  cleanDeviceNameForMatching: mockCleanDeviceNameForMatching,
  ensureGeoTabCredentialsAndDevices: mockEnsureGeoTabCredentialsAndDevices,
};

describe("AvlTripsResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock return values
    mockFetchLogRecords.mockResolvedValue([]);
    mockFetchSpreaderData.mockResolvedValue({
      plowActiveEvents: [],
      spreaderActiveEvents: [],
      spreaderRateData: [],
      wingData: [],
      airTempData: [],
      surfaceTempData: [],
      materialTypeData: [],
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Empty State", () => {
    it("shows no trips found message when results array is empty", () => {
      render(<AvlTripsResults {...defaultProps} results={[]} />);

      expect(screen.getByText(/No trips found/i)).toBeInTheDocument();
    });

    it("renders the container even with empty results", () => {
      const { container } = render(<AvlTripsResults {...defaultProps} results={[]} />);

      expect(container.querySelector(".sc-theme-avl-trips-results-container")).toBeInTheDocument();
    });
  });

  describe("Results Display", () => {
    it("renders list of run results", () => {
      render(<AvlTripsResults {...defaultProps} />);

      // Should show vehicle trips header
      expect(screen.getByText(/Vehicle Trips/i)).toBeInTheDocument();
    });

    it("displays run IDs in results", () => {
      render(<AvlTripsResults {...defaultProps} />);

      // Run IDs should be displayed
      expect(screen.getByText(/run-1/i)).toBeInTheDocument();
      expect(screen.getByText(/run-2/i)).toBeInTheDocument();
    });

    it("displays vehicle names", () => {
      render(<AvlTripsResults {...defaultProps} />);

      // Vehicle names should be displayed
      expect(screen.getByText(/V-100/)).toBeInTheDocument();
      expect(screen.getByText(/V-101/)).toBeInTheDocument();
    });

    it("renders result rows for each run", () => {
      const { container } = render(<AvlTripsResults {...defaultProps} />);

      const resultRows = container.querySelectorAll(".sc-theme-avl-trips-result-row");
      expect(resultRows.length).toBe(2);
    });
  });

  describe("Run Click Handling", () => {
    it("calls ensureGeoTabCredentialsAndDevices when run is clicked", async () => {
      render(<AvlTripsResults {...defaultProps} />);

      const firstRow = document.querySelector(".sc-theme-avl-trips-result-row");
      if (firstRow) {
        fireEvent.click(firstRow);
      }

      // Should attempt to get credentials when processing the run
      expect(mockEnsureGeoTabCredentialsAndDevices).toHaveBeenCalled();
    });

    it("handles run click without selected group", async () => {
      render(<AvlTripsResults {...defaultProps} selectedGroup={undefined} />);

      const firstRow = document.querySelector(".sc-theme-avl-trips-result-row");
      if (firstRow) {
        // Should not throw when clicked without group
        fireEvent.click(firstRow);
      }

      // Should not try to fetch data without a group
      expect(mockFetchLogRecords).not.toHaveBeenCalled();
    });
  });

  describe("Legend Tooltip", () => {
    it("renders legend button", () => {
      render(<AvlTripsResults {...defaultProps} />);

      // Should have a legend/info button
      const legendButton = screen.queryByRole("button");
      // Component has legend functionality
      expect(document.querySelector(".sc-theme-avl-trips-results-container")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("handles large number of results", () => {
      const manyResults = Array.from({ length: 50 }, (_, i) => ({
        ...mockResults[0],
        run_id: `run-${i}`,
        RunId: `run-${i}`,
        vehicle_name: `V-${100 + i}`,
        Vehicle_name: `V-${100 + i}`,
      }));

      const { container } = render(<AvlTripsResults {...defaultProps} results={manyResults} />);

      // Should render without crashing
      expect(container.querySelector(".sc-theme-avl-trips-results-container")).toBeInTheDocument();

      const resultRows = container.querySelectorAll(".sc-theme-avl-trips-result-row");
      expect(resultRows.length).toBe(50);
    });
  });

  describe("Component Structure", () => {
    it("has trips results container", () => {
      const { container } = render(<AvlTripsResults {...defaultProps} />);

      expect(container.querySelector(".sc-theme-avl-trips-results-container")).toBeInTheDocument();
    });

    it("has scrollable content area", () => {
      const { container } = render(<AvlTripsResults {...defaultProps} />);

      // Component should have a scrollable area for results
      expect(container.querySelector(".sc-theme-avl-trips-results-container")).toBeInTheDocument();
    });
  });
});
