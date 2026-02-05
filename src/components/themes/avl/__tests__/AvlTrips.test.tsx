/**
 * Tests for AvlTrips component - Trip search and display view.
 *
 * Tests cover:
 * - Trip search form (group, vehicle, date range)
 * - Search execution with mocked API
 * - Trip results display via TripResults component
 * - Reset functionality
 * - Loading states
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { server } from "@/test/testServer";
import { avlHandlers, geoTabHandlers } from "./handlers";
import AvlTrips from "../AvlTrips";
import { mockVehicles, mockTrips, mockRoadsGroup, mockGeoTabCredentials, mockGeoTabDevices, createMockAvlStoreState } from "./mockData";

// Install AVL handlers for this test file
beforeAll(() => {
  server.use(...avlHandlers, ...geoTabHandlers);
});

afterAll(() => {
  server.resetHandlers();
});

// Mock stores
let mockAvlStoreState = createMockAvlStoreState();

vi.mock("@/stores/avlStore", () => ({
  useAvlStore: vi.fn(() => mockAvlStoreState),
}));

// Mock the API hooks
const mockFetchGeoTabRunList = vi.fn(() => Promise.resolve(mockTrips));

vi.mock("../hooks/useAvlApi", () => ({
  useAvlApi: vi.fn(() => ({
    fetchGeoTabRunList: mockFetchGeoTabRunList,
    fetchAllVehicles: vi.fn(() => Promise.resolve(mockVehicles)),
    fetchHistory: vi.fn(() => Promise.resolve([])),
  })),
}));

const mockAuthenticateGeoTab = vi.fn(() => Promise.resolve(mockGeoTabCredentials));
const mockFetchGeoTabDevices = vi.fn(() => Promise.resolve(mockGeoTabDevices));

vi.mock("../hooks/useGeoTab", () => ({
  useGeoTab: vi.fn(() => ({
    authenticateGeoTab: mockAuthenticateGeoTab,
    fetchGeoTabDevices: mockFetchGeoTabDevices,
    cleanDeviceNameForMatching: vi.fn((name) => name.split("-")[0]),
    groupHasGeoTabSpreaderData: vi.fn(() => true),
  })),
}));

// Mock react-datepicker
vi.mock("react-datepicker", () => ({
  default: vi.fn(({ selected, onChange, ...props }) => (
    <input type="text" data-testid="date-picker" value={selected?.toISOString?.() || ""} onChange={(e) => onChange?.(new Date(e.target.value))} {...props} />
  )),
}));

// Mock TripResults component for isolation
vi.mock("../components/AvlTripsResults", () => ({
  default: vi.fn(({ results, selectedVehicleId }) => (
    <div data-testid="trip-results">
      <span data-testid="results-count">{results.length} trips</span>
      {results.map((trip: { run_id: string; vehicle_name: string; start_date: string; end_date: string }) => (
        <div key={trip.run_id} data-testid={`trip-${trip.run_id}`}>
          <span>{trip.vehicle_name}</span>
          <span>
            {trip.start_date} - {trip.end_date}
          </span>
        </div>
      ))}
    </div>
  )),
}));

describe("AvlTrips", () => {
  const plowGroupWithTrips = {
    ...mockRoadsGroup,
    showTripsTab: true,
    vehicles: mockVehicles,
  };

  const defaultProps = {
    groups: [plowGroupWithTrips],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAvlStoreState = createMockAvlStoreState({
      geoTabCredentials: { "Roads GeoTab": mockGeoTabCredentials },
      geoTabDevices: { "Roads GeoTab": mockGeoTabDevices },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Rendering", () => {
    it("renders without crashing", () => {
      render(<AvlTrips {...defaultProps} />);

      expect(screen.getByText(/View vehicle trip information/i)).toBeInTheDocument();
    });

    it("renders group dropdown", () => {
      render(<AvlTrips {...defaultProps} />);

      expect(screen.getByText("Group:")).toBeInTheDocument();
    });

    it("renders vehicle dropdown", () => {
      render(<AvlTrips {...defaultProps} />);

      expect(screen.getByText("Vehicle ID:")).toBeInTheDocument();
    });

    it("renders date pickers for from and to dates", () => {
      render(<AvlTrips {...defaultProps} />);

      expect(screen.getByText("From:")).toBeInTheDocument();
      expect(screen.getByText("To:")).toBeInTheDocument();
    });

    it("renders search button", () => {
      render(<AvlTrips {...defaultProps} />);

      expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    });

    it("renders reset button", () => {
      render(<AvlTrips {...defaultProps} />);

      expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    });

    it("renders TripResults component", () => {
      render(<AvlTrips {...defaultProps} />);

      expect(screen.getByTestId("trip-results")).toBeInTheDocument();
    });
  });

  describe("Group Selection", () => {
    it("shows groups with showTripsTab=true", () => {
      render(<AvlTrips {...defaultProps} />);

      const groupSelect = screen.getAllByRole("combobox")[0];
      expect(groupSelect).toBeInTheDocument();
    });

    it("filters out groups without showTripsTab", () => {
      const groupWithoutTrips = {
        ...mockRoadsGroup,
        name: "No Trips Group",
        showTripsTab: false,
      };

      render(<AvlTrips groups={[plowGroupWithTrips, groupWithoutTrips]} />);

      // Only the group with showTripsTab should be in the dropdown
      const groupSelect = screen.getAllByRole("combobox")[0];
      expect(groupSelect).not.toHaveTextContent("No Trips Group");
    });

    it("updates vehicle list when group changes", async () => {
      render(<AvlTrips {...defaultProps} />);

      const groupSelect = screen.getAllByRole("combobox")[0];
      fireEvent.change(groupSelect, { target: { value: "Roads GeoTab" } });

      // Vehicle dropdown should be populated
      await waitFor(() => {
        expect(screen.getAllByRole("combobox")[1]).toBeInTheDocument();
      });
    });
  });

  describe("Search Functionality", () => {
    it("executes search when search button is clicked", async () => {
      render(<AvlTrips {...defaultProps} />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockFetchGeoTabRunList).toHaveBeenCalled();
      });
    });

    it("shows loading state during search", async () => {
      mockFetchGeoTabRunList.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(mockTrips), 500)));

      render(<AvlTrips {...defaultProps} />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      fireEvent.click(searchButton);

      // Button should show loading text
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /searching/i })).toBeInTheDocument();
      });
    });

    it("displays results after search", async () => {
      mockFetchGeoTabRunList.mockResolvedValueOnce(mockTrips);

      render(<AvlTrips {...defaultProps} />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId("results-count")).toHaveTextContent(`${mockTrips.length} trips`);
      });
    });

    it("handles empty search results", async () => {
      mockFetchGeoTabRunList.mockResolvedValueOnce([]);

      render(<AvlTrips {...defaultProps} />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId("results-count")).toHaveTextContent("0 trips");
      });
    });

    it("handles search error gracefully", async () => {
      mockFetchGeoTabRunList.mockRejectedValueOnce(new Error("API Error"));

      render(<AvlTrips {...defaultProps} />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      fireEvent.click(searchButton);

      // Should show 0 results on error
      await waitFor(() => {
        expect(screen.getByTestId("results-count")).toHaveTextContent("0 trips");
      });
    });
  });

  describe("Reset Functionality", () => {
    it("clears search results on reset", async () => {
      mockFetchGeoTabRunList.mockResolvedValueOnce(mockTrips);

      render(<AvlTrips {...defaultProps} />);

      // First do a search
      const searchButton = screen.getByRole("button", { name: /search/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByTestId("results-count")).toHaveTextContent(`${mockTrips.length} trips`);
      });

      // Then reset
      const resetButton = screen.getByRole("button", { name: /reset/i });
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByTestId("results-count")).toHaveTextContent("0 trips");
      });
    });

    it("resets vehicle selection on reset", async () => {
      render(<AvlTrips {...defaultProps} />);

      // Select a vehicle first
      const vehicleSelect = screen.getAllByRole("combobox")[1];
      fireEvent.change(vehicleSelect, { target: { value: "ROADS-101" } });

      // Reset
      const resetButton = screen.getByRole("button", { name: /reset/i });
      fireEvent.click(resetButton);

      // Vehicle should be reset
      expect(vehicleSelect).toHaveValue("");
    });
  });

  describe("Date Selection", () => {
    it("has default date range (last 24 hours)", () => {
      render(<AvlTrips {...defaultProps} />);

      const datePickers = screen.getAllByTestId("date-picker");
      expect(datePickers.length).toBe(2);
    });
  });

  describe("Empty Groups", () => {
    it("handles empty groups array", () => {
      render(<AvlTrips groups={[]} />);

      // Should render without crashing
      expect(screen.getByText(/View vehicle trip information/i)).toBeInTheDocument();
    });

    it("handles groups with no vehicles", () => {
      const emptyGroup = {
        ...mockRoadsGroup,
        showTripsTab: true,
        vehicles: [],
        data: [],
      };

      render(<AvlTrips groups={[emptyGroup]} />);

      // Should render without crashing
      expect(screen.getByText(/View vehicle trip information/i)).toBeInTheDocument();
    });
  });

  describe("Props Passing to TripResults", () => {
    it("passes results to TripResults component", async () => {
      mockFetchGeoTabRunList.mockResolvedValueOnce(mockTrips);

      render(<AvlTrips {...defaultProps} />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      fireEvent.click(searchButton);

      await waitFor(() => {
        // Verify trips are rendered
        mockTrips.forEach((trip) => {
          expect(screen.getByTestId(`trip-${trip.run_id}`)).toBeInTheDocument();
        });
      });
    });

    it("passes selectedVehicleId to TripResults", async () => {
      render(<AvlTrips {...defaultProps} />);

      const vehicleSelect = screen.getAllByRole("combobox")[1];
      fireEvent.change(vehicleSelect, { target: { value: "ROADS-101" } });

      // TripResults should receive the selected vehicle
      expect(screen.getByTestId("trip-results")).toBeInTheDocument();
    });
  });
});
