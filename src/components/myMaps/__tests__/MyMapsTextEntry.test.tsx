import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import MyMapsTextEntry from "@/components/myMaps/MyMapsTextEntry";
import { useMyMapsStore, type DrawType } from "@/stores/myMapsStore";
import { useMyMapsTextEntryStore } from "@/stores/myMapsTextEntryStore";

const START = [-8800000, 5500000];
const SECOND = [-8799000, 5500500];
const THIRD = [-8798000, 5500000];

const setSession = (drawType: DrawType, points: number[][], enabled = true) => {
  useMyMapsStore.setState({ drawType });
  useMyMapsTextEntryStore.setState({ enabled, unit: "m", drawType, points, segments: [], error: null, completed: null });
};

describe("MyMapsTextEntry", () => {
  beforeEach(() => {
    setSession("Cancel", []);
  });

  it("renders nothing for tools without text entry", () => {
    setSession("Point", []);
    render(<MyMapsTextEntry />);

    expect(screen.queryByTestId("mymaps-text-entry")).toBeNull();
  });

  it("asks for a start point once keyboard entry is turned on", async () => {
    const user = userEvent.setup();
    setSession("LineString", [], false);
    render(<MyMapsTextEntry />);

    await user.click(screen.getByLabelText("Keyboard entry"));

    expect(useMyMapsTextEntryStore.getState().enabled).toBe(true);
    expect(screen.getByText("Click the start point on the map.")).toBeInTheDocument();
  });

  it("adds a segment from bearing and distance on Enter", async () => {
    const user = userEvent.setup();
    setSession("LineString", [START]);
    render(<MyMapsTextEntry />);

    await user.type(screen.getByLabelText("Bearing (°)"), "90");
    await user.type(screen.getByLabelText("Distance"), "100{Enter}");

    expect(useMyMapsTextEntryStore.getState().points).toHaveLength(2);
  });

  it("adds a segment when the Next button is clicked", async () => {
    const user = userEvent.setup();
    setSession("LineString", [START]);
    render(<MyMapsTextEntry />);

    await user.type(screen.getByLabelText("Bearing (°)"), "90");
    await user.type(screen.getByLabelText("Distance"), "100");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(useMyMapsTextEntryStore.getState().points).toHaveLength(2);
  });

  it("lists the start coordinate and each entered segment", async () => {
    const user = userEvent.setup();
    setSession("LineString", [START]);
    render(<MyMapsTextEntry />);

    await user.type(screen.getByLabelText("Bearing (°)"), "90");
    await user.type(screen.getByLabelText("Distance"), "100{Enter}");

    const history = screen.getByTestId("mymaps-text-entry-history");
    expect(history).toHaveTextContent(/Start: -?\d+\.\d{6}, -?\d+\.\d{6}/);
    expect(history).toHaveTextContent("1. 90° 100 m to");
  });

  it("shows an error for a bearing outside 0 to 360", async () => {
    const user = userEvent.setup();
    setSession("LineString", [START]);
    render(<MyMapsTextEntry />);

    await user.type(screen.getByLabelText("Bearing (°)"), "400");
    await user.type(screen.getByLabelText("Distance"), "100{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a bearing from 0 to 360 degrees.");
    expect(useMyMapsTextEntryStore.getState().points).toHaveLength(1);
  });

  it("keeps Finish disabled for a polygon with fewer than three points", () => {
    setSession("Polygon", [START]);
    render(<MyMapsTextEntry />);

    expect(screen.getByRole("button", { name: "Finish" })).toBeDisabled();
  });

  it("completes a polygon when Finish is clicked with three points", async () => {
    const user = userEvent.setup();
    setSession("Polygon", [START, SECOND, THIRD]);
    render(<MyMapsTextEntry />);

    await user.click(screen.getByRole("button", { name: "Finish" }));

    expect(useMyMapsTextEntryStore.getState().completed).toEqual({ kind: "path", drawType: "Polygon", points: [START, SECOND, THIRD] });
  });

  it("cancels the tool on Escape", () => {
    setSession("LineString", [START]);
    render(<MyMapsTextEntry />);

    fireEvent.keyDown(screen.getByTestId("mymaps-text-entry"), { key: "Escape" });

    expect(useMyMapsStore.getState().drawType).toBe("Cancel");
  });
});
