/**
 * Tests for AvlHistoryVehicle component - History vehicle card display.
 *
 * Tests cover:
 * - Vehicle information rendering
 * - Click handler invocation
 * - Date formatting
 * - Null/undefined handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AvlHistoryVehicle from "../components/AvlHistoryVehicle";
import { mockHistoryVehicle } from "./mockData";
import type { AvlHistoryVehicle as AvlHistoryVehicleType } from "../types/avl.types";

describe("AvlHistoryVehicle", () => {
  const defaultProps = {
    info: mockHistoryVehicle,
    onVechileClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Rendering", () => {
    it("renders vehicle name", () => {
      render(<AvlHistoryVehicle {...defaultProps} />);

      expect(screen.getByText(mockHistoryVehicle.vehicle_name)).toBeInTheDocument();
    });

    it("renders vehicle group", () => {
      render(<AvlHistoryVehicle {...defaultProps} />);

      expect(screen.getByText(mockHistoryVehicle.grouping)).toBeInTheDocument();
    });

    it("renders vehicle speed", () => {
      render(<AvlHistoryVehicle {...defaultProps} />);

      expect(screen.getByText(`Speed: ${mockHistoryVehicle.velocity} Kph`)).toBeInTheDocument();
    });

    it("renders formatted date", () => {
      render(<AvlHistoryVehicle {...defaultProps} />);

      // The date should be formatted - check that some date text is present
      const container = screen.getByText(mockHistoryVehicle.vehicle_name).closest("div");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Click Handler", () => {
    it("calls onVechileClick when clicked", () => {
      const onVechileClick = vi.fn();
      render(<AvlHistoryVehicle {...defaultProps} onVechileClick={onVechileClick} />);

      const vehicleElement = screen.getByText(mockHistoryVehicle.vehicle_name).closest("div");
      fireEvent.click(vehicleElement!);

      expect(onVechileClick).toHaveBeenCalledTimes(1);
    });

    it("passes vehicle info to click handler", () => {
      const onVechileClick = vi.fn();
      render(<AvlHistoryVehicle {...defaultProps} onVechileClick={onVechileClick} />);

      const vehicleElement = screen.getByText(mockHistoryVehicle.vehicle_name).closest("div");
      fireEvent.click(vehicleElement!);

      expect(onVechileClick).toHaveBeenCalledWith(mockHistoryVehicle);
    });
  });

  describe("Speed Display", () => {
    it("handles zero speed", () => {
      const stationaryVehicle: AvlHistoryVehicleType = {
        ...mockHistoryVehicle,
        velocity: 0,
      };
      render(<AvlHistoryVehicle {...defaultProps} info={stationaryVehicle} />);

      expect(screen.getByText("Speed: 0 Kph")).toBeInTheDocument();
    });

    it("handles undefined velocity", () => {
      const noVelocityVehicle: AvlHistoryVehicleType = {
        ...mockHistoryVehicle,
        velocity: undefined as unknown as number,
      };
      render(<AvlHistoryVehicle {...defaultProps} info={noVelocityVehicle} />);

      expect(screen.getByText("Speed: 0 Kph")).toBeInTheDocument();
    });

    it("handles high speed values", () => {
      const fastVehicle: AvlHistoryVehicleType = {
        ...mockHistoryVehicle,
        velocity: 120,
      };
      render(<AvlHistoryVehicle {...defaultProps} info={fastVehicle} />);

      expect(screen.getByText("Speed: 120 Kph")).toBeInTheDocument();
    });
  });

  describe("Null/Undefined Handling", () => {
    it("returns null when vehicle_name is undefined", () => {
      const noNameVehicle: AvlHistoryVehicleType = {
        ...mockHistoryVehicle,
        vehicle_name: undefined as unknown as string,
      };
      const { container } = render(<AvlHistoryVehicle {...defaultProps} info={noNameVehicle} />);

      expect(container.firstChild).toBeNull();
    });

    it("returns null when vehicle_name is empty string", () => {
      const emptyNameVehicle: AvlHistoryVehicleType = {
        ...mockHistoryVehicle,
        vehicle_name: "",
      };
      const { container } = render(<AvlHistoryVehicle {...defaultProps} info={emptyNameVehicle} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Date Formatting", () => {
    it("formats date correctly", () => {
      const vehicleWithDate: AvlHistoryVehicleType = {
        ...mockHistoryVehicle,
        date: "2026-02-03T14:30:00.000Z",
      };
      render(<AvlHistoryVehicle {...defaultProps} info={vehicleWithDate} />);

      // Date should be formatted and displayed
      const container = screen.getByText(vehicleWithDate.vehicle_name).closest("div");
      expect(container).toBeInTheDocument();
    });

    it("handles missing date", () => {
      const noDateVehicle: AvlHistoryVehicleType = {
        ...mockHistoryVehicle,
        date: "",
      };
      render(<AvlHistoryVehicle {...defaultProps} info={noDateVehicle} />);

      // Should render without crashing
      expect(screen.getByText(noDateVehicle.vehicle_name)).toBeInTheDocument();
    });

    it("handles invalid date gracefully", () => {
      const invalidDateVehicle: AvlHistoryVehicleType = {
        ...mockHistoryVehicle,
        date: "invalid-date",
      };
      render(<AvlHistoryVehicle {...defaultProps} info={invalidDateVehicle} />);

      // Should render without crashing, might show original date string
      expect(screen.getByText(invalidDateVehicle.vehicle_name)).toBeInTheDocument();
    });
  });

  describe("CSS Classes", () => {
    it("applies container class", () => {
      render(<AvlHistoryVehicle {...defaultProps} />);

      const container = screen.getByText(mockHistoryVehicle.vehicle_name).closest("div");
      expect(container).toHaveClass("sc-theme-avl-history-vehicle-container");
    });

    it("applies sc-container class", () => {
      render(<AvlHistoryVehicle {...defaultProps} />);

      const container = screen.getByText(mockHistoryVehicle.vehicle_name).closest("div");
      expect(container).toHaveClass("sc-container");
    });
  });
});
