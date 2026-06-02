import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PropertyPopup from "@/components/PropertyPopup";
import { Feature } from "ol";
import { Polygon } from "ol/geom";
import { useReportsStore } from "@/stores/reportsStore";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { useAppStore } from "@/stores/appStore";
import { useURLModalStore } from "@/stores/urlModalStore";
import { useToastStore } from "@/hooks/useToast";

describe("PropertyPopup", () => {
  const mockFeature = new Feature({
    geometry: new Polygon([
      [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
        [0, 0],
      ],
    ]),
  });

  const defaultPropInfo = {
    ARN: "1234567890",
    Address: "123 Test Street",
    AssessedValue: "data:image/png;base64,testimage",
    HasZoning: true,
    WasteCollection: {
      GarbageDay: "Monday",
    },
    Other: {
      BroadbandSpeed: "100 Mbps",
    },
    pointCoordinates: [-79.3832, 43.6532],
    pointerCoordinates: [-8878504.68, 5543492.45],
    shareURL: "http://localhost:3000?ARN=1234567890",
    area: 1000,
  };

  const mockOnClose = vi.fn();
  const mockOnClearParcelLayer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock clipboard API
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn(() => Promise.resolve()),
      },
      writable: true,
      configurable: true,
    });

    // Clear toast store
    useToastStore.setState({ toasts: [] });

    // Set config in app store
    useAppStore.setState({ config: { termsUrl: "https://example.com/terms" } as any });

    // Mock window.map
    (global as any).window.map = {
      getView: vi.fn(() => ({
        fit: vi.fn(),
      })),
      getSize: vi.fn(() => [1024, 768]),
    };
  });

  it("renders property information correctly", () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    expect(screen.getByText("Address")).toBeInTheDocument();
    expect(screen.getByText("123 Test Street")).toBeInTheDocument();
    expect(screen.getByText("Roll Number")).toBeInTheDocument();
    expect(screen.getByText("1234567890")).toBeInTheDocument();
  });

  it("displays assessed value image when available", () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    const img = screen.getByAltText("Assessed Value") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("data:image/png;base64,testimage");
  });

  it("displays zoning information", () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    expect(screen.getByText("Has Zoning")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("displays no zoning when false", () => {
    const propInfo = { ...defaultPropInfo, HasZoning: false };
    render(<PropertyPopup propInfo={propInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    expect(screen.getByText("Has Zoning")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("displays waste collection day", () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    expect(screen.getByText("Waste Collection Day")).toBeInTheDocument();
    expect(screen.getByText("Monday")).toBeInTheDocument();
  });

  it("displays broadband speed", () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    expect(screen.getByText("Potential Broadband Coverage")).toBeInTheDocument();
    expect(screen.getByText("100 Mbps")).toBeInTheDocument();
  });

  it("displays coordinates with proper formatting", () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    expect(screen.getByText("Pointer Coordinates")).toBeInTheDocument();
    // Coordinates are formatted to 4 decimal places
    const coordText = screen.getByText(/Lat:.*Long:/);
    expect(coordText).toBeInTheDocument();
  });

  it("copies ARN to clipboard when copy button is clicked", async () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    const copyButton = screen.getByTitle("Copy to Clipboard");
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("1234567890");

    // Should show "Copied!" message
    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });

    // Message should disappear after 2 seconds
    await waitFor(
      () => {
        expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
      },
      { timeout: 2500 },
    );
  });

  it("copies share URL to clipboard when share is clicked", () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    const shareButton = screen.getByText("[Share]");
    fireEvent.click(shareButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("http://localhost:3000?ARN=1234567890");
    expect(useToastStore.getState().toasts).toContainEqual(expect.objectContaining({ message: "Link copied to clipboard!", type: "success" }));
  });

  it("handles add to my maps action", () => {
    const addItemSpy = vi.fn();
    useMyMapsStore.setState({ addItem: addItemSpy });

    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    const addToMyMapsButton = screen.getByText("[Add to My Maps]");
    fireEvent.click(addToMyMapsButton);

    expect(addItemSpy).toHaveBeenCalledTimes(1);
    // Verify the item was created with the correct label
    const addedItem = addItemSpy.mock.calls[0][0];
    expect(addedItem.label).toBe("123 Test Street");
  });

  it("opens terms URL in modal window", async () => {
    useURLModalStore.getState().close();

    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    const termsButton = screen.getByText("[Terms]");
    fireEvent.click(termsButton);

    await waitFor(() => {
      const state = useURLModalStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.url).toBe("https://example.com/terms");
    });
  });

  it("shows more information when button is clicked", () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    const moreInfoButton = screen.getByText("More Information");
    fireEvent.click(moreInfoButton);

    // Should load a property report into the reports store
    const report = useReportsStore.getState().currentReport;
    expect(report).not.toBeNull();
    expect(report!.title).toContain("123 Test Street");
    expect(report!.source).toBe("propertyReport");
  });

  it("calls onClose and clears parcel layer when close button is clicked", () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    const closeButton = screen.getByText("Close");
    fireEvent.click(closeButton);

    expect(mockOnClearParcelLayer).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("handles missing optional properties gracefully", () => {
    const minimalPropInfo = {
      ARN: "1234567890",
    };

    render(<PropertyPopup propInfo={minimalPropInfo} feature={mockFeature} onClose={mockOnClose} />);

    // Should render with just ARN
    expect(screen.getByText("1234567890")).toBeInTheDocument();
    // Should not crash without optional properties
  });

  it("handles missing onClearParcelLayer callback", () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} />);

    const closeButton = screen.getByText("Close");
    fireEvent.click(closeButton);

    // Should only call onClose
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("renders all action buttons", () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    expect(screen.getByText("More Information")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("renders all tool links", () => {
    render(<PropertyPopup propInfo={defaultPropInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    expect(screen.getByText("[Add to My Maps]")).toBeInTheDocument();
    expect(screen.getByText("[Share]")).toBeInTheDocument();
    expect(screen.getByText("[Terms]")).toBeInTheDocument();
  });

  it("handles share when shareURL is not provided", () => {
    const propInfo = { ...defaultPropInfo, shareURL: undefined };
    render(<PropertyPopup propInfo={propInfo} feature={mockFeature} onClose={mockOnClose} onClearParcelLayer={mockOnClearParcelLayer} />);

    const shareButton = screen.getByText("[Share]");
    fireEvent.click(shareButton);

    // Should not crash, but also shouldn't copy or alert
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
