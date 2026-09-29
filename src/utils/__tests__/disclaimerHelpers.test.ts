import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { acceptDisclaimer, __resetAcceptedDisclaimersForTests } from "@/utils/disclaimerHelpers";
import { useDisclaimerModalStore } from "@/stores/disclaimerModalStore";
import { type TOCLayer } from "@/stores/tocStore";

const baseLayer: TOCLayer = {
  id: "test-layer-1",
  name: "Test Layer",
  displayName: "Test Layer Display",
  tocDisplayName: "Test Layer TOC",
  visible: false,
  layer: null,
  opacity: 1,
  minScale: 0,
  maxScale: 100000000000,
  liveLayer: false,
  group: "group-1",
  groupName: "Group 1",
  styleUrl: "",
  height: 30,
  drawIndex: 1,
  index: 1,
  initialDrawIndex: 1,
  showLegend: false,
  legendHeight: -1,
  legendImage: null,
  legendObj: null,
  metadataUrl: null,
  userLayer: false,
  canDownload: false,
  hasAttachments: false,
  secured: false,
};

describe("acceptDisclaimer", () => {
  beforeEach(() => {
    __resetAcceptedDisclaimersForTests();
    useDisclaimerModalStore.setState(useDisclaimerModalStore.getInitialState?.() ?? { isOpen: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when the layer has no disclaimer", () => {
    const layer: TOCLayer = { ...baseLayer, disclaimer: undefined };
    const callback = vi.fn();

    expect(acceptDisclaimer(layer, callback)).toBe(true);
    expect(callback).not.toHaveBeenCalled();
    expect(useDisclaimerModalStore.getState().isOpen).toBe(false);
  });

  it("returns true and clears acceptance when the layer is already visible (user is turning it off)", () => {
    const layer: TOCLayer = { ...baseLayer, visible: true, disclaimer: { title: "Disclaimer" } };

    // Accept first, then simulate turning the layer off.
    acceptDisclaimer({ ...layer, visible: false }, () => {});
    useDisclaimerModalStore.getState().onAccept?.();
    useDisclaimerModalStore.getState().close();

    const callback = vi.fn();
    expect(acceptDisclaimer(layer, callback)).toBe(true);
    expect(callback).not.toHaveBeenCalled();

    // After turning off, turning on again should prompt.
    expect(acceptDisclaimer({ ...layer, visible: false }, callback)).toBe(false);
  });

  it("returns true immediately when the disclaimer has already been accepted", () => {
    const layer: TOCLayer = { ...baseLayer, disclaimer: { title: "Disclaimer" } };

    acceptDisclaimer(layer, () => {});
    useDisclaimerModalStore.getState().onAccept?.();

    const callback = vi.fn();
    expect(acceptDisclaimer(layer, callback)).toBe(true);
    expect(callback).not.toHaveBeenCalled();
  });

  it("shows a warning modal with only an OK button when disclaimer.warning is present", () => {
    const layer: TOCLayer = { ...baseLayer, disclaimer: { title: "Caution", warning: "This layer is dangerous." } };
    const callback = vi.fn();

    expect(acceptDisclaimer(layer, callback)).toBe(false);

    const state = useDisclaimerModalStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.title).toBe("Caution");
    expect(state.message).toBe("This layer is dangerous.");
    expect(state.showAccept).toBe(true);
    expect(state.acceptLabel).toBe("OK");
    expect(state.showDecline).toBe(false);

    state.onAccept?.();
    expect(callback).toHaveBeenCalled();
  });

  it("shows a licence modal with a URL link when disclaimer.url is present", () => {
    const layer: TOCLayer = { ...baseLayer, disclaimer: { title: "License", url: "https://example.com/terms" } };
    const callback = vi.fn();

    expect(acceptDisclaimer(layer, callback)).toBe(false);

    const state = useDisclaimerModalStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.title).toBe("License");
    expect(state.url).toBe("https://example.com/terms");
    expect(state.message).toContain("licence agreement");
    expect(state.showAccept).toBe(true);
    expect(state.showDecline).toBe(true);

    state.onAccept?.();
    expect(callback).toHaveBeenCalled();
  });

  it("shows a generic disclaimer modal when only disclaimer.title is present", () => {
    const layer: TOCLayer = { ...baseLayer, disclaimer: { title: "Important Disclaimer" } };
    const callback = vi.fn();

    expect(acceptDisclaimer(layer, callback)).toBe(false);

    const state = useDisclaimerModalStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.title).toBe("Important Disclaimer");
    expect(state.message).toContain("subject to a disclaimer");
    expect(state.url).toBe("");
    expect(state.showAccept).toBe(true);
    expect(state.showDecline).toBe(true);

    state.onAccept?.();
    expect(callback).toHaveBeenCalled();
  });

  it("does not call the callback when the user declines", () => {
    const layer: TOCLayer = { ...baseLayer, disclaimer: { title: "Disclaimer" } };
    const callback = vi.fn();

    acceptDisclaimer(layer, callback);
    useDisclaimerModalStore.getState().onDecline?.();

    expect(callback).not.toHaveBeenCalled();
  });

  it("prevents duplicate modals for the same layer", () => {
    const layer: TOCLayer = { ...baseLayer, disclaimer: { title: "Disclaimer" } };
    const callback = vi.fn();

    expect(acceptDisclaimer(layer, callback)).toBe(false);
    expect(acceptDisclaimer(layer, callback)).toBe(false);

    // Modal should still only be open once; onAccept still works.
    useDisclaimerModalStore.getState().onAccept?.();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
