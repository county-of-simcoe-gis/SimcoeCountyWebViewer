import { describe, it, expect, beforeEach } from "vitest";
import { useMyMapsTextEntryStore } from "@/stores/myMapsTextEntryStore";

const START = [-8800000, 5500000];
const SECOND = [-8799000, 5500500];
const THIRD = [-8798000, 5500000];

describe("myMapsTextEntryStore", () => {
  beforeEach(() => {
    useMyMapsTextEntryStore.setState({ enabled: false, unit: "m", drawType: "Cancel", points: [], error: null, completed: null });
  });

  it("records the start point for a session", () => {
    const store = useMyMapsTextEntryStore.getState();
    store.startSession("LineString");
    store.setStartPoint(START);

    expect(useMyMapsTextEntryStore.getState().drawType).toBe("LineString");
    expect(useMyMapsTextEntryStore.getState().points).toEqual([START]);
  });

  it("appends path segments without completing a line", () => {
    const store = useMyMapsTextEntryStore.getState();
    store.startSession("LineString");
    store.setStartPoint(START);
    store.addPoint(SECOND);

    expect(useMyMapsTextEntryStore.getState().points).toEqual([START, SECOND]);
    expect(useMyMapsTextEntryStore.getState().completed).toBeNull();
  });

  it("completes Bearing after one segment", () => {
    const store = useMyMapsTextEntryStore.getState();
    store.startSession("Bearing");
    store.setStartPoint(START);
    store.addPoint(SECOND);

    expect(useMyMapsTextEntryStore.getState().completed).toEqual({ kind: "path", drawType: "Bearing", points: [START, SECOND] });
  });

  it("undo removes the last point but keeps the start point", () => {
    useMyMapsTextEntryStore.setState({ drawType: "LineString", points: [START, SECOND, THIRD] });

    useMyMapsTextEntryStore.getState().undo();
    expect(useMyMapsTextEntryStore.getState().points).toEqual([START, SECOND]);

    useMyMapsTextEntryStore.getState().undo();
    useMyMapsTextEntryStore.getState().undo();
    expect(useMyMapsTextEntryStore.getState().points).toEqual([START]);
  });

  it("requires three points before a polygon can finish", () => {
    useMyMapsTextEntryStore.setState({ drawType: "Polygon", points: [START, SECOND] });

    useMyMapsTextEntryStore.getState().finish();
    expect(useMyMapsTextEntryStore.getState().error).toBe("Add at least two segments to close a polygon.");
    expect(useMyMapsTextEntryStore.getState().completed).toBeNull();

    useMyMapsTextEntryStore.getState().addPoint(THIRD);
    useMyMapsTextEntryStore.getState().finish();
    expect(useMyMapsTextEntryStore.getState().completed).toEqual({ kind: "path", drawType: "Polygon", points: [START, SECOND, THIRD] });
  });

  it("stores circle and rectangle geometry on complete", () => {
    useMyMapsTextEntryStore.getState().complete({ kind: "circle", center: START, radiusM: 50 });

    expect(useMyMapsTextEntryStore.getState().completed).toEqual({ kind: "circle", center: START, radiusM: 50 });
  });

  it("clears the session when the toggle changes", () => {
    useMyMapsTextEntryStore.setState({ enabled: false, drawType: "LineString", points: [START], error: "old" });

    useMyMapsTextEntryStore.getState().setEnabled(true);

    expect(useMyMapsTextEntryStore.getState()).toMatchObject({ enabled: true, drawType: "Cancel", points: [], error: null });
  });

  it("reset keeps the toggle and unit", () => {
    useMyMapsTextEntryStore.setState({ enabled: true, unit: "ft", drawType: "LineString", points: [START] });

    useMyMapsTextEntryStore.getState().reset();

    expect(useMyMapsTextEntryStore.getState()).toMatchObject({ enabled: true, unit: "ft", drawType: "Cancel", points: [] });
  });
});
