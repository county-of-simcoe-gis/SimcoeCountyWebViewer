import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InfoRow, InfoRowValue } from "@/components/common/InfoRow";

// Mock CSS
vi.mock("@/components/common/InfoRow.css", () => ({}));

describe("InfoRow", () => {
  it("renders label and value correctly", () => {
    render(<InfoRow label="Test Label" value="Test Value" />);

    expect(screen.getByText("Test Label:")).toBeInTheDocument();
    expect(screen.getByText("Test Value")).toBeInTheDocument();
  });

  it("renders with children when provided", () => {
    render(
      <InfoRow label="Test Label" value="Test Value">
        <button>Child Button</button>
      </InfoRow>
    );

    expect(screen.getByText("Child Button")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<InfoRow label="Test Label" value="Test Value" className="custom-class" />);

    const infoRow = container.querySelector(".sc-info-row");
    expect(infoRow).toHaveClass("custom-class");
  });

  it("renders in default style mode", () => {
    const { container } = render(<InfoRow label="Test Label" value="Test Value" />);

    expect(container.querySelector(".sc-info-row-label")).toBeInTheDocument();
    expect(container.querySelector(".sc-info-row-value")).toBeInTheDocument();
  });

  it("renders in table style mode", () => {
    const { container } = render(<InfoRow label="Test Label" value="Test Value" styleMode="table" />);

    expect(container.querySelector(".sc-info-row-label-table")).toBeInTheDocument();
    expect(container.querySelector(".sc-info-row-value-table")).toBeInTheDocument();
  });

  it("hides value when imageData is true", () => {
    const { container } = render(<InfoRow label="Test Label" value="Test Value" imageData={true} />);

    const valueDiv = container.querySelector(".sc-hidden");
    expect(valueDiv).toBeInTheDocument();
  });

  it("converts HTTP URL to clickable link", () => {
    render(<InfoRow label="Test Label" value="https://example.com" />);

    const link = screen.getByText("Click To Open");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("converts HTTP URL to clickable link (case insensitive)", () => {
    render(<InfoRow label="Test Label" value="HTTP://EXAMPLE.COM" />);

    const link = screen.getByText("Click To Open");
    expect(link).toBeInTheDocument();
  });

  it("handles Attachment Url specially", () => {
    render(<InfoRow label="Attachment Url" value="https://example.com/attachment.pdf" />);

    expect(screen.getByText("Attachments:")).toBeInTheDocument();
    const link = screen.getByText("View Attachments");
    expect(link).toHaveAttribute("href", "https://example.com/attachment.pdf");
  });

  it("converts UNC paths to clickable links", () => {
    const uncPath = "\\\\server\\share\\file.txt";
    render(<InfoRow label="Test Label" value={uncPath} />);

    const link = screen.getByText("Click To Open");
    expect(link).toBeInTheDocument();
    // The component preserves the UNC path as-is
    expect(link).toHaveAttribute("href", uncPath);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("converts Windows drive paths to clickable links", () => {
    render(<InfoRow label="Test Label" value="C:\\Users\\test\\file.txt" />);

    // Find the link by role
    const links = screen.getAllByRole("link");
    const link = links.find((l) => l.getAttribute("href")?.includes("C:"));

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("formats date values correctly", () => {
    render(<InfoRow label="Test Label" value="2024-03-15T10:30:00.000Z" />);

    // Should format as YYYY-MM-DD
    expect(screen.getByText("2024-03-15")).toBeInTheDocument();
  });

  it("does not format dates for NUMBER fields", () => {
    render(<InfoRow label="Number Field" value="2024-03-15T10:30:00.000Z" />);

    // Should not format if label contains "NUMBER"
    expect(screen.getByText("2024-03-15T10:30:00.000Z")).toBeInTheDocument();
  });

  it("does not format dates for BYLAW fields", () => {
    render(<InfoRow label="Bylaw Info" value="2024-03-15T10:30:00.000Z" />);

    // Should not format if label contains "BYLAW"
    expect(screen.getByText("2024-03-15T10:30:00.000Z")).toBeInTheDocument();
  });

  it("does not format dates for WASTE COLLECTION DAY fields", () => {
    render(<InfoRow label="Waste Collection Day" value="2024-03-15T10:30:00.000Z" />);

    // Should not format if label contains "WASTE COLLECTION DAY"
    expect(screen.getByText("2024-03-15T10:30:00.000Z")).toBeInTheDocument();
  });

  it("does not format invalid date strings", () => {
    render(<InfoRow label="Test Label" value="not a date" />);

    expect(screen.getByText("not a date")).toBeInTheDocument();
  });

  it("handles short strings that are not dates", () => {
    render(<InfoRow label="Test Label" value="short" />);

    expect(screen.getByText("short")).toBeInTheDocument();
  });

  it("renders number values", () => {
    render(<InfoRow label="Test Label" value={12345} />);

    expect(screen.getByText("12345")).toBeInTheDocument();
  });

  it("renders ReactNode as value", () => {
    render(<InfoRow label="Test Label" value={<div data-testid="custom-node">Custom Content</div>} />);

    expect(screen.getByTestId("custom-node")).toBeInTheDocument();
    expect(screen.getByText("Custom Content")).toBeInTheDocument();
  });

  it("renders without value", () => {
    render(
      <InfoRow label="Test Label">
        <button>Action</button>
      </InfoRow>
    );

    expect(screen.getByText("Test Label:")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  it("handles empty string value", () => {
    render(<InfoRow label="Test Label" value="" />);

    expect(screen.getByText("Test Label:")).toBeInTheDocument();
  });
});

describe("InfoRowValue", () => {
  it("renders value correctly", () => {
    render(<InfoRowValue value="Test Value" />);

    expect(screen.getByText("Test Value")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <InfoRowValue>
        <span>Child Content</span>
      </InfoRowValue>
    );

    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<InfoRowValue value="Test Value" className="custom-class" />);

    const valueDiv = container.querySelector(".sc-info-row-value");
    expect(valueDiv).toHaveClass("custom-class");
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<InfoRowValue value="Test Value" onClick={handleClick} />);

    const valueDiv = screen.getByText("Test Value");
    fireEvent.click(valueDiv);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick with feature when provided", () => {
    const handleClick = vi.fn();
    const mockFeature = { id: "test-feature" };

    render(<InfoRowValue value="Test Value" onClick={handleClick} feature={mockFeature} />);

    const valueDiv = screen.getByText("Test Value");
    fireEvent.click(valueDiv);

    expect(handleClick).toHaveBeenCalledWith(mockFeature);
  });

  it("applies pointer cursor when onClick is provided", () => {
    const handleClick = vi.fn();
    const { container } = render(<InfoRowValue value="Test Value" onClick={handleClick} />);

    const valueDiv = container.querySelector(".sc-info-row-value") as HTMLElement;
    expect(valueDiv.style.cursor).toBe("pointer");
  });

  it("does not apply pointer cursor when onClick is not provided", () => {
    const { container } = render(<InfoRowValue value="Test Value" />);

    const valueDiv = container.querySelector(".sc-info-row-value") as HTMLElement;
    expect(valueDiv.style.cursor).toBe("");
  });

  it("renders ReactNode as value", () => {
    render(<InfoRowValue value={<div data-testid="custom-value">Custom</div>} />);

    expect(screen.getByTestId("custom-value")).toBeInTheDocument();
  });

  it("renders without value, only children", () => {
    render(
      <InfoRowValue>
        <button>Click Me</button>
      </InfoRowValue>
    );

    expect(screen.getByText("Click Me")).toBeInTheDocument();
  });
});
