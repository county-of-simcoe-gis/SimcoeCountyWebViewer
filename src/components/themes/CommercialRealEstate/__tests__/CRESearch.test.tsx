import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CRESearch from "../CRESearch";
import { useCREStore } from "../stores/creStore";

// Mock sub-components to isolate CRESearch tests
vi.mock("../CRESearchPropTypes", () => ({
  default: () => <div data-testid="cre-search-prop-types">PropTypes</div>,
}));
vi.mock("../CRESearchType", () => ({
  default: () => <div data-testid="cre-search-type">Type</div>,
}));
vi.mock("../CRESearchBuildingSpace", () => ({
  default: () => <div data-testid="cre-search-building-space">BuildingSpace</div>,
}));
vi.mock("../CRESearchLandSize", () => ({
  default: () => <div data-testid="cre-search-land-size">LandSize</div>,
}));
vi.mock("../CRESearchPrice", () => ({
  default: () => <div data-testid="cre-search-price">Price</div>,
}));
vi.mock("../CREResults", () => ({
  default: () => <div data-testid="cre-results">Results</div>,
}));

// Mock helpers
vi.mock("../creHelpers", () => ({
  updateAllLayerFilters: vi.fn(),
  fetchAllResults: vi.fn(),
}));

vi.mock("@/utils/helpersUI", () => ({
  showMessage: vi.fn(),
  showURLWindow: vi.fn(),
}));

describe("CRESearch", () => {
  beforeEach(() => {
    useCREStore.getState().reset();
  });

  it("renders Search and My Results tabs", () => {
    render(<CRESearch />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent("Search");
    expect(tabs[1]).toHaveTextContent("My Results");
  });

  it("shows search panel by default (tab 0)", () => {
    render(<CRESearch />);
    expect(screen.getByTestId("cre-search-prop-types")).toBeInTheDocument();
    expect(screen.getByTestId("cre-search-type")).toBeInTheDocument();
    expect(screen.getByTestId("cre-search-building-space")).toBeInTheDocument();
    expect(screen.getByTestId("cre-search-price")).toBeInTheDocument();
    expect(screen.queryByTestId("cre-results")).not.toBeInTheDocument();
  });

  it("switches to results panel when My Results tab is clicked", () => {
    render(<CRESearch />);
    fireEvent.click(screen.getByText("My Results"));
    expect(screen.getByTestId("cre-results")).toBeInTheDocument();
    expect(screen.queryByTestId("cre-search-prop-types")).not.toBeInTheDocument();
  });

  it("switches back to search panel when Search tab is clicked", () => {
    useCREStore.getState().setActiveTab(1);
    render(<CRESearch />);
    expect(screen.getByTestId("cre-results")).toBeInTheDocument();

    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[0]);
    expect(screen.getByTestId("cre-search-prop-types")).toBeInTheDocument();
    expect(screen.queryByTestId("cre-results")).not.toBeInTheDocument();
  });

  it("renders incentive checkbox", () => {
    render(<CRESearch />);
    expect(screen.getByText("Only search properties with incentives")).toBeInTheDocument();
  });

  it("toggles incentive checkbox", () => {
    render(<CRESearch />);
    const checkbox = screen.getByText("Only search properties with incentives").closest("label")!.querySelector("input")!;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(useCREStore.getState().incentiveChecked).toBe(true);
  });

  it("renders only-in-map checkbox", () => {
    render(<CRESearch />);
    expect(screen.getByText("Only search properties visible in map")).toBeInTheDocument();
  });

  it("toggles only-in-map checkbox", () => {
    render(<CRESearch />);
    const checkbox = screen.getByText("Only search properties visible in map").closest("label")!.querySelector("input")!;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(useCREStore.getState().onlyInMapChecked).toBe(true);
  });

  it("renders View Properties button", () => {
    render(<CRESearch />);
    expect(screen.getByText("View Properties")).toBeInTheDocument();
  });

  it("clicking View Properties switches to results tab", () => {
    render(<CRESearch />);
    fireEvent.click(screen.getByText("View Properties"));
    expect(useCREStore.getState().activeTab).toBe(1);
  });

  it("shows result count in footer", () => {
    useCREStore.getState().setResults([], 0);
    render(<CRESearch />);
    expect(screen.getByText("0 results")).toBeInTheDocument();
  });

  it("shows loading spinner when loading", () => {
    useCREStore.getState().setIsLoading(true);
    render(<CRESearch />);
    // Should show spinner instead of results count
    expect(screen.queryByText(/results$/)).not.toBeInTheDocument();
  });

  it("has correct tab roles for accessibility", () => {
    render(<CRESearch />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
  });
});
