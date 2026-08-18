import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AvailableMapsTool from "@/components/tools/AvailableMaps/AvailableMapsTool";
import type { MapItem } from "@/types/mapSettings";

// Mock axiosInstance
const mockGet = vi.fn();
vi.mock("@/lib/axiosInstance", () => ({
  default: { get: (...args: unknown[]) => mockGet(...args) },
}));

// Mock PanelComponent to simplify rendering
vi.mock("@/components/PanelComponent", () => ({
  default: ({ name, children, onClose }: { name: string; children: React.ReactNode; onClose: () => void }) => (
    <div data-testid="panel-component" data-name={name}>
      <button data-testid="panel-close" onClick={onClose}>
        Close
      </button>
      {children}
    </div>
  ),
}));

// --- Test data ---

const publicMaps: MapItem[] = [
  { map_name: "Default Map", description: "The default public map", is_secured: false, is_default: true, allowed_roles: "" },
  { map_name: "Cycling Map", description: "Cycling trails and routes", is_secured: false, is_default: false, allowed_roles: "" },
  { map_name: "Transit Map", description: "Public transit routes", is_secured: false, is_default: false, allowed_roles: "" },
];


// --- Helpers ---

function renderTool(props: Partial<React.ComponentProps<typeof AvailableMapsTool>> = {}) {
  const defaultProps = { onClose: vi.fn() };
  return render(<AvailableMapsTool {...defaultProps} {...props} />);
}

// --- Tests ---

describe("AvailableMapsTool", () => {
  beforeEach(() => {
    mockGet.mockReset();
    // Provide a default mock so we don't get unhandled errors
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost:3000", search: "", pathname: "/", hostname: "localhost", port: "3000", protocol: "http:" },
      writable: true,
    });
  });

  // ---- Loading state ----

  it("shows loading spinner while fetching maps", () => {
    // Never resolve to keep loading state visible
    mockGet.mockReturnValue(new Promise(() => {}));
    renderTool();

    expect(screen.getByText("Loading maps...")).toBeInTheDocument();
  });

  // ---- Successful fetch ----

  it("renders public maps after successful fetch", async () => {
    mockGet.mockResolvedValue({ data: publicMaps });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("Default Map")).toBeInTheDocument();
    });

    expect(screen.getByText("Cycling Map")).toBeInTheDocument();
    expect(screen.getByText("Transit Map")).toBeInTheDocument();
  });


  it("displays the Default badge for the default map", async () => {
    mockGet.mockResolvedValue({ data: publicMaps });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("Default")).toBeInTheDocument();
    });
  });

  it("displays map descriptions", async () => {
    mockGet.mockResolvedValue({ data: publicMaps });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("The default public map")).toBeInTheDocument();
    });
    expect(screen.getByText("Cycling trails and routes")).toBeInTheDocument();
  });


  // ---- Error / retry ----

  it("displays error message when fetch fails", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));
    renderTool();

    await waitFor(() => {
      expect(screen.getByText(/Error loading maps: Network error/)).toBeInTheDocument();
    });
  });

  it("shows retry button on error and retries on click", async () => {
    mockGet.mockRejectedValueOnce(new Error("Server error"));
    renderTool();

    await waitFor(() => {
      expect(screen.getByText(/Retry/)).toBeInTheDocument();
    });

    // Now resolve on retry
    mockGet.mockResolvedValueOnce({ data: publicMaps });
    fireEvent.click(screen.getByText(/Retry/));

    await waitFor(() => {
      expect(screen.getByText("Default Map")).toBeInTheDocument();
    });
  });

  it("shows max retry message after exceeding retry limit", async () => {
    mockGet.mockRejectedValue(new Error("Persistent error"));
    renderTool();

    // First error
    await waitFor(() => {
      expect(screen.getByText(/Retry/)).toBeInTheDocument();
    });

    // Retry 1
    fireEvent.click(screen.getByText(/Retry/));
    await waitFor(() => {
      expect(screen.getByText(/Retry \(1\/2\)/)).toBeInTheDocument();
    });

    // Retry 2
    fireEvent.click(screen.getByText(/Retry \(1\/2\)/));
    await waitFor(() => {
      expect(screen.getByText(/Maximum retry attempts reached/)).toBeInTheDocument();
    });
  });

  it("handles non-array response gracefully", async () => {
    mockGet.mockResolvedValue({ data: "not an array" });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText(/Invalid response format/)).toBeInTheDocument();
    });
  });

  // ---- Filtering ----

  it("filters maps by name", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ data: publicMaps });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("Default Map")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter maps by name or description...");
    await user.type(input, "Cycling");

    expect(screen.getByText("Cycling Map")).toBeInTheDocument();
    expect(screen.queryByText("Default Map")).not.toBeInTheDocument();
    expect(screen.queryByText("Transit Map")).not.toBeInTheDocument();
  });

  it("filters maps by description", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ data: publicMaps });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("Default Map")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter maps by name or description...");
    await user.type(input, "trails");

    expect(screen.getByText("Cycling Map")).toBeInTheDocument();
    expect(screen.queryByText("Default Map")).not.toBeInTheDocument();
  });

  it("shows filter summary text when filtering", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ data: publicMaps });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("Default Map")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter maps by name or description...");
    await user.type(input, "Cycling");

    expect(screen.getByText(/Showing 1 of 3 maps/)).toBeInTheDocument();
  });

  it("clears filter when clear button is clicked", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ data: publicMaps });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("Default Map")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter maps by name or description...");
    await user.type(input, "Cycling");
    expect(screen.queryByText("Default Map")).not.toBeInTheDocument();

    const clearBtn = screen.getByTitle("Clear filter");
    await user.click(clearBtn);

    expect(screen.getByText("Default Map")).toBeInTheDocument();
    expect(screen.getByText("Cycling Map")).toBeInTheDocument();
  });

  it("shows 'no maps match' when filter matches nothing", async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ data: publicMaps });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("Default Map")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Filter maps by name or description...");
    await user.type(input, "zzzznonexistent");

    expect(screen.getByText(/No maps match your filter/)).toBeInTheDocument();
  });

  // ---- Collapsible sections ----


  it("does not render section headers in public-only single-section mode", async () => {
    mockGet.mockResolvedValue({ data: publicMaps });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("Default Map")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Public Maps/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Secured Maps/)).not.toBeInTheDocument();
  });

  // ---- Navigation ----

  it("navigates to map when a map item is clicked", async () => {
    mockGet.mockResolvedValue({ data: publicMaps });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("Cycling Map")).toBeInTheDocument();
    });

    const mapButton = screen.getByText("Cycling Map").closest("[role='button']")!;
    fireEvent.click(mapButton);

    expect(window.location.href).toContain("MAP_ID=Cycling+Map");
  });

  it("navigates via keyboard Enter", async () => {
    mockGet.mockResolvedValue({ data: publicMaps });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("Cycling Map")).toBeInTheDocument();
    });

    const mapButton = screen.getByText("Cycling Map").closest("[role='button']")!;
    fireEvent.keyDown(mapButton, { key: "Enter" });

    expect(window.location.href).toContain("MAP_ID=Cycling+Map");
  });

  it("opens in new tab when external link button is clicked", async () => {
    const openSpy = vi.fn();
    window.open = openSpy;
    mockGet.mockResolvedValue({ data: publicMaps });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("Cycling Map")).toBeInTheDocument();
    });

    const newTabButtons = screen.getAllByTitle("Open in new tab");
    fireEvent.click(newTabButtons[1]); // second map (Cycling Map)

    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining("MAP_ID=Cycling+Map"), "_blank");
  });

  // ---- Panel ----

  it("passes name prop to PanelComponent", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderTool({ name: "My Maps" });

    expect(screen.getByTestId("panel-component")).toHaveAttribute("data-name", "My Maps");
  });

  it("uses default name when not provided", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderTool();

    expect(screen.getByTestId("panel-component")).toHaveAttribute("data-name", "Available Maps");
  });

  it("calls onClose when panel close is triggered", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const onClose = vi.fn();
    renderTool({ onClose });

    fireEvent.click(screen.getByTestId("panel-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ---- Data validation ----

  it("filters out invalid map entries from response", async () => {
    const invalidData = [...publicMaps, null, { map_name: "", description: "Empty name" } as unknown as MapItem, { description: "No name field" } as unknown as MapItem];
    mockGet.mockResolvedValue({ data: invalidData });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("Default Map")).toBeInTheDocument();
    });

    // Only the 3 valid public maps should be rendered, not the invalid entries
    expect(screen.getByText("Cycling Map")).toBeInTheDocument();
    expect(screen.getByText("Transit Map")).toBeInTheDocument();
    expect(screen.queryByText("Empty name")).not.toBeInTheDocument();
    expect(screen.queryByText("No name field")).not.toBeInTheDocument();
  });

  // ---- Empty state ----

  it("shows 'No maps available' when server returns empty array", async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderTool();

    await waitFor(() => {
      expect(screen.getByText("No maps available")).toBeInTheDocument();
    });
  });

  // ---- API call ----

  it("calls the correct API endpoint on mount", async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderTool();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/map/all");
    });
  });

  // ---- Instructional text ----

  it("shows instructional text", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderTool();

    expect(screen.getByText("Click on a map to switch to that configuration.")).toBeInTheDocument();
  });
});
