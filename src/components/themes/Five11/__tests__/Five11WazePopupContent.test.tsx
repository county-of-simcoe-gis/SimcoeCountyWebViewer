import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Five11WazePopupContent from "../Five11WazePopupContent";

describe("Five11WazePopupContent", () => {
  const now = 1776010900000; // matches sample feed timestamp

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("alert layers (point)", () => {
    it("renders a friendly title from subtype", () => {
      render(<Five11WazePopupContent properties={{ type: "HAZARD", subtype: "HAZARD_ON_ROAD_CONSTRUCTION", street: "CR-27" }} layerName="511-waze-construction" />);

      expect(screen.getByText("Road construction")).toBeInTheDocument();
      expect(screen.getByText("CR-27")).toBeInTheDocument();
      expect(screen.queryByText("HAZARD")).not.toBeInTheDocument();
      expect(screen.queryByText("HAZARD_ON_ROAD_CONSTRUCTION")).not.toBeInTheDocument();
    });

    it("renders relative time and driver confirmations", () => {
      render(
        <Five11WazePopupContent
          properties={{
            type: "HAZARD",
            subtype: "HAZARD_ON_ROAD_CONSTRUCTION",
            street: "CR-27",
            pubMillis: now - 47 * 60 * 1000,
            nThumbsUp: 3,
          }}
          layerName="511-waze-construction"
        />,
      );

      expect(screen.getByText("47 min ago")).toBeInTheDocument();
      expect(screen.getByText("3 drivers")).toBeInTheDocument();
    });

    it("uses type as title fallback when subtype is missing", () => {
      render(<Five11WazePopupContent properties={{ type: "ROAD_CLOSED", street: "5th Sideroad" }} layerName="511-waze-road-closed" />);

      expect(screen.getByText("Road closed")).toBeInTheDocument();
      expect(screen.getByText("5th Sideroad")).toBeInTheDocument();
    });

    it("renders the report description when it differs from the title", () => {
      render(
        <Five11WazePopupContent
          properties={{
            type: "ROAD_CLOSED",
            street: "5th Sideroad",
            reportDescription: "This bridge is permanently closed.",
          }}
          layerName="511-waze-road-closed"
        />,
      );

      expect(screen.getByText("This bridge is permanently closed.")).toBeInTheDocument();
    });

    it("omits the description when it matches the generated title", () => {
      render(
        <Five11WazePopupContent
          properties={{
            type: "HAZARD",
            subtype: "HAZARD_ON_ROAD_CONSTRUCTION",
            reportDescription: "Road construction",
            street: "CR-27",
          }}
          layerName="511-waze-construction"
        />,
      );

      // Title is shown, but the redundant description is not rendered separately
      expect(screen.getByText("Road construction")).toBeInTheDocument();
      expect(screen.queryByText(/Road construction.{1}/)).not.toBeInTheDocument();
    });

    it("shows no details message when there is nothing to display", () => {
      render(<Five11WazePopupContent properties={{}} layerName="511-waze-accident" />);

      expect(screen.getByText("No details available")).toBeInTheDocument();
    });
  });

  describe("line layers (jam/irregularity)", () => {
    it("renders speed, delay, street, city, and relative time for jam layers", () => {
      render(
        <Five11WazePopupContent
          properties={{
            speedKMH: 45,
            delay: 2,
            street: "Highway 11",
            city: "Barrie",
            pubMillis: now - 30 * 60 * 1000,
          }}
          layerName="511-waze-jam-lines"
        />,
      );

      expect(screen.getByText("45 km/h")).toBeInTheDocument();
      expect(screen.getByText("2 min")).toBeInTheDocument();
      expect(screen.getByText("Highway 11")).toBeInTheDocument();
      expect(screen.getByText("Barrie")).toBeInTheDocument();
      expect(screen.getByText("30 min ago")).toBeInTheDocument();
    });

    it("renders irregularity layer fields using updateDateMillis", () => {
      render(
        <Five11WazePopupContent
          properties={{
            speedKMH: 30,
            delay: 1,
            street: "County Road 90",
            updateDateMillis: now - 90 * 60 * 1000,
          }}
          layerName="511-waze-irregularity-lines"
        />,
      );

      expect(screen.getByText("30 km/h")).toBeInTheDocument();
      expect(screen.getByText("1 min")).toBeInTheDocument();
      expect(screen.getByText("County Road 90")).toBeInTheDocument();
      expect(screen.getByText("1 hr ago")).toBeInTheDocument();
    });

    it("does not show alert-only fields for line layers", () => {
      render(
        <Five11WazePopupContent
          properties={{
            type: "JAM",
            subtype: "JAM_HEAVY",
            speedKMH: 20,
            street: "Hwy 26",
          }}
          layerName="511-waze-jam-lines"
        />,
      );

      expect(screen.queryByText("JAM")).not.toBeInTheDocument();
      expect(screen.queryByText("JAM_HEAVY")).not.toBeInTheDocument();
      expect(screen.getByText("20 km/h")).toBeInTheDocument();
      expect(screen.getByText("Hwy 26")).toBeInTheDocument();
    });

    it("shows no details message when line layer has no details", () => {
      render(<Five11WazePopupContent properties={{}} layerName="511-waze-jam-lines" />);

      expect(screen.getByText("No details available")).toBeInTheDocument();
    });
  });
});
