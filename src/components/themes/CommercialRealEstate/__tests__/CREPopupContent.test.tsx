import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CREPopupContent from "../CREPopupContent";
import { Feature } from "ol";
import { Point } from "ol/geom";
import * as helpersUI from "@/utils/helpersUI";

vi.mock("@/utils/helpersUI", () => ({
  showMessage: vi.fn(),
  showURLWindow: vi.fn(),
}));

vi.mock("@/stores/popupStore", () => ({
  usePopupStore: Object.assign(
    vi.fn((selector: any) => selector({ hide: vi.fn() })),
    {
      getState: vi.fn(() => ({ hide: vi.fn() })),
    },
  ),
}));

function createMockFeature(props: Record<string, unknown>): Feature {
  return new Feature({
    geometry: new Point([0, 0]),
    ...props,
  });
}

describe("CREPopupContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders address and municipality", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "123 Main St",
      Municipality: "Barrie",
      _listprice: 500000,
      _saletype: "For Sale",
      _squarefeet: 3000,
      _brochureurl: null,
      "MLS Number": "MLS100",
      Website: null,
    });

    render(<CREPopupContent feature={feature} />);
    expect(screen.getByText("123 Main St, Barrie")).toBeInTheDocument();
  });

  it("displays formatted price", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "456 Oak Ave",
      Municipality: "Orillia",
      _listprice: 1250000,
      _saletype: "For Lease",
      _squarefeet: 10000,
      _brochureurl: null,
      "MLS Number": "MLS200",
      Website: null,
    });

    render(<CREPopupContent feature={feature} />);
    expect(screen.getByText("$1,250,000")).toBeInTheDocument();
  });

  it("shows 'Price Not Defined' for price <= 1", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "789 Elm St",
      Municipality: "Midland",
      _listprice: 0,
      _saletype: "For Sale",
      _squarefeet: 2000,
      _brochureurl: null,
      "MLS Number": "MLS300",
      Website: null,
    });

    render(<CREPopupContent feature={feature} />);
    expect(screen.getByText("Price Not Defined")).toBeInTheDocument();
  });

  it("shows 'Not Available' for 0 square feet", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "100 Test",
      Municipality: "Collingwood",
      _listprice: 300000,
      _saletype: "For Sale",
      _squarefeet: 0,
      _brochureurl: null,
      "MLS Number": "MLS400",
      Website: null,
    });

    render(<CREPopupContent feature={feature} />);
    expect(screen.getByText("Not Available")).toBeInTheDocument();
  });

  it("shows square footage when available", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "200 Test",
      Municipality: "Barrie",
      _listprice: 300000,
      _saletype: "For Sale",
      _squarefeet: 5000,
      _brochureurl: null,
      "MLS Number": "MLS500",
      Website: null,
    });

    render(<CREPopupContent feature={feature} />);
    expect(screen.getByText("5,000 sq ft")).toBeInTheDocument();
  });

  it("shows brochure link when available", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "300 Test",
      Municipality: "Barrie",
      _listprice: 300000,
      _saletype: "For Sale",
      _squarefeet: 5000,
      _brochureurl: "http://example.com/brochure.pdf",
      "MLS Number": "MLS600",
      Website: null,
    });

    render(<CREPopupContent feature={feature} />);
    const link = screen.getByText("View PDF");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "http://example.com/brochure.pdf");
  });

  it("does not show brochure link when absent", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "400 Test",
      Municipality: "Barrie",
      _listprice: 300000,
      _saletype: "For Sale",
      _squarefeet: 5000,
      _brochureurl: null,
      "MLS Number": "MLS700",
      Website: null,
    });

    render(<CREPopupContent feature={feature} />);
    expect(screen.queryByText("View PDF")).not.toBeInTheDocument();
  });

  it("renders View Details button", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "500 Test",
      Municipality: "Barrie",
      _listprice: 300000,
      _saletype: "For Sale",
      _squarefeet: 5000,
      _brochureurl: null,
      "MLS Number": "MLS800",
      Website: null,
    });

    render(<CREPopupContent feature={feature} />);
    expect(screen.getByText("View Details")).toBeInTheDocument();
  });

  it("calls showURLWindow on View Details click", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "600 Test",
      Municipality: "Barrie",
      _listprice: 300000,
      _saletype: "For Sale",
      _squarefeet: 5000,
      _brochureurl: null,
      "MLS Number": "MLS-CLICK",
      Website: null,
    });

    render(<CREPopupContent feature={feature} />);
    fireEvent.click(screen.getByText("View Details"));
    expect(helpersUI.showURLWindow).toHaveBeenCalledWith(expect.stringContaining("MLS-CLICK"));
  });

  it("renders Listing button", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "700 Test",
      Municipality: "Barrie",
      _listprice: 300000,
      _saletype: "For Sale",
      _squarefeet: 5000,
      _brochureurl: null,
      "MLS Number": "MLS900",
      Website: "http://example.com/listing",
    });

    render(<CREPopupContent feature={feature} />);
    expect(screen.getByText("Listing")).toBeInTheDocument();
  });

  it("shows warning when listing website is not available", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "800 Test",
      Municipality: "Barrie",
      _listprice: 300000,
      _saletype: "For Sale",
      _squarefeet: 5000,
      _brochureurl: null,
      "MLS Number": "MLS1000",
      Website: null,
    });

    render(<CREPopupContent feature={feature} />);
    fireEvent.click(screen.getByText("Listing"));
    expect(helpersUI.showMessage).toHaveBeenCalledWith("Listing", expect.any(String), "warning");
  });

  it("renders Close button", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "900 Test",
      Municipality: "Barrie",
      _listprice: 300000,
      _saletype: "For Sale",
      _squarefeet: 5000,
      _brochureurl: null,
      "MLS Number": "MLS1100",
      Website: null,
    });

    render(<CREPopupContent feature={feature} />);
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("displays sale type", () => {
    const feature = createMockFeature({
      _thumburl: null,
      Address: "1000 Test",
      Municipality: "Barrie",
      _listprice: 300000,
      _saletype: "For Lease",
      _squarefeet: 5000,
      _brochureurl: null,
      "MLS Number": "MLS1200",
      Website: null,
    });

    render(<CREPopupContent feature={feature} />);
    expect(screen.getByText("For Lease")).toBeInTheDocument();
  });
});
