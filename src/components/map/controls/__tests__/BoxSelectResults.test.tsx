import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BoxSelectResults from "@/components/map/controls/BoxSelectResults";

const mocks = vi.hoisted(() => {
  const mapState: { activeToolId: string | null; setActiveToolId: (id: string | null) => void } = {
    activeToolId: null,
    setActiveToolId: () => undefined,
  };
  const registerInteraction = vi.fn();
  const unregisterInteraction = vi.fn();
  const emit = vi.fn();
  const extent: [number, number, number, number] = [1, 2, 3, 4];
  const boxEndRef: { current: (() => void) | null } = { current: null };
  mapState.setActiveToolId = vi.fn((id: string | null) => {
    mapState.activeToolId = id;
  });
  return { mapState, registerInteraction, unregisterInteraction, emit, extent, boxEndRef };
});

vi.mock("ol/interaction", () => ({
  DragBox: class {
    on(_event: string, listener: () => void) {
      mocks.boxEndRef.current = listener;
    }

    getGeometry() {
      return { getExtent: () => mocks.extent };
    }
  },
}));

vi.mock("react-icons/gr", () => ({
  GrSelect: () => <span data-testid="box-select-icon" />,
}));

vi.mock("@/stores/mapStore", () => ({
  useMapStore: Object.assign((selector: (state: typeof mocks.mapState) => unknown) => selector(mocks.mapState), {
    getState: () => mocks.mapState,
  }),
}));

vi.mock("@/stores/interactionManagerStore", () => ({
  useInteractionManagerStore: { getState: () => ({ registerInteraction: mocks.registerInteraction, unregisterInteraction: mocks.unregisterInteraction }) },
}));

vi.mock("@/stores/eventStore", () => ({
  useEventStore: { getState: () => ({ emit: mocks.emit }) },
}));

afterEach(() => {
  vi.clearAllMocks();
  mocks.mapState.activeToolId = null;
  mocks.boxEndRef.current = null;
});

describe("BoxSelectResults", () => {
  it("toggles box selection, dispatches the extent, and unregisters on deactivation", () => {
    render(<BoxSelectResults map={{} as never} />);

    const activateButton = screen.getByRole("button", { name: /select results by area/i });
    fireEvent.click(activateButton);

    expect(mocks.mapState.setActiveToolId).toHaveBeenCalledWith("results-box-select");
    expect(mocks.registerInteraction).toHaveBeenCalledWith("results-box-select-dragbox", expect.anything(), "results-box-select");
    expect(screen.getByRole("button", { name: "Cancel area selection" })).toHaveAttribute("aria-pressed", "true");

    mocks.boxEndRef.current?.();
    expect(mocks.emit).toHaveBeenCalledWith("results-box-select", { extent: mocks.extent });

    fireEvent.click(screen.getByRole("button", { name: "Cancel area selection" }));
    expect(mocks.unregisterInteraction).toHaveBeenCalledWith("results-box-select-dragbox");
    expect(mocks.mapState.setActiveToolId).toHaveBeenLastCalledWith(null);
  });
});
