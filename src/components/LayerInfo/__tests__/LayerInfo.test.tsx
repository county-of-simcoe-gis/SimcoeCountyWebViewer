import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LayerInfo from "@/components/LayerInfo/LayerInfo";
import { useToastStore } from "@/hooks/useToast";
import * as layerInfoLib from "@/lib/layerInfo";
import type { LayerInfoData } from "@/types/layerInfo";

// Mock the layerInfo lib
vi.mock("@/lib/layerInfo");

// Mock useConfig hook
const mockConfig = {
  geoserverUrl: "https://geoserver.example.com",
  openLicenseUrl: "https://example.com/license",
  originUrl: "https://opengis.example.com",
};

vi.mock("@/hooks/useConfig", () => ({
  useConfig: () => ({
    config: mockConfig,
    loading: false,
    error: null,
  }),
}));

// Mock react-icons
vi.mock("react-icons/fa", () => ({
  FaPrint: (props: any) => <div data-testid="print-icon" {...props} />,
  FaExternalLinkAlt: (props: any) => <div data-testid="external-link-icon" {...props} />,
}));

// Mock window.print
const mockPrint = vi.fn();
window.print = mockPrint;

// Mock window.open
const mockWindowOpen = vi.fn();
window.open = mockWindowOpen;

describe("LayerInfo", () => {
  const mockLayerData: LayerInfoData = {
    name: "TestLayer",
    title: "Test Layer Title",
    abstract: "This is a test layer description",
    nativeCRS: "EPSG:3857",
    nativeBoundingBox: {
      minx: -8939184.811,
      maxx: -8801041.532,
      miny: 5454803.475,
      maxy: 5612759.41,
    },
    attributes: {
      attribute: [
        { name: "field1", binding: "java.lang.String" },
        { name: "field2", binding: "java.lang.Integer" },
        { name: "field3", binding: "java.lang.Double" },
      ],
    },
    namespace: {
      name: "simcoe",
      href: "https://geoserver.example.com/simcoe",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock implementation
    vi.mocked(layerInfoLib.fetchLayerInfo).mockResolvedValue(mockLayerData);
    vi.mocked(layerInfoLib.getFormattedProjection).mockReturnValue("EPSG:3857 - WGS 84 / Pseudo-Mercator");
    vi.mocked(layerInfoLib.getServerUrl).mockReturnValue("https://geoserver.example.com");
    vi.mocked(layerInfoLib.getDownloadUrl).mockReturnValue("https://geoserver.example.com/download/TestLayer");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading and Error States", () => {
    it("displays loading state initially", () => {
      vi.mocked(layerInfoLib.fetchLayerInfo).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      render(<LayerInfo layerURL="https://example.com/layer" />);

      expect(screen.getByText("Loading layer information...")).toBeInTheDocument();
    });

    it("displays error when no layer URL is provided", async () => {
      render(<LayerInfo layerURL="" />);

      await waitFor(() => {
        expect(screen.getByText("No layer URL provided")).toBeInTheDocument();
      });
    });

    it("displays error when layer URL is null", async () => {
      render(<LayerInfo layerURL="null" />);

      await waitFor(() => {
        expect(screen.getByText("No layer URL provided")).toBeInTheDocument();
      });
    });

    it("displays error when fetch fails", async () => {
      vi.mocked(layerInfoLib.fetchLayerInfo).mockResolvedValue(null);

      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.getByText("Failed to fetch layer information")).toBeInTheDocument();
      });
    });

    it("displays error when fetch throws exception", async () => {
      vi.mocked(layerInfoLib.fetchLayerInfo).mockRejectedValue(new Error("Network error"));

      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.getByText("Error loading layer information")).toBeInTheDocument();
      });
    });
  });

  describe("Content Rendering", () => {
    it("renders layer title correctly", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.getByText("Test Layer Title")).toBeInTheDocument();
      });
    });

    it("renders abstract section when abstract is provided", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.getByText("Abstract")).toBeInTheDocument();
        expect(screen.getByText("This is a test layer description")).toBeInTheDocument();
      });
    });

    it("does not render abstract section when abstract is missing", async () => {
      const dataWithoutAbstract = { ...mockLayerData, abstract: undefined };
      vi.mocked(layerInfoLib.fetchLayerInfo).mockResolvedValue(dataWithoutAbstract);

      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.queryByText("Abstract")).not.toBeInTheDocument();
      });
    });

    it("renders projection section", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.getByText("Projection")).toBeInTheDocument();
        expect(screen.getByText("EPSG:3857 - WGS 84 / Pseudo-Mercator")).toBeInTheDocument();
      });
    });

    it("renders attribute fields section", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.getByText("Attribute Fields")).toBeInTheDocument();
        expect(screen.getByText("field1")).toBeInTheDocument();
        expect(screen.getByText("field2")).toBeInTheDocument();
        expect(screen.getByText("field3")).toBeInTheDocument();
        expect(screen.getByText("(String)")).toBeInTheDocument();
        expect(screen.getByText("(Integer)")).toBeInTheDocument();
        expect(screen.getByText("(Double)")).toBeInTheDocument();
      });
    });

    it("handles single attribute (non-array) correctly", async () => {
      const dataWithSingleAttribute = {
        ...mockLayerData,
        attributes: {
          attribute: { name: "singleField", binding: "java.lang.String" },
        },
      };
      vi.mocked(layerInfoLib.fetchLayerInfo).mockResolvedValue(dataWithSingleAttribute);

      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.getByText("singleField")).toBeInTheDocument();
        expect(screen.getByText("(String)")).toBeInTheDocument();
      });
    });

    it("does not render attribute fields when attributes are missing", async () => {
      const dataWithoutAttributes = { ...mockLayerData, attributes: undefined };
      vi.mocked(layerInfoLib.fetchLayerInfo).mockResolvedValue(dataWithoutAttributes);

      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.queryByText("Attribute Fields")).not.toBeInTheDocument();
      });
    });

    it("renders footer with links", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.getByText("View Terms of Use")).toBeInTheDocument();
        expect(screen.getByText(/Layer info page generated using/)).toBeInTheDocument();
        expect(screen.getByText(/Generated on:/)).toBeInTheDocument();
      });
    });

    it("removes token from displayed URL source for secured ArcGIS layers", async () => {
      const securedArcgisUrl = "https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/0?f=json&token=secret-token";
      render(<LayerInfo layerURL={securedArcgisUrl} secure={true} />);

      await waitFor(() => {
        expect(screen.getByText("URL Source")).toBeInTheDocument();
        expect(screen.getByText("https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer/0?f=json")).toBeInTheDocument();
        expect(screen.queryByText(securedArcgisUrl)).not.toBeInTheDocument();
      });
    });
  });

  describe("Header Buttons", () => {
    it("renders print button by default", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.getByTestId("print-icon")).toBeInTheDocument();
      });
    });

    it("hides print button when hidePrint is true", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" hidePrint={true} />);

      await waitFor(() => {
        expect(screen.queryByTestId("print-icon")).not.toBeInTheDocument();
      });
    });

    it("renders new window button by default", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.getByTestId("external-link-icon")).toBeInTheDocument();
      });
    });

    it("hides new window button when hideNewWindow is true", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" hideNewWindow={true} />);

      await waitFor(() => {
        expect(screen.queryByTestId("external-link-icon")).not.toBeInTheDocument();
      });
    });

    it("calls window.print when print button is clicked", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.getByTestId("print-icon")).toBeInTheDocument();
      });

      const printButton = screen.getByTestId("print-icon").parentElement!;
      fireEvent.click(printButton);

      expect(mockPrint).toHaveBeenCalledTimes(1);
    });

    it("calls window.open when new window button is clicked", async () => {
      // Set up window.location.href
      Object.defineProperty(window, "location", {
        value: { href: "https://example.com/current" },
        writable: true,
      });

      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        expect(screen.getByTestId("external-link-icon")).toBeInTheDocument();
      });

      const newWindowButton = screen.getByTestId("external-link-icon").parentElement!;
      fireEvent.click(newWindowButton);

      expect(mockWindowOpen).toHaveBeenCalledWith("https://example.com/current", "_blank");
    });
  });

  describe("Download Functionality", () => {
    it("shows download section when showDownload is true and layer is downloadable", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" showDownload={true} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
        expect(screen.getByRole("checkbox")).toBeInTheDocument();
        expect(screen.getByText(/By downloading this information/)).toBeInTheDocument();
      });
    });

    it("does not show download section when showDownload is false", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" showDownload={false} />);

      await waitFor(() => {
        expect(screen.queryByText("Download")).not.toBeInTheDocument();
      });
    });

    it("does not show download section for Assessment Parcel layer", async () => {
      const assessmentParcelData = { ...mockLayerData, name: "Assessment Parcel" };
      vi.mocked(layerInfoLib.fetchLayerInfo).mockResolvedValue(assessmentParcelData);

      render(<LayerInfo layerURL="https://example.com/layer" showDownload={true} />);

      await waitFor(() => {
        expect(screen.queryByText("Download")).not.toBeInTheDocument();
      });
    });

    it("does not show download section when namespace is missing", async () => {
      const dataWithoutNamespace = { ...mockLayerData, namespace: undefined };
      vi.mocked(layerInfoLib.fetchLayerInfo).mockResolvedValue(dataWithoutNamespace);

      render(<LayerInfo layerURL="https://example.com/layer" showDownload={true} />);

      await waitFor(() => {
        expect(screen.queryByText("Download")).not.toBeInTheDocument();
      });
    });

    it("download button is disabled when terms are not accepted", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" showDownload={true} />);

      await waitFor(() => {
        const downloadButton = screen.getByRole("button", { name: /download/i });
        expect(downloadButton).toBeDisabled();
      });
    });

    it("download button is enabled when terms are accepted", async () => {
      const user = userEvent.setup();
      render(<LayerInfo layerURL="https://example.com/layer" showDownload={true} />);

      await waitFor(() => {
        expect(screen.getByRole("checkbox")).toBeInTheDocument();
      });

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      const downloadButton = screen.getByRole("button", { name: /download/i });
      expect(downloadButton).not.toBeDisabled();
    });

    it("calls downloadLayerFile for internal geoserver", async () => {
      vi.mocked(layerInfoLib.downloadLayerFile).mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<LayerInfo layerURL="https://geoserver.example.com/rest/layer" showDownload={true} secure={true} />);

      await waitFor(() => {
        expect(screen.getByRole("checkbox")).toBeInTheDocument();
      });

      // Accept terms
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      // Click download
      const downloadButton = screen.getByRole("button", { name: /download/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(layerInfoLib.downloadLayerFile).toHaveBeenCalledWith("https://geoserver.example.com/download/TestLayer", "TestLayer", true);
      });
    });

    it("opens new window for external geoserver", async () => {
      const user = userEvent.setup();

      render(<LayerInfo layerURL="https://external-geoserver.com/rest/layer" showDownload={true} />);

      await waitFor(() => {
        expect(screen.getByRole("checkbox")).toBeInTheDocument();
      });

      // Accept terms
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      // Click download
      const downloadButton = screen.getByRole("button", { name: /download/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith("https://geoserver.example.com/download/TestLayer", "_blank");
      });
    });

    it("handles download error gracefully", async () => {
      vi.mocked(layerInfoLib.downloadLayerFile).mockRejectedValue(new Error("Download failed"));
      useToastStore.setState({ toasts: [] });
      const user = userEvent.setup();

      render(<LayerInfo layerURL="https://geoserver.example.com/rest/layer" showDownload={true} secure={true} />);

      await waitFor(() => {
        expect(screen.getByRole("checkbox")).toBeInTheDocument();
      });

      // Accept terms
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      // Click download
      const downloadButton = screen.getByRole("button", { name: /download/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "Failed to download layer. Please try again.", type: "error" }));
      });
    });
  });

  describe("Security and Parameters", () => {
    it("does not use bearer token for non-geoserver URL even when secure", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" secure={true} />);

      await waitFor(() => {
        expect(layerInfoLib.fetchLayerInfo).toHaveBeenCalledWith("https://example.com/layer", {}, false);
      });
    });

    it("uses bearer token for secured geoserver URL", async () => {
      render(<LayerInfo layerURL="https://geoserver.example.com/rest/layer" secure={true} />);

      await waitFor(() => {
        expect(layerInfoLib.fetchLayerInfo).toHaveBeenCalledWith("https://geoserver.example.com/rest/layer", {}, true);
      });
    });

    it("does not use bearer token when URL contains token parameter", async () => {
      render(<LayerInfo layerURL="https://example.com/layer?token=abc123" secure={true} />);

      await waitFor(() => {
        expect(layerInfoLib.fetchLayerInfo).toHaveBeenCalledWith("https://example.com/layer?token=abc123", {}, false);
      });
    });

    it("passes custom parameters to fetchLayerInfo", async () => {
      const customParams = { customParam: "value", anotherParam: 123 };
      render(<LayerInfo layerURL="https://example.com/layer" params={customParams} />);

      await waitFor(() => {
        expect(layerInfoLib.fetchLayerInfo).toHaveBeenCalledWith("https://example.com/layer", customParams, false);
      });
    });
  });

  describe("Date Formatting", () => {
    it("displays current date in footer", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        const dateText = screen.getByText(/Generated on:/);
        expect(dateText).toBeInTheDocument();
        // Check that it includes a month name
        expect(dateText.textContent).toMatch(/(January|February|March|April|May|June|July|August|September|October|November|December)/);
      });
    });
  });

  describe("Config Integration", () => {
    it("uses config values for license URL", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        const licenseLink = screen.getByText("View Terms of Use");
        expect(licenseLink).toHaveAttribute("href", mockConfig.openLicenseUrl);
      });
    });

    it("uses config values for origin URL", async () => {
      render(<LayerInfo layerURL="https://example.com/layer" />);

      await waitFor(() => {
        const originLink = screen.getByText("opengis.example.com");
        expect(originLink).toHaveAttribute("href", mockConfig.originUrl);
      });
    });

    it("renders correctly when config values are available", async () => {
      // This test verifies that config is properly integrated
      render(<LayerInfo layerURL="https://example.com/layer" showDownload={true} />);

      await waitFor(() => {
        const licenseLink = screen.getAllByText("View License")[0];
        // Should use the mocked config URL
        expect(licenseLink).toHaveAttribute("href", mockConfig.openLicenseUrl);
      });
    });
  });
});
