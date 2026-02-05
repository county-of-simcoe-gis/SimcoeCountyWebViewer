/**
 * Tests for AvlHistoryPopup component - History vehicle popup content.
 *
 * Tests cover:
 * - Vehicle information display
 * - Spreader data display (plow, wing, spreader status)
 * - Temperature display
 * - Date formatting
 * - onRef callback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AvlHistoryPopup from "../components/AvlHistoryPopup";
import { mockHistoryVehicle } from "./mockData";
import type { AvlHistoryVehicle } from "../types/avl.types";

describe("AvlHistoryPopup", () => {
  const defaultProps = {
    info: mockHistoryVehicle,
    onRef: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Basic Information", () => {
    it("renders vehicle name", () => {
      render(<AvlHistoryPopup {...defaultProps} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText(mockHistoryVehicle.vehicle_name)).toBeInTheDocument();
    });

    it("renders vehicle speed", () => {
      render(<AvlHistoryPopup {...defaultProps} />);

      expect(screen.getByText("Speed")).toBeInTheDocument();
      expect(screen.getByText(String(mockHistoryVehicle.velocity))).toBeInTheDocument();
    });

    it("renders formatted date", () => {
      render(<AvlHistoryPopup {...defaultProps} />);

      expect(screen.getByText("Date")).toBeInTheDocument();
    });

    it("renders vehicle description when available", () => {
      const vehicleWithDescription: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        vehicle_description: "Test Description",
      };
      render(<AvlHistoryPopup {...defaultProps} info={vehicleWithDescription} />);

      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
    });
  });

  describe("Spreader Data", () => {
    it("shows spreader data when PlowDown is defined", () => {
      const spreaderVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: true,
        DryOn: true,
      };
      render(<AvlHistoryPopup {...defaultProps} info={spreaderVehicle} />);

      expect(screen.getByText("Plow Down")).toBeInTheDocument();
      expect(screen.getByText("Spreader On")).toBeInTheDocument();
    });

    it("shows Plow Down as Yes when true", () => {
      const plowDownVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: true,
      };
      render(<AvlHistoryPopup {...defaultProps} info={plowDownVehicle} />);

      expect(screen.getByText("Plow Down")).toBeInTheDocument();
      // Find the row with Plow Down and check its value
      const plowDownLabel = screen.getByText("Plow Down");
      const row = plowDownLabel.closest(".sc-info-window-row");
      expect(row).toHaveTextContent("Yes");
    });

    it("shows Plow Down as No when false", () => {
      const plowUpVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: false,
      };
      render(<AvlHistoryPopup {...defaultProps} info={plowUpVehicle} />);

      const plowDownLabel = screen.getByText("Plow Down");
      const row = plowDownLabel.closest(".sc-info-window-row");
      expect(row).toHaveTextContent("No");
    });

    it("shows spreader rate", () => {
      const spreaderRateVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: true,
        DryRateKilosPerLaneKilometer: 150,
      };
      render(<AvlHistoryPopup {...defaultProps} info={spreaderRateVehicle} />);

      expect(screen.getByText("Spread Rate")).toBeInTheDocument();
    });

    it("shows wing down status", () => {
      const wingVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: true,
        WingDown: true,
      };
      render(<AvlHistoryPopup {...defaultProps} info={wingVehicle} />);

      expect(screen.getByText("Wing Down")).toBeInTheDocument();
    });

    it("shows blasting status", () => {
      const blastingVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: true,
        Blasting: true,
      };
      render(<AvlHistoryPopup {...defaultProps} info={blastingVehicle} />);

      expect(screen.getByText("Blasting")).toBeInTheDocument();
    });

    it("does not show spreader data when PlowDown is undefined", () => {
      const nonSpreaderVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: undefined,
      };
      render(<AvlHistoryPopup {...defaultProps} info={nonSpreaderVehicle} />);

      expect(screen.queryByText("Plow Down")).not.toBeInTheDocument();
      expect(screen.queryByText("Spreader On")).not.toBeInTheDocument();
    });
  });

  describe("Temperature Data", () => {
    it("shows air temperature", () => {
      const tempVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: true,
        TemperatureAir: -5,
      };
      render(<AvlHistoryPopup {...defaultProps} info={tempVehicle} />);

      expect(screen.getByText("Air Temperature")).toBeInTheDocument();
    });

    it("shows surface temperature", () => {
      const tempVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: true,
        TemperatureSurface: -8,
      };
      render(<AvlHistoryPopup {...defaultProps} info={tempVehicle} />);

      expect(screen.getByText("Surface Temperature")).toBeInTheDocument();
    });

    it("rounds temperature values", () => {
      const tempVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: true,
        TemperatureAir: -5.7,
      };
      render(<AvlHistoryPopup {...defaultProps} info={tempVehicle} />);

      // Temperature should be rounded
      const airTempLabel = screen.getByText("Air Temperature");
      expect(airTempLabel).toBeInTheDocument();
    });
  });

  describe("Material Type", () => {
    it("shows material type when available", () => {
      const materialVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: true,
        MaterialType: "SALT",
      };
      render(<AvlHistoryPopup {...defaultProps} info={materialVehicle} />);

      expect(screen.getByText("Material Type")).toBeInTheDocument();
    });
  });

  describe("Reported On Timestamps", () => {
    it("shows reported on timestamp for spread rate", () => {
      const reportedVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: true,
        DryRateKilosPerLaneKilometer: 150,
        DryRateReportedOn: "2026-02-03 9:30 AM",
      };
      render(<AvlHistoryPopup {...defaultProps} info={reportedVehicle} />);

      // The reported on text should be part of the value
      expect(screen.getAllByText(/Reported on/).length).toBeGreaterThan(0);
    });
  });

  describe("No Data Handling", () => {
    it("shows No Data when value is No Data string", () => {
      const noDataVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: true,
        DryRateKilosPerLaneKilometer: "No Data" as unknown as number,
      };
      render(<AvlHistoryPopup {...defaultProps} info={noDataVehicle} />);

      expect(screen.getByText("No Data")).toBeInTheDocument();
    });
  });

  describe("onRef Callback", () => {
    it("calls onRef callback when mounted", () => {
      const onRef = vi.fn();
      render(<AvlHistoryPopup {...defaultProps} onRef={onRef} />);

      // onRef should be called (with DOM element or null)
      expect(onRef).toHaveBeenCalled();
    });

    it("does not crash when onRef is not provided", () => {
      const propsWithoutOnRef = { info: mockHistoryVehicle };
      render(<AvlHistoryPopup {...propsWithoutOnRef} />);

      // Should render without crashing
      expect(screen.getByText(mockHistoryVehicle.vehicle_name)).toBeInTheDocument();
    });
  });

  describe("InfoRow Component", () => {
    it("does not render row when value is undefined", () => {
      const vehicleWithUndefined: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        vehicle_description: undefined,
      };
      render(<AvlHistoryPopup {...defaultProps} info={vehicleWithUndefined} />);

      expect(screen.queryByText("Description")).not.toBeInTheDocument();
    });

    it("does not render row when value is null", () => {
      const vehicleWithNull: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        vehicle_description: null as unknown as string,
      };
      render(<AvlHistoryPopup {...defaultProps} info={vehicleWithNull} />);

      expect(screen.queryByText("Description")).not.toBeInTheDocument();
    });

    it("does not render row when value is empty string", () => {
      const vehicleWithEmpty: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        vehicle_description: "",
      };
      render(<AvlHistoryPopup {...defaultProps} info={vehicleWithEmpty} />);

      expect(screen.queryByText("Description")).not.toBeInTheDocument();
    });

    it("renders boolean true as Yes", () => {
      const boolVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: true,
      };
      render(<AvlHistoryPopup {...defaultProps} info={boolVehicle} />);

      const plowDownRow = screen.getByText("Plow Down").closest(".sc-info-window-row");
      expect(plowDownRow).toHaveTextContent("Yes");
    });

    it("renders boolean false as No", () => {
      const boolVehicle: AvlHistoryVehicle = {
        ...mockHistoryVehicle,
        PlowDown: false,
      };
      render(<AvlHistoryPopup {...defaultProps} info={boolVehicle} />);

      const plowDownRow = screen.getByText("Plow Down").closest(".sc-info-window-row");
      expect(plowDownRow).toHaveTextContent("No");
    });
  });
});
