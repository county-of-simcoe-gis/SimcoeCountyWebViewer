import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResultsPopup, { createPropertyResult, createCondoResult, createIdentifyResult } from "@/components/ResultsPopup";
import { Feature } from "ol";
import { Point } from "ol/geom";

// Mock CSS imports
vi.mock("@/components/ResultsPopup.css", () => ({}));
vi.mock("@/components/RecordSelectorPopup.css", () => ({}));

// Mock React Icons
vi.mock("react-icons/fa", () => ({
  FaHome: () => <div data-testid="home-icon">Home</div>,
  FaBuilding: () => <div data-testid="building-icon">Building</div>,
  FaLayerGroup: () => <div data-testid="layer-icon">LayerGroup</div>,
  FaChevronLeft: () => <div data-testid="chevron-left-icon">ChevronLeft</div>,
  FaChevronRight: () => <div data-testid="chevron-right-icon">ChevronRight</div>,
}));

// Mock PropertyPopup component
vi.mock("@/components/PropertyPopup", () => ({
  default: ({ propInfo, onClose }: any) => (
    <div data-testid="property-popup">
      <div data-testid="property-arn">{propInfo.ARN}</div>
      <div data-testid="property-address">{propInfo.Address}</div>
      <button onClick={onClose} data-testid="close-button">
        Close
      </button>
    </div>
  ),
}));

// Mock OpenLayers Feature
vi.mock("ol", () => ({
  Feature: vi.fn(function (config: any) {
    this.config = config;
    this.getGeometry = vi.fn(() => ({
      getExtent: vi.fn(() => [0, 0, 100, 100]),
    }));
  }),
}));

vi.mock("ol/geom", () => ({
  Point: vi.fn(function (coords: number[]) {
    this.coords = coords;
  }),
}));

describe("ResultsPopup", () => {
  const mockOnClose = vi.fn();
  const mockOnClearParcelLayer = vi.fn();
  const mockOnSelectResult = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Helper Functions", () => {
    describe("createPropertyResult", () => {
      it("creates a property result with all fields", () => {
        const feature = new Feature({ geometry: new Point([0, 0]) });
        const propInfo = {
          ARN: "1234567890",
          Address: "123 Main St",
          AssessedValue: "500000",
        };

        const result = createPropertyResult("1234567890", "123 Main St", feature, propInfo);

        expect(result.id).toBe("property_1234567890");
        expect(result.type).toBe("property");
        expect(result.displayName).toBe("123 Main St");
        expect(result.data.ARN).toBe("1234567890");
        expect(result.data.Address).toBe("123 Main St");
        expect(result.data.feature).toBe(feature);
        expect(result.data.propInfo).toBe(propInfo);
      });

      it("uses ARN as display name when address is not provided", () => {
        const feature = new Feature({ geometry: new Point([0, 0]) });
        const propInfo = { ARN: "1234567890" };

        const result = createPropertyResult("1234567890", "", feature, propInfo);

        expect(result.displayName).toBe("1234567890");
      });
    });

    describe("createCondoResult", () => {
      it("creates a condo result with unit number and address", () => {
        const feature = new Feature({ geometry: new Point([0, 0]) });
        const propInfo = {
          ARN: "12345678901234567890",
          Address: "456 Condo Tower",
        };

        const result = createCondoResult("12345678901234567890", "101", "456 Condo Tower", feature, propInfo);

        expect(result.id).toBe("condo_12345678901234567890");
        expect(result.type).toBe("condo");
        expect(result.displayName).toBe("Unit 101 - 456 Condo Tower");
        expect(result.data.ARN).toBe("12345678901234567890");
        expect(result.data.UnitNumber).toBe("101");
        expect(result.data.Address).toBe("456 Condo Tower");
        expect(result.data.feature).toBe(feature);
        expect(result.data.propInfo).toBe(propInfo);
      });

      it("creates a condo result without unit number", () => {
        const feature = new Feature({ geometry: new Point([0, 0]) });

        const result = createCondoResult("12345678901234567890", undefined, "456 Condo Tower", feature);

        expect(result.displayName).toBe("456 Condo Tower");
        expect(result.data.UnitNumber).toBeUndefined();
      });

      it("uses ARN when unit number and address are missing", () => {
        const feature = new Feature({ geometry: new Point([0, 0]) });

        const result = createCondoResult("12345678901234567890", undefined, undefined, feature);

        expect(result.displayName).toBe("12345678901234567890");
      });
    });

    describe("createIdentifyResult", () => {
      it("creates an identify result with all fields", () => {
        const feature = new Feature({ geometry: new Point([0, 0]) });
        const attributes = {
          name: "Test Feature",
          type: "Point",
          elevation: 100,
        };

        const result = createIdentifyResult("Test Layer", "feature_123", attributes, feature);

        expect(result.id).toBe("identify_Test Layer_feature_123");
        expect(result.type).toBe("identify");
        expect(result.displayName).toBe("Test Feature");
        expect(result.data.layerName).toBe("Test Layer");
        expect(result.data.featureId).toBe("feature_123");
        expect(result.data.attributes).toEqual(attributes);
        expect(result.data.feature).toBe(feature);
      });

      it("falls back to NAME attribute for display name", () => {
        const attributes = {
          NAME: "Upper Case Name",
          type: "Point",
        };

        const result = createIdentifyResult("Test Layer", "feature_123", attributes);

        expect(result.displayName).toBe("Upper Case Name");
      });

      it("falls back to label attribute for display name", () => {
        const attributes = {
          label: "Label Name",
          type: "Point",
        };

        const result = createIdentifyResult("Test Layer", "feature_123", attributes);

        expect(result.displayName).toBe("Label Name");
      });

      it("uses layer name when no name attributes exist", () => {
        const attributes = {
          type: "Point",
          elevation: 100,
        };

        const result = createIdentifyResult("Test Layer", "feature_123", attributes);

        expect(result.displayName).toBe("Test Layer");
      });
    });
  });

  describe("Component Rendering", () => {
    it("renders with a single property result", () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const propInfo = {
        ARN: "1234567890",
        Address: "123 Main St",
        AssessedValue: "500000",
      };
      const results = [createPropertyResult("1234567890", "123 Main St", feature, propInfo)];

      render(<ResultsPopup results={results} onClose={mockOnClose} />);

      expect(screen.getByText(/Results/i)).toBeInTheDocument();
    });

    it("renders with multiple condo results", () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const results = [
        createCondoResult("12345678901234567890", "101", "456 Condo Tower", feature),
        createCondoResult("12345678901234567891", "102", "456 Condo Tower", feature),
        createCondoResult("12345678901234567892", "103", "456 Condo Tower", feature),
      ];

      render(<ResultsPopup results={results} onClose={mockOnClose} />);

      expect(screen.getByText(/Results \(3\)/i)).toBeInTheDocument();
    });

    it("renders identify results with attributes", () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const attributes = {
        name: "Test Feature",
        type: "Point",
        elevation: 100,
      };
      const results = [createIdentifyResult("Test Layer", "feature_123", attributes, feature)];

      render(<ResultsPopup results={results} onClose={mockOnClose} />);

      expect(screen.getByText(/Results/i)).toBeInTheDocument();
    });

    it("shows loading state when isLoadingResults is true", async () => {
      const user = userEvent.setup();
      render(<ResultsPopup results={[]} onClose={mockOnClose} isLoadingResults={true} />);

      // Expand sidebar to see loading state
      const toggleButton = screen.getByLabelText(/expand sidebar/i);
      await user.click(toggleButton);

      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });

    it("shows error message when resultsError is provided", async () => {
      const user = userEvent.setup();
      render(<ResultsPopup results={[]} onClose={mockOnClose} resultsError="Failed to load results" />);

      // Expand sidebar to see error message
      const toggleButton = screen.getByLabelText(/expand sidebar/i);
      await user.click(toggleButton);

      expect(screen.getByText(/Failed to load results/i)).toBeInTheDocument();
    });

    it("shows empty message when no results", async () => {
      const user = userEvent.setup();
      render(<ResultsPopup results={[]} onClose={mockOnClose} />);

      // Expand sidebar to see empty message
      const toggleButton = screen.getByLabelText(/expand sidebar/i);
      await user.click(toggleButton);

      expect(screen.getByText(/No results found at this location/i)).toBeInTheDocument();
    });
  });

  describe("Result Selection", () => {
    it("auto-selects first result on mount", async () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const propInfo = {
        ARN: "1234567890",
        Address: "123 Main St",
      };
      const results = [createPropertyResult("1234567890", "123 Main St", feature, propInfo), createPropertyResult("0987654321", "456 Oak Ave", feature, propInfo)];

      render(<ResultsPopup results={results} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByTestId("property-popup")).toBeInTheDocument();
      });
    });

    it("calls onSelectResult when a result is selected", async () => {
      const _user = userEvent.setup();
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const propInfo = {
        ARN: "1234567890",
        Address: "123 Main St",
      };
      const results = [createPropertyResult("1234567890", "123 Main St", feature, propInfo), createPropertyResult("0987654321", "456 Oak Ave", feature, propInfo)];

      mockOnSelectResult.mockResolvedValue(undefined);

      render(<ResultsPopup results={results} onClose={mockOnClose} onSelectResult={mockOnSelectResult} />);

      await waitFor(() => {
        expect(mockOnSelectResult).toHaveBeenCalledWith(results[0]);
      });
    });

    it("shows loading state while fetching result details", async () => {
      const _user = userEvent.setup();
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const results = [
        createCondoResult("12345678901234567890", "101", "456 Condo Tower", feature), // No propInfo
      ];

      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      mockOnSelectResult.mockReturnValue(promise);

      render(<ResultsPopup results={results} onClose={mockOnClose} onSelectResult={mockOnSelectResult} />);

      await waitFor(() => {
        expect(screen.getByText(/Loading details/i)).toBeInTheDocument();
      });

      // Resolve the promise
      resolvePromise!();
      await waitFor(() => {
        expect(screen.queryByText(/Loading details/i)).not.toBeInTheDocument();
      });
    });

    it("handles errors during result selection gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const propInfo = {
        ARN: "1234567890",
        Address: "123 Main St",
      };
      const results = [createPropertyResult("1234567890", "123 Main St", feature, propInfo)];

      mockOnSelectResult.mockRejectedValue(new Error("Failed to load details"));

      render(<ResultsPopup results={results} onClose={mockOnClose} onSelectResult={mockOnSelectResult} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading result details:", expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Property Result Content", () => {
    it("renders PropertyPopup for property result with propInfo", async () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const propInfo = {
        ARN: "1234567890",
        Address: "123 Main St",
        AssessedValue: "500000",
      };
      const results = [createPropertyResult("1234567890", "123 Main St", feature, propInfo)];

      render(<ResultsPopup results={results} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

      await waitFor(() => {
        expect(screen.getByTestId("property-popup")).toBeInTheDocument();
        expect(screen.getByTestId("property-arn")).toHaveTextContent("1234567890");
        expect(screen.getByTestId("property-address")).toHaveTextContent("123 Main St");
      });
    });

    it("shows loading message for property without propInfo", async () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      // Create result without propInfo
      const result = {
        id: "property_1234567890",
        type: "property" as const,
        displayName: "123 Main St",
        data: {
          ARN: "1234567890",
          Address: "123 Main St",
          feature,
          propInfo: undefined, // No propInfo
        },
      };

      render(<ResultsPopup results={[result]} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Loading property details/i)).toBeInTheDocument();
      });
    });

    it("passes onClearParcelLayer to PropertyPopup", async () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const propInfo = {
        ARN: "1234567890",
        Address: "123 Main St",
      };
      const results = [createPropertyResult("1234567890", "123 Main St", feature, propInfo)];

      render(<ResultsPopup results={results} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

      await waitFor(() => {
        expect(screen.getByTestId("property-popup")).toBeInTheDocument();
      });
    });
  });

  describe("Condo Result Content", () => {
    it("renders PropertyPopup for condo result with propInfo", async () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const propInfo = {
        ARN: "12345678901234567890",
        Address: "456 Condo Tower",
        UnitNumber: "101",
      };
      const results = [createCondoResult("12345678901234567890", "101", "456 Condo Tower", feature, propInfo)];

      render(<ResultsPopup results={results} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByTestId("property-popup")).toBeInTheDocument();
        expect(screen.getByTestId("property-arn")).toHaveTextContent("12345678901234567890");
      });
    });

    it("shows loading message for condo without propInfo", async () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      // Create condo result without propInfo (default behavior)
      const results = [createCondoResult("12345678901234567890", "101", "456 Condo Tower", feature)];

      render(<ResultsPopup results={results} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Loading property details/i)).toBeInTheDocument();
      });
    });

    it("renders multiple condo units correctly", () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const propInfo = {
        ARN: "12345678901234567890",
        Address: "456 Condo Tower",
      };
      const results = [
        createCondoResult("12345678901234567890", "101", "456 Condo Tower", feature, propInfo),
        createCondoResult("12345678901234567891", "102", "456 Condo Tower", feature),
        createCondoResult("12345678901234567892", "103", "456 Condo Tower", feature),
      ];

      render(<ResultsPopup results={results} onClose={mockOnClose} />);

      // Check that Results header shows 3 results
      expect(screen.getByText(/Results \(3\)/i)).toBeInTheDocument();
    });
  });

  describe("Identify Result Content", () => {
    it("renders identify result with attributes table", async () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const attributes = {
        name: "Test Feature",
        type: "Point",
        elevation: 100,
        status: "Active",
      };
      const results = [createIdentifyResult("Test Layer", "feature_123", attributes, feature)];

      const { container } = render(<ResultsPopup results={results} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Test Layer" })).toBeInTheDocument();

        // Check attributes container structure
        const attrs = container.querySelector('[data-testid="result-attributes"]');
        expect(attrs).toBeInTheDocument();

        // Check for attribute keys (rendered as InfoRow labels with colons,
        // title-cased via formatFieldName)
        expect(screen.getByText("Name:")).toBeInTheDocument();
        expect(screen.getByText("Type:")).toBeInTheDocument();
        expect(screen.getByText("Elevation:")).toBeInTheDocument();
        expect(screen.getByText("Status:")).toBeInTheDocument();

        // Check for attribute values within the rows
        expect(screen.getByText("100")).toBeInTheDocument();
        expect(screen.getByText("Active")).toBeInTheDocument();
        // Note: "Test Feature" and "Point" also appear in sidebar, so we verify container exists instead
      });
    });

    it("renders multiple identify results", () => {
      const attributes1 = { name: "Feature 1", type: "Point" };
      const attributes2 = { name: "Feature 2", type: "Line" };
      const results = [createIdentifyResult("Layer 1", "feature_1", attributes1), createIdentifyResult("Layer 2", "feature_2", attributes2)];

      render(<ResultsPopup results={results} onClose={mockOnClose} />);

      expect(screen.getByText(/Results \(2\)/i)).toBeInTheDocument();
    });

    it("handles empty attributes object", async () => {
      const attributes = {};
      const results = [createIdentifyResult("Test Layer", "feature_123", attributes)];

      const { container } = render(<ResultsPopup results={results} onClose={mockOnClose} />);

      await waitFor(() => {
        // Check that attributes container has no InfoRow children
        const attrs = container.querySelector('[data-testid="result-attributes"]');
        expect(attrs).toBeInTheDocument();
        const infoRows = attrs?.querySelectorAll("[data-testid='info-row']");
        expect(infoRows?.length).toBe(0);
      });
    });
  });

  describe("Mixed Result Types", () => {
    it("renders results of different types together", () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const propInfo = { ARN: "1234567890", Address: "123 Main St" };
      const results = [
        createPropertyResult("1234567890", "123 Main St", feature, propInfo),
        createCondoResult("12345678901234567890", "101", "456 Condo Tower", feature),
        createIdentifyResult("Test Layer", "feature_123", { name: "Test Feature" }),
      ];

      render(<ResultsPopup results={results} onClose={mockOnClose} />);

      expect(screen.getByText(/Results \(3\)/i)).toBeInTheDocument();
    });

    it("auto-selects first result regardless of type", () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const attributes = { name: "Test Feature", type: "Point" };
      const propInfo = { ARN: "1234567890", Address: "123 Main St" };
      const results = [createIdentifyResult("Test Layer", "feature_123", attributes, feature), createPropertyResult("1234567890", "123 Main St", feature, propInfo)];

      render(<ResultsPopup results={results} onClose={mockOnClose} />);

      // Should show identify result content first (auto-selected) - check for layer heading
      expect(screen.getByRole("heading", { name: "Test Layer" })).toBeInTheDocument();
    });
  });

  describe("Close and Cleanup", () => {
    it("calls onClose when PropertyPopup close button is clicked", async () => {
      const user = userEvent.setup();
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const propInfo = {
        ARN: "1234567890",
        Address: "123 Main St",
      };
      const results = [createPropertyResult("1234567890", "123 Main St", feature, propInfo)];

      render(<ResultsPopup results={results} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByTestId("property-popup")).toBeInTheDocument();
      });

      const closeButton = screen.getByTestId("close-button");
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Icon Rendering", () => {
    it("uses correct icon for property results in collapsed mode", async () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const propInfo = { ARN: "1234567890", Address: "123 Main St" };
      const results = [createPropertyResult("1234567890", "123 Main St", feature, propInfo)];

      const { container } = render(<ResultsPopup results={results} onClose={mockOnClose} />);

      await waitFor(() => {
        // Check that icon is rendered in collapsed mode (default state)
        const icons = container.querySelectorAll('[data-testid="result-icon"]');
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it("uses correct icon for condo results in collapsed mode", async () => {
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const results = [createCondoResult("12345678901234567890", "101", "456 Condo Tower", feature)];

      const { container } = render(<ResultsPopup results={results} onClose={mockOnClose} />);

      await waitFor(() => {
        // Check that icon is rendered in collapsed mode (default state)
        const icons = container.querySelectorAll('[data-testid="result-icon"]');
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it("uses correct icon for identify results in collapsed mode", async () => {
      const attributes = { name: "Test Feature" };
      const results = [createIdentifyResult("Test Layer", "feature_123", attributes)];

      const { container } = render(<ResultsPopup results={results} onClose={mockOnClose} />);

      await waitFor(() => {
        // Check that icon is rendered in collapsed mode (default state)
        const icons = container.querySelectorAll('[data-testid="result-icon"]');
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it("shows expanded sidebar when toggle button is clicked", async () => {
      const user = userEvent.setup();
      const feature = new Feature({ geometry: new Point([0, 0]) });
      const propInfo = { ARN: "1234567890", Address: "123 Main St" };
      const results = [createPropertyResult("1234567890", "123 Main St", feature, propInfo)];

      const { container } = render(<ResultsPopup results={results} onClose={mockOnClose} />);

      // Initially collapsed, click to expand sidebar
      const toggleButton = screen.getByLabelText(/expand sidebar/i);
      await user.click(toggleButton);

      await waitFor(() => {
        // Check that sidebar items are shown in expanded mode
        const sidebarItems = container.querySelectorAll('[data-testid="record-selector-sidebar-item"]');
        expect(sidebarItems.length).toBeGreaterThan(0);
      });
    });
  });
});
