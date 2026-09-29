import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CREResults from "../CREResults";
import { useCREStore } from "../stores/creStore";
import { Feature } from "ol";
import { Point } from "ol/geom";
import * as helpersUI from "@/utils/helpersUI";

vi.mock("@/utils/helpersUI", () => ({
  showMessage: vi.fn(),
  showURLWindow: vi.fn(),
}));

// Mock mapStore
vi.mock("@/stores/mapStore", () => ({
  useMapStore: Object.assign(
    vi.fn((selector: any) => selector({ map: null })),
    {
      getState: vi.fn(() => ({ map: null })),
    },
  ),
}));

function createMockFeature(props: Record<string, unknown>): Feature {
  const feature = new Feature({
    geometry: new Point([0, 0]),
    ...props,
  });
  return feature;
}

describe("CREResults", () => {
  beforeEach(() => {
    useCREStore.getState().reset();
  });

  it("shows loading spinner when loading", () => {
    useCREStore.getState().setIsLoading(true);
    render(<CREResults />);
    // Spinner element should be present
    const spinner = document.querySelector(".loading-spinner");
    expect(spinner).toBeInTheDocument();
  });

  it("shows empty state when no results", () => {
    useCREStore.getState().setIsLoading(false);
    render(<CREResults />);
    expect(screen.getByText(/No results found/)).toBeInTheDocument();
  });

  it("renders Back to Search link", () => {
    render(<CREResults />);
    expect(screen.getByText("Back to Search")).toBeInTheDocument();
  });

  it("clicking Back to Search switches to search tab", () => {
    useCREStore.getState().setActiveTab(1);
    render(<CREResults />);
    fireEvent.click(screen.getByText("Back to Search"));
    expect(useCREStore.getState().activeTab).toBe(0);
  });

  it("renders result items from store", () => {
    const features = [
      createMockFeature({
        _imageurl: "http://example.com/img.jpg",
        _listprice: 250000,
        Address: "123 Main St",
        "Property Type": "Commercial",
        _squarefeet: 5000,
        "MLS Number": "MLS001",
        Incentive: "No",
      }),
      createMockFeature({
        _imageurl: null,
        _listprice: 0,
        Address: "456 Oak Ave",
        "Property Type": "Industrial",
        _squarefeet: 0,
        "MLS Number": "MLS002",
        Incentive: "Yes",
      }),
    ];

    useCREStore.getState().appendResults(features);
    useCREStore.getState().setIsLoading(false);

    render(<CREResults />);
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
    expect(screen.getByText("456 Oak Ave")).toBeInTheDocument();
  });

  it("displays formatted price for result items", () => {
    const features = [
      createMockFeature({
        _imageurl: null,
        _listprice: 1500000,
        Address: "789 Elm St",
        "Property Type": "Commercial",
        _squarefeet: 10000,
        "MLS Number": "MLS003",
        Incentive: "No",
      }),
    ];

    useCREStore.getState().appendResults(features);
    useCREStore.getState().setIsLoading(false);

    render(<CREResults />);
    expect(screen.getByText("$1,500,000")).toBeInTheDocument();
  });

  it("shows Price N/A for items with price <= 1", () => {
    const features = [
      createMockFeature({
        _imageurl: null,
        _listprice: 1,
        Address: "100 Test St",
        "Property Type": "Vacant Land",
        _squarefeet: 0,
        "MLS Number": "MLS004",
        Incentive: "No",
      }),
    ];

    useCREStore.getState().appendResults(features);
    useCREStore.getState().setIsLoading(false);

    render(<CREResults />);
    expect(screen.getByText("Price N/A")).toBeInTheDocument();
  });

  it("shows incentive star icon for incentive properties", () => {
    const features = [
      createMockFeature({
        _imageurl: null,
        _listprice: 200000,
        Address: "Incentive St",
        "Property Type": "Commercial",
        _squarefeet: 2000,
        "MLS Number": "MLS005",
        Incentive: "Yes",
      }),
    ];

    useCREStore.getState().appendResults(features);
    useCREStore.getState().setIsLoading(false);

    render(<CREResults />);
    expect(screen.getByTitle("Incentive Property")).toBeInTheDocument();
  });

  it("does not show incentive star for non-incentive properties", () => {
    const features = [
      createMockFeature({
        _imageurl: null,
        _listprice: 200000,
        Address: "Normal St",
        "Property Type": "Commercial",
        _squarefeet: 2000,
        "MLS Number": "MLS006",
        Incentive: "No",
      }),
    ];

    useCREStore.getState().appendResults(features);
    useCREStore.getState().setIsLoading(false);

    render(<CREResults />);
    expect(screen.queryByTitle("Incentive Property")).not.toBeInTheDocument();
  });

  it("renders View Details and Zoom buttons per result", () => {
    const features = [
      createMockFeature({
        _imageurl: null,
        _listprice: 300000,
        Address: "Action St",
        "Property Type": "Industrial",
        _squarefeet: 8000,
        "MLS Number": "MLS007",
        Incentive: "No",
      }),
    ];

    useCREStore.getState().appendResults(features);
    useCREStore.getState().setIsLoading(false);

    render(<CREResults />);
    expect(screen.getByText("View Details")).toBeInTheDocument();
    expect(screen.getByText("Zoom")).toBeInTheDocument();
  });

  it("calls showURLWindow when View Details is clicked", () => {
    const features = [
      createMockFeature({
        _imageurl: null,
        _listprice: 300000,
        Address: "Detail St",
        "Property Type": "Industrial",
        _squarefeet: 8000,
        "MLS Number": "MLS-DETAIL",
        Incentive: "No",
      }),
    ];

    useCREStore.getState().appendResults(features);
    useCREStore.getState().setIsLoading(false);

    render(<CREResults />);
    fireEvent.click(screen.getByText("View Details"));
    expect(helpersUI.showURLWindow).toHaveBeenCalledWith(expect.stringContaining("MLS-DETAIL"));
  });

  it("renders contact footer", () => {
    render(<CREResults />);
    expect(screen.getByText("economic development department")).toBeInTheDocument();
  });

  it("shows Unknown for zero square feet", () => {
    const features = [
      createMockFeature({
        _imageurl: null,
        _listprice: 100000,
        Address: "Zero Sqft St",
        "Property Type": "Commercial",
        _squarefeet: 0,
        "MLS Number": "MLS008",
        Incentive: "No",
      }),
    ];

    useCREStore.getState().appendResults(features);
    useCREStore.getState().setIsLoading(false);

    render(<CREResults />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});
