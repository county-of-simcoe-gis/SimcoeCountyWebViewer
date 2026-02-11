import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Five11MtoPopupContent from "../Five11MtoPopupContent";

describe("Five11MtoPopupContent", () => {
  const fullProperties = {
    DirectionOfTravel: "Northbound",
    Description: "Lane closure for road repairs",
    LanesAffected: "Right lane",
    EventType: "CONSTRUCTION",
    IsFullClosure: false,
    Comment: "Expected duration 3 hours",
    startDate: "2026-02-10T08:00:00Z",
    endDate: "2026-02-10T11:00:00Z",
  };

  it("renders all MTO event fields", () => {
    render(<Five11MtoPopupContent properties={fullProperties} />);

    expect(screen.getByText("Northbound")).toBeInTheDocument();
    expect(screen.getByText("Lane closure for road repairs")).toBeInTheDocument();
    expect(screen.getByText("Right lane")).toBeInTheDocument();
    expect(screen.getByText("CONSTRUCTION")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument(); // IsFullClosure = false
    expect(screen.getByText("Expected duration 3 hours")).toBeInTheDocument();
  });

  it("renders formatted field labels", () => {
    render(<Five11MtoPopupContent properties={fullProperties} />);

    expect(screen.getByText("Direction of Travel")).toBeInTheDocument();
    expect(screen.getByText("Lanes Affected")).toBeInTheDocument();
    expect(screen.getByText("Event Type")).toBeInTheDocument();
    expect(screen.getByText("Full Closure")).toBeInTheDocument();
  });

  it("displays Yes for IsFullClosure when true", () => {
    const props = {
      ...fullProperties,
      IsFullClosure: true,
    };

    render(<Five11MtoPopupContent properties={props} />);

    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("displays Yes for IsFullClosure when string 'true'", () => {
    const props = {
      ...fullProperties,
      IsFullClosure: "true" as any,
    };

    render(<Five11MtoPopupContent properties={props} />);

    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("skips null and undefined values", () => {
    const sparseProps = {
      EventType: "ROAD_CLOSURE",
      Description: undefined,
      LanesAffected: null,
    };

    render(<Five11MtoPopupContent properties={sparseProps as any} />);

    expect(screen.getByText("ROAD_CLOSURE")).toBeInTheDocument();
  });

  it("skips empty string values", () => {
    const props = {
      EventType: "EVENT",
      Description: "",
      Comment: "Some comment",
    };

    render(<Five11MtoPopupContent properties={props} />);

    expect(screen.getByText("EVENT")).toBeInTheDocument();
    expect(screen.getByText("Some comment")).toBeInTheDocument();
    // Description should not be rendered since it's empty
  });

  it("skips geometry and internal fields", () => {
    const props = {
      EventType: "HAZARD",
      geometry: { type: "Point", coordinates: [0, 0] },
      _internal: "data",
    };

    render(<Five11MtoPopupContent properties={props as any} />);

    expect(screen.getByText("HAZARD")).toBeInTheDocument();
    expect(screen.queryByText("data")).not.toBeInTheDocument();
  });

  it("shows no details message when no matching fields", () => {
    const emptyProps = { randomField: "something" };

    render(<Five11MtoPopupContent properties={emptyProps as any} />);

    expect(screen.getByText("No details available")).toBeInTheDocument();
  });

  it("renders date fields when present", () => {
    const props = {
      EventType: "CONSTRUCTION",
      startDate: "2026-02-10T08:00:00Z",
      endDate: "2026-02-10T17:00:00Z",
    };

    render(<Five11MtoPopupContent properties={props} />);

    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("End Date")).toBeInTheDocument();
    expect(screen.getByText("2026-02-10T08:00:00Z")).toBeInTheDocument();
    expect(screen.getByText("2026-02-10T17:00:00Z")).toBeInTheDocument();
  });

  it("only shows fields from the allowed field list", () => {
    const props = {
      EventType: "SPECIAL_EVENT",
      SomeUnknownField: "should not appear",
      Description: "A special event",
    };

    render(<Five11MtoPopupContent properties={props as any} />);

    expect(screen.getByText("SPECIAL_EVENT")).toBeInTheDocument();
    expect(screen.getByText("A special event")).toBeInTheDocument();
    expect(screen.queryByText("should not appear")).not.toBeInTheDocument();
  });
});
