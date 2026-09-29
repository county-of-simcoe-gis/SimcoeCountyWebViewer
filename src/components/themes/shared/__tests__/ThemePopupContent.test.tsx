import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemePopupContent from "../ThemePopupContent";

// Mock showURLWindow
const mockShowURLWindow = vi.fn();
vi.mock("@/utils/helpersUI", () => ({
  showURLWindow: (...args: unknown[]) => mockShowURLWindow(...args),
}));

describe("ThemePopupContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProperties = {
    Name: "Test Feature",
    Address: "123 Main St",
    Phone: "555-1234",
    Website: "https://example.com",
    Description: "A test feature description",
    Email: "test@example.com",
  };

  it("renders property values", () => {
    render(<ThemePopupContent properties={mockProperties} />);

    expect(screen.getByText("Test Feature")).toBeInTheDocument();
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
    expect(screen.getByText("555-1234")).toBeInTheDocument();
  });

  it("renders property labels with colons", () => {
    render(<ThemePopupContent properties={mockProperties} />);

    // Labels include colons in the component
    expect(screen.getByText("Name:")).toBeInTheDocument();
    expect(screen.getByText("Address:")).toBeInTheDocument();
    expect(screen.getByText("Phone:")).toBeInTheDocument();
  });

  it("renders More Information button when moreInfoUrlFieldName matches", () => {
    render(<ThemePopupContent properties={mockProperties} moreInfoUrlFieldName="Website" />);

    const button = screen.getByRole("button", { name: /more information/i });
    expect(button).toBeInTheDocument();
  });

  it("opens website when More Information button is clicked", () => {
    render(<ThemePopupContent properties={mockProperties} moreInfoUrlFieldName="Website" />);

    const button = screen.getByRole("button", { name: /more information/i });
    fireEvent.click(button);

    expect(mockShowURLWindow).toHaveBeenCalledWith("https://example.com", false, "normal", false, false, "More Information");
  });

  it("renders logo image when popupLogoImage is provided", () => {
    render(<ThemePopupContent properties={mockProperties} popupLogoImage="logo.png" />);

    const logo = screen.getByRole("img");
    expect(logo).toBeInTheDocument();
    // Component prepends /images/ to the path
    expect(logo).toHaveAttribute("src", "/images/logo.png");
  });

  it("does not render logo when popupLogoImage is not provided", () => {
    render(<ThemePopupContent properties={mockProperties} />);

    const logo = screen.queryByRole("img");
    expect(logo).not.toBeInTheDocument();
  });

  it("handles empty properties gracefully", () => {
    render(<ThemePopupContent properties={{}} />);

    // Should render without crashing
    expect(document.body).toBeInTheDocument();
  });

  it("filters out geometry and internal properties", () => {
    const propsWithGeometry = {
      ...mockProperties,
      geometry: { type: "Point", coordinates: [0, 0] },
      _internalField: "hidden",
    };

    render(<ThemePopupContent properties={propsWithGeometry} />);

    // Should not display geometry or internal fields
    expect(screen.queryByText("geometry:")).not.toBeInTheDocument();
    expect(screen.queryByText("_internalField:")).not.toBeInTheDocument();
  });

  it("renders URL values as clickable links", () => {
    render(<ThemePopupContent properties={mockProperties} />);

    const linkButton = screen.getByRole("button", { name: /click to open/i });
    expect(linkButton).toBeInTheDocument();
  });
});
