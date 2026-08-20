import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TwoOneOnePopupContent from "../TwoOneOnePopupContent";

// Mock fetch for 211 details API
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        organizationProgramName: "Test Organization",
        address: "123 Main St, Barrie, ON",
        officePhone: "705-555-1234",
        tollFreePhone: "1-800-555-5678",
        email: "info@test.org",
        website: "https://test.org",
        descriptionService: "Full service description here",
        hours: "Mon-Fri 9am-5pm",
        eligibility: "Open to all residents",
        languages: "English, French",
      }),
  }),
) as unknown as typeof fetch;

describe("TwoOneOnePopupContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders organization name", () => {
    render(<TwoOneOnePopupContent name="Test Organization" description="A test organization" website="https://example.com" recordNumber="R001" isFrench={false} />);

    expect(screen.getByText("Test Organization")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<TwoOneOnePopupContent name="Test Organization" description="A brief description of services" website="https://example.com" recordNumber="R001" isFrench={false} />);

    expect(screen.getByText("A brief description of services")).toBeInTheDocument();
  });

  it("renders website link when provided", () => {
    render(<TwoOneOnePopupContent name="Test Organization" description="Description" website="https://example.com" recordNumber="R001" isFrench={false} />);

    const links = screen.getAllByRole("link");
    const websiteLink = links.find((link) => link.getAttribute("href") === "https://example.com");
    expect(websiteLink).toBeInTheDocument();
    expect(websiteLink).toHaveAttribute("target", "_blank");
  });

  it("renders 211 details link with record number", () => {
    render(<TwoOneOnePopupContent name="Test Organization" description="Description" website="https://example.com" recordNumber="R001" isFrench={false} />);

    const links = screen.getAllByRole("link");
    const detailsLink = links.find((link) => link.getAttribute("href")?.includes("simcoecounty.cioc.ca/record/R001"));
    expect(detailsLink).toBeInTheDocument();
  });

  it("renders French labels when isFrench is true", () => {
    render(<TwoOneOnePopupContent name="Organisation Test" description="Description en français" website="https://example.com" recordNumber="R001" isFrench={true} />);

    expect(screen.getByText("Nom")).toBeInTheDocument();
    expect(screen.getByText("Site Web")).toBeInTheDocument();
  });

  it("renders English labels when isFrench is false", () => {
    render(<TwoOneOnePopupContent name="Test Organization" description="Description" website="https://example.com" recordNumber="R001" isFrench={false} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Website")).toBeInTheDocument();
  });

  it("handles null description gracefully", () => {
    render(<TwoOneOnePopupContent name="Test Organization" description={null} website="https://example.com" recordNumber="R001" isFrench={false} />);

    expect(screen.getByText("Test Organization")).toBeInTheDocument();
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
  });

  it("handles null website gracefully", () => {
    render(<TwoOneOnePopupContent name="Test Organization" description="Description" website={null} recordNumber="R001" isFrench={false} />);

    expect(screen.queryByText("Website")).not.toBeInTheDocument();
  });

  it("adds https prefix to website if missing", () => {
    render(<TwoOneOnePopupContent name="Test Organization" description="Description" website="example.com" recordNumber="R001" isFrench={false} />);

    const links = screen.getAllByRole("link");
    const websiteLink = links.find((link) => link.getAttribute("href") === "https://example.com");
    expect(websiteLink).toHaveAttribute("href", "https://example.com");
  });
});
