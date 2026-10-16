import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReportsFeatureList from "@/components/ReportsFeatureList";
import ResultsPopup, { createIdentifyResult, type Result } from "@/components/ResultsPopup";

vi.mock("@/components/ResultsPopup.css", () => ({}));
vi.mock("@/components/RecordSelectorPopup.css", () => ({}));

vi.mock("@/components/PropertyPopup", () => ({
  default: () => <div data-testid="property-popup" />,
}));

const fieldMetadata = {
  aliases: { zone_code: "Zoning Code", road_name: "Road Name" },
  domains: { zone_code: [{ code: "R1", name: "Residential One" }] },
};

function makeIdentifyResult(id: string, name: string): Result {
  return createIdentifyResult("Parcels", id, { ZONE_CODE: "R1", ROAD_NAME: name }, undefined, 0, { displayName: name, fieldMetadata });
}

describe("ReportsFeatureList", () => {
  it("shows the same field aliases and domain values as ResultsPopup", () => {
    const result = makeIdentifyResult("1", "Main St");

    const { unmount } = render(<ResultsPopup results={[result]} onClose={vi.fn()} />);
    expect(screen.getByText(/Zoning Code/)).toBeInTheDocument();
    expect(screen.getByText("Residential One")).toBeInTheDocument();
    expect(screen.queryByText("R1")).not.toBeInTheDocument();
    unmount();

    render(<ReportsFeatureList results={[result]} />);
    expect(screen.getByText(/Zoning Code/)).toBeInTheDocument();
    expect(screen.getByText("Residential One")).toBeInTheDocument();
    expect(screen.queryByText("R1")).not.toBeInTheDocument();
  });

  it("loads lazy details for the first panel on mount and for a panel when it expands", async () => {
    const user = userEvent.setup();
    const first = Object.assign(makeIdentifyResult("1", "Main St"), { loadDetails: vi.fn(async () => {}) });
    const second = Object.assign(makeIdentifyResult("2", "Oak Ave"), { loadDetails: vi.fn(async () => {}) });

    render(<ReportsFeatureList results={[first, second]} />);
    expect(first.loadDetails).toHaveBeenCalledTimes(1);
    expect(second.loadDetails).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Oak Ave/ }));
    expect(second.loadDetails).toHaveBeenCalledTimes(1);
  });
});
