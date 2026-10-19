import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ButtonBar from "@/components/myMaps/ButtonBar";

const mockToggleTrack = vi.fn();
const mockRequestPointAtLocation = vi.fn();
const mockSetDrawType = vi.fn();

vi.mock("@/stores/locationFollowStore", () => ({
  useLocationFollowStore: (selector: (state: Record<string, unknown>) => unknown) => selector({ mode: "off", toggleTrack: mockToggleTrack, requestPointAtLocation: mockRequestPointAtLocation }),
}));

vi.mock("@/stores/myMapsStore", () => ({
  useMyMapsStore: () => ({ drawType: "Cancel", setDrawType: mockSetDrawType }),
}));

vi.mock("@/components/myMaps/DrawButton", () => ({
  default: ({ title, onClick, disabled, visible }: { title: string; onClick: () => void; disabled?: boolean; visible?: boolean }) => {
    if (!visible) return null;
    return (
      <button type="button" title={title} disabled={disabled} onClick={onClick}>
        {title}
      </button>
    );
  },
}));

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true });
};

describe("ButtonBar location actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enables track and point actions on mobile", () => {
    setViewportWidth(500);
    render(<ButtonBar />);

    fireEvent.click(screen.getByTitle(/Track my location/));
    fireEvent.click(screen.getByTitle("Add a point at my current location"));

    expect(mockSetDrawType).toHaveBeenCalledWith("Cancel");
    expect(mockToggleTrack).toHaveBeenCalledTimes(1);
    expect(mockRequestPointAtLocation).toHaveBeenCalledTimes(1);
  });

  it("hides track and point actions on desktop", () => {
    setViewportWidth(1200);
    render(<ButtonBar />);

    expect(screen.queryByTitle(/Track my location/)).not.toBeInTheDocument();
    expect(screen.queryByTitle("Add a point at my current location")).not.toBeInTheDocument();
  });
});
