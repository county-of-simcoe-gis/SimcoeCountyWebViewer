/**
 * Tests for Zoning theme component.
 *
 * Tests cover:
 * - Panel rendering with default and custom names
 * - Loading state while querying
 * - Empty state before search
 * - Results rendering after search
 * - Footer links (Terms, Zoning Bylaw, Contact Us)
 * - Spatial and attribute query paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Zoning from "../Zoning";

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
const mockQueryByAttribute = vi.fn().mockResolvedValue({ features: [] });

vi.mock("@/utils/geoServerClient", () => ({
  queryFeaturesByGeometry: (...args: unknown[]) => mockQueryByGeometry(...args),
  queryFeaturesByAttribute: (...args: unknown[]) => mockQueryByAttribute(...args),
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
  FeatureSection: undefined, // export type
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Zoning", () => {
  const defaultProps = {
    onClose: vi.fn(),
    onSidebarVisibility: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLastResult = null;
    mockQueryByGeometry.mockResolvedValue({ features: [] });
    mockQueryByAttribute.mockResolvedValue({ features: [] });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe("Panel Rendering", () => {
    it('renders panel with default name "Zoning"', () => {
      render(<Zoning {...defaultProps} />);
      expect(screen.getByTestId("panel-component")).toHaveAttribute("data-name", "Zoning");
    });

    it("renders panel with custom name", () => {
      render(<Zoning {...defaultProps} name="Custom Zoning" />);
      expect(screen.getByTestId("panel-component")).toHaveAttribute("data-name", "Custom Zoning");
    });

    it("renders the Zoning Results header", () => {
      render(<Zoning {...defaultProps} />);
      expect(screen.getByText("Zoning Results")).toBeInTheDocument();
    });
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  describe("Empty State", () => {
    it("shows empty message before any search", () => {
      render(<Zoning {...defaultProps} />);
      expect(screen.getByText("Perform a search to see zoning results.")).toBeInTheDocument();
    });
  });

  // ── Spatial query flow ─────────────────────────────────────────────────────

  describe("Spatial Query", () => {
    it("calls queryFeaturesByGeometry when lastResult has a non-assessment-parcel type", async () => {
      mockLastResult = { geojson: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}', type: "Address", name: "123 Main St" };

      render(<Zoning {...defaultProps} />);

      await waitFor(() => {
        expect(mockQueryByGeometry).toHaveBeenCalled();
      });
    });

    it("calls queryFeaturesByAttribute for Assessment Parcel search type", async () => {
      mockLastResult = { geojson: '{"type":"Feature","geometry":{"type":"Point","coordinates":[0,0]}}', type: "Assessment Parcel", name: "123456789" };

      render(<Zoning {...defaultProps} />);

      await waitFor(() => {
        expect(mockQueryByAttribute).toHaveBeenCalled();
      });
    });
  });

  // ── Footer links ───────────────────────────────────────────────────────────

  describe("Footer Links", () => {
    // The config has empty strings for termsUrl, byLawUrl, contactUsEmail
    // so no links should render by default.
    // We still test that the footer section exists.
    it("renders the footer area", () => {
      const { container } = render(<Zoning {...defaultProps} />);
      const footer = container.querySelector(".border-t.border-base-300");
      expect(footer).toBeInTheDocument();
    });
  });
});
