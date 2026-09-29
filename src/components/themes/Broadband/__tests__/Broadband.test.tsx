/**
 * Tests for Broadband theme component.
 *
 * Tests cover:
 * - Panel rendering with default and custom names
 * - Disclaimer text display
 * - Loading state while querying
 * - Empty state before search
 * - Spatial query triggered on search results
 * - Footer links (Terms, About the Data, Contact Us)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Broadband from "../Broadband";

// ── Store mocks ──────────────────────────────────────────────────────────────

let mockLastResult: Record<string, unknown> | null = null;

vi.mock("@/stores/searchStore", () => ({
  useSearchStore: vi.fn((selector) => {
    const state = { lastResult: mockLastResult };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/stores/mapStore", () => ({
  useMapStore: vi.fn((selector) => {
    const state = {
      map: {
        getView: () => ({ fit: vi.fn(), calculateExtent: () => [0, 0, 1, 1] }),
        getSize: () => [800, 600],
      },
    };
    return selector ? selector(state) : state;
  }),
}));

// ── LayerManager mock ────────────────────────────────────────────────────────

vi.mock("@/utils/openlayers/LayerManager", () => ({
  LayerManager: {
    addLayer: vi.fn(() => "mock-layer-id"),
    removeLayer: vi.fn(),
  },
}));

// ── FeatureHelpers mock ──────────────────────────────────────────────────────

vi.mock("@/utils/openlayers/FeatureHelpers", () => ({
  FeatureHelpers: {
    setGeometry: vi.fn(() => "POLYGON((0 0,1 0,1 1,0 1,0 0))"),
  },
}));

vi.mock("@/utils/openlayers/types", () => ({
  OL_DATA_TYPES: { WKT: "WKT" },
}));

// ── geoServerClient mock ────────────────────────────────────────────────────

const mockQueryByGeometry = vi.fn().mockResolvedValue({ features: [] });

vi.mock("@/utils/geoServerClient", () => ({
  queryFeaturesByGeometry: (...args: unknown[]) => mockQueryByGeometry(...args),
}));

// ── helpersUI mock ───────────────────────────────────────────────────────────

const mockShowURLWindow = vi.fn();

vi.mock("@/utils/helpersUI", () => ({
  showURLWindow: (...args: unknown[]) => mockShowURLWindow(...args),
}));

// ── PanelComponent mock ─────────────────────────────────────────────────────

vi.mock("@/components/PanelComponent", () => ({
  default: vi.fn(({ children, name }: { children: React.ReactNode; name: string }) => (
    <div data-testid="panel-component" data-name={name}>
      {children}
    </div>
  )),
}));

// ── SpatialQueryResults mock ─────────────────────────────────────────────────

vi.mock("../../shared/SpatialQueryResults", () => ({
  default: vi.fn(({ sections, emptyMessage }: any) => {
    const total = sections.reduce((sum: number, s: any) => sum + s.features.length, 0);
    if (sections.length === 0 || total === 0) {
      return <div data-testid="spatial-results-empty">{emptyMessage}</div>;
    }
    return (
      <div data-testid="spatial-results">
        {sections.map((s: any) => (
          <div key={s.title} data-testid={`section-${s.title}`}>
            {s.title}: {s.features.length} features
          </div>
        ))}
      </div>
    );
  }),
  FeatureSection: undefined,
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Broadband", () => {
  const defaultProps = {
    onClose: vi.fn(),
    onSidebarVisibility: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLastResult = null;
    mockQueryByGeometry.mockResolvedValue({ features: [] });
    mockShowURLWindow.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ── Panel rendering ────────────────────────────────────────────────────────

  describe("Panel Rendering", () => {
    it('renders panel with default name "Broadband"', () => {
      render(<Broadband {...defaultProps} />);
      expect(screen.getByTestId("panel-component")).toHaveAttribute("data-name", "Broadband");
    });

    it("renders panel with custom name", () => {
      render(<Broadband {...defaultProps} name="Broadband Map" />);
      expect(screen.getByTestId("panel-component")).toHaveAttribute("data-name", "Broadband Map");
    });

    it("renders the Broadband Results header", () => {
      render(<Broadband {...defaultProps} />);
      expect(screen.getByText("Broadband Results")).toBeInTheDocument();
    });

    it("renders the disclaimer text", () => {
      render(<Broadband {...defaultProps} />);
      expect(screen.getByText(/Broadband information on this page has been provided by external sources/)).toBeInTheDocument();
    });
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  describe("Empty State", () => {
    it("shows empty message before any search", () => {
      render(<Broadband {...defaultProps} />);
      expect(screen.getByText("Perform a search to see broadband results.")).toBeInTheDocument();
    });
  });

  // ── Query flow ─────────────────────────────────────────────────────────────

  describe("Spatial Query", () => {
    it("calls queryFeaturesByGeometry when lastResult has geojson", async () => {
      mockLastResult = { geojson: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}', type: "Address", name: "123 Main St" };

      render(<Broadband {...defaultProps} />);

      await waitFor(() => {
        expect(mockQueryByGeometry).toHaveBeenCalled();
      });
    });

    it("does not call query when lastResult is null", () => {
      mockLastResult = null;
      render(<Broadband {...defaultProps} />);
      expect(mockQueryByGeometry).not.toHaveBeenCalled();
    });
  });

  // ── Footer links ───────────────────────────────────────────────────────────

  describe("Footer Links", () => {
    it("renders Terms button", () => {
      render(<Broadband {...defaultProps} />);
      const btn = screen.getByRole("button", { name: "Terms" });
      expect(btn).toBeInTheDocument();
    });

    it("renders About the Data link", () => {
      render(<Broadband {...defaultProps} />);
      const link = screen.getByText("About the Data");
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute("href", "https://open.canada.ca/data/en/dataset/00a331db-121b-445d-b119-35dbbe3eedd9");
    });

    it("renders Contact Us link", () => {
      render(<Broadband {...defaultProps} />);
      const link = screen.getByText("Contact Us");
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute("href", "mailto:sim-gis@simcoe.ca");
    });

    it("Terms button calls showURLWindow", async () => {
      render(<Broadband {...defaultProps} />);
      const btn = screen.getByRole("button", { name: "Terms" });
      await userEvent.click(btn);
      expect(mockShowURLWindow).toHaveBeenCalledWith("https://maps.simcoe.ca/terms.html", false, "normal", false, false, "Terms");
    });
  });
});
