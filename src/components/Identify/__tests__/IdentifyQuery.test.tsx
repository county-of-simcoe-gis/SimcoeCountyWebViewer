import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import IdentifyQuery from "@/components/Identify/IdentifyQuery";

// Mock the arcgis token store
vi.mock("@/stores/arcgisTokenStore", () => ({
  useArcGISTokenStore: {
    getState: () => ({
      getValidToken: vi.fn().mockResolvedValue("mocktoken"),
    }),
  },
}));

describe("IdentifyQuery", () => {
  const defaultProps = {
    title: "Test Query",
    layerURL: "https://maps.simcoe.ca/arcgis/rest/services/Public/MapServer",
    layerId: "0",
    where: "OBJECTID=1",
    fields: ["Name", "Address"],
  };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            features: [{ attributes: { Name: "Simcoe Park", Address: "123 Main St" } }],
          }),
      }),
    );
  });

  it("shows loading state initially", () => {
    render(<IdentifyQuery {...defaultProps} />);
    expect(screen.getByText(/Loading Test Query/i)).toBeInTheDocument();
  });

  it("renders feature attributes on successful fetch", async () => {
    render(<IdentifyQuery {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Simcoe Park")).toBeInTheDocument();
    });
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
  });

  it("shows error message on fetch failure", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);

    render(<IdentifyQuery {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/HTTP 500/)).toBeInTheDocument();
    });
  });

  it("shows error for ArcGIS error response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ error: { message: "Invalid query" } }),
    } as Response);

    render(<IdentifyQuery {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Invalid query/)).toBeInTheDocument();
    });
  });

  it("shows no results message when features array is empty", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] }),
    } as Response);

    render(<IdentifyQuery {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/No results found/)).toBeInTheDocument();
    });
  });

  it("appends token for secured queries", async () => {
    render(<IdentifyQuery {...defaultProps} secured />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain("token=mocktoken");
  });

  it("constructs correct query URL", async () => {
    render(<IdentifyQuery {...defaultProps} />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/0/query?");
    expect(calledUrl).toContain("where=OBJECTID%3D1");
    expect(calledUrl).toContain("outFields=Name%2CAddress");
    expect(calledUrl).toContain("f=json");
  });
});
