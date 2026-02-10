import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Five11WazePopupContent from "../Five11WazePopupContent";

describe("Five11WazePopupContent", () => {
  describe("alert layers (point)", () => {
    const alertProperties = {
      type: "ACCIDENT",
      subtype: "ACCIDENT_MINOR",
      reportDescription: "Minor accident on highway",
      date: "2026-02-10T10:30:00Z",
      street: "Highway 400",
    };

    it("renders all relevant Waze alert fields", () => {
      render(<Five11WazePopupContent properties={alertProperties} layerName="511-waze-accident" />);

      expect(screen.getByText("ACCIDENT")).toBeInTheDocument();
      expect(screen.getByText("ACCIDENT_MINOR")).toBeInTheDocument();
      expect(screen.getByText("Minor accident on highway")).toBeInTheDocument();
      expect(screen.getByText("Highway 400")).toBeInTheDocument();
    });

    it("renders formatted field labels", () => {
      render(<Five11WazePopupContent properties={alertProperties} layerName="511-waze-accident" />);

      expect(screen.getByText("Type")).toBeInTheDocument();
      expect(screen.getByText("Subtype")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument(); // reportDescription maps to Description
      expect(screen.getByText("Street")).toBeInTheDocument();
    });

    it("skips null and undefined values", () => {
      const sparseProperties = {
        type: "HAZARD",
        subtype: undefined,
        reportDescription: null,
        street: "Main St",
      };

      render(<Five11WazePopupContent properties={sparseProperties as any} layerName="511-waze-hazard" />);

      expect(screen.getByText("HAZARD")).toBeInTheDocument();
      expect(screen.getByText("Main St")).toBeInTheDocument();
      // Only 2 field entries should render (type and street)
      const fieldLabels = screen.getAllByText(/^(Type|Street)$/);
      expect(fieldLabels.length).toBe(2);
    });

    it("skips empty string values", () => {
      const props = {
        type: "ROAD_CLOSED",
        subtype: "",
        street: "Elm St",
      };

      render(<Five11WazePopupContent properties={props} layerName="511-waze-road-closed" />);

      expect(screen.getByText("ROAD_CLOSED")).toBeInTheDocument();
      expect(screen.getByText("Elm St")).toBeInTheDocument();
    });

    it("skips geometry and internal fields", () => {
      const props = {
        type: "CONSTRUCTION",
        geometry: { type: "Point", coordinates: [0, 0] },
        _internalField: "secret",
        street: "Oak Ave",
      };

      render(<Five11WazePopupContent properties={props as any} layerName="511-waze-construction" />);

      expect(screen.getByText("CONSTRUCTION")).toBeInTheDocument();
      expect(screen.queryByText("secret")).not.toBeInTheDocument();
    });

    it("shows no details message when no matching fields", () => {
      const emptyProps = { unknownField: "value" };

      render(<Five11WazePopupContent properties={emptyProps as any} layerName="511-waze-accident" />);

      expect(screen.getByText("No details available")).toBeInTheDocument();
    });
  });

  describe("line layers (jam/irregularity)", () => {
    const jamProperties = {
      speedKMH: 45,
      delay: 120,
      date: "2026-02-10T10:30:00Z",
      street: "Highway 11",
      city: "Barrie",
    };

    it("renders line layer fields for jam layers", () => {
      render(<Five11WazePopupContent properties={jamProperties} layerName="511-waze-jam-lines" />);

      expect(screen.getByText("45")).toBeInTheDocument();
      expect(screen.getByText("120")).toBeInTheDocument();
      expect(screen.getByText("Highway 11")).toBeInTheDocument();
      expect(screen.getByText("Barrie")).toBeInTheDocument();
    });

    it("renders Speed (km/h) label for speedKMH field", () => {
      render(<Five11WazePopupContent properties={jamProperties} layerName="511-waze-jam-lines" />);

      expect(screen.getByText("Speed (km/h)")).toBeInTheDocument();
    });

    it("renders line layer fields for irregularity layers", () => {
      const irregProps = {
        speedKMH: 30,
        delay: 60,
        street: "County Road 90",
      };

      render(<Five11WazePopupContent properties={irregProps} layerName="511-waze-irregularity-lines" />);

      expect(screen.getByText("30")).toBeInTheDocument();
      expect(screen.getByText("60")).toBeInTheDocument();
      expect(screen.getByText("County Road 90")).toBeInTheDocument();
    });

    it("does not show alert-only fields like type/subtype for line layers", () => {
      const mixedProps = {
        type: "JAM",
        subtype: "JAM_HEAVY",
        speedKMH: 20,
        street: "Hwy 26",
      };

      render(<Five11WazePopupContent properties={mixedProps as any} layerName="511-waze-jam-lines" />);

      // type and subtype are not in the line layer field list
      expect(screen.queryByText("JAM")).not.toBeInTheDocument();
      expect(screen.queryByText("JAM_HEAVY")).not.toBeInTheDocument();
      // But speedKMH and street should be present
      expect(screen.getByText("20")).toBeInTheDocument();
      expect(screen.getByText("Hwy 26")).toBeInTheDocument();
    });
  });
});
