/**
 * Tests for AvlLiveVehicle component - Individual vehicle card display.
 *
 * Tests cover:
 * - Vehicle information rendering (name, speed, date)
 * - Click handler invocation
 * - Plow icon determination based on status
 * - Null/undefined handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AvlLiveVehicle from "../components/AvlLiveVehicle";
import { mockVehicle } from "./mockData";
import type { AvlVehicle } from "../types/avl.types";

describe("AvlLiveVehicle", () => {
  const defaultProps = {
    info: mockVehicle,
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
      render(<AvlLiveVehicle {...defaultProps} />);

      expect(screen.getByText(/ROADS-101/)).toBeInTheDocument();
    });

    it("renders vehicle group", () => {
      render(<AvlLiveVehicle {...defaultProps} />);

      expect(screen.getByText(/Roads GeoTab/)).toBeInTheDocument();
    });

    it("renders vehicle speed", () => {
      render(<AvlLiveVehicle {...defaultProps} />);

      expect(screen.getByText(/Speed: 45 Kph/)).toBeInTheDocument();
    });

    it("renders friendly date", () => {
      render(<AvlLiveVehicle {...defaultProps} />);

      expect(screen.getByText(mockVehicle.dateFriendly)).toBeInTheDocument();
    });

    it("renders last reported time", () => {
      render(<AvlLiveVehicle {...defaultProps} />);

      expect(screen.getByText(mockVehicle.lastReported!)).toBeInTheDocument();
    });

    it("applies correct CSS class for last reported status", () => {
      const greenVehicle = { ...mockVehicle, cssClass: "green" };
      render(<AvlLiveVehicle {...defaultProps} info={greenVehicle} />);

      const lastReportedLabel = screen.getByText(mockVehicle.lastReported!);
      expect(lastReportedLabel).toHaveClass("green");
    });

    it("renders vehicle image", () => {
      render(<AvlLiveVehicle {...defaultProps} />);

      const image = screen.getByRole("img");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("alt", mockVehicle.vehicle_name);
    });
  });

  describe("Click Handler", () => {
    it("calls onVechileClick when vehicle is clicked", () => {
      const onVechileClick = vi.fn();
      render(<AvlLiveVehicle {...defaultProps} onVechileClick={onVechileClick} />);

      const vehicleContainer = screen.getByTitle(`Click to zoom to ${mockVehicle.vehicle_name}`);
      fireEvent.click(vehicleContainer);

      expect(onVechileClick).toHaveBeenCalledTimes(1);
    });

    it("passes vehicle info to click handler", () => {
      const onVechileClick = vi.fn();
      render(<AvlLiveVehicle {...defaultProps} onVechileClick={onVechileClick} />);

      const vehicleContainer = screen.getByTitle(`Click to zoom to ${mockVehicle.vehicle_name}`);
      fireEvent.click(vehicleContainer);

      expect(onVechileClick).toHaveBeenCalledWith(mockVehicle);
    });
  });

  describe("Plow Icon Logic", () => {
    it("shows red plow icon when plow/wing active AND spreader active", () => {
      const plowSpreaderVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Plow",
        hasGeoTabSpreaderData: true,
        isPlowActive: true,
        isSpreaderActive: true,
        isWingActive: false,
      };
      render(<AvlLiveVehicle {...defaultProps} info={plowSpreaderVehicle} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("src", "/images/avl/plow_red.png");
    });

    it("shows green plow icon when plow active but spreader not active", () => {
      const plowOnlyVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Plow",
        hasGeoTabSpreaderData: true,
        isPlowActive: true,
        isSpreaderActive: false,
        isWingActive: false,
      };
      render(<AvlLiveVehicle {...defaultProps} info={plowOnlyVehicle} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("src", "/images/avl/plow_green.png");
    });

    it("shows green plow icon when wing active but spreader not active", () => {
      const wingOnlyVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Plow",
        hasGeoTabSpreaderData: true,
        isPlowActive: false,
        isSpreaderActive: false,
        isWingActive: true,
      };
      render(<AvlLiveVehicle {...defaultProps} info={wingOnlyVehicle} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("src", "/images/avl/plow_green.png");
    });

    it("shows orange plow icon when only spreader is active", () => {
      const spreaderOnlyVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Plow",
        hasGeoTabSpreaderData: true,
        isPlowActive: false,
        isSpreaderActive: true,
        isWingActive: false,
      };
      render(<AvlLiveVehicle {...defaultProps} info={spreaderOnlyVehicle} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("src", "/images/avl/plow_orange.png");
    });

    it("shows default plow icon when no activities are active", () => {
      const inactivePlowVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Plow",
        hasGeoTabSpreaderData: true,
        isPlowActive: false,
        isSpreaderActive: false,
        isWingActive: false,
      };
      render(<AvlLiveVehicle {...defaultProps} info={inactivePlowVehicle} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("src", "/images/avl/plow.png");
    });

    it("uses imageName from config when not a plow with spreader data", () => {
      const patrolVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Patrol",
        hasGeoTabSpreaderData: false,
        imageName: "patrol.png",
      };
      render(<AvlLiveVehicle {...defaultProps} info={patrolVehicle} />);

      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("src", "/images/avl/patrol.png");
    });
  });

  describe("Speed Rounding", () => {
    it("rounds speed to nearest integer", () => {
      const decimalSpeedVehicle: AvlVehicle = {
        ...mockVehicle,
        velocity: 45.7,
      };
      render(<AvlLiveVehicle {...defaultProps} info={decimalSpeedVehicle} />);

      expect(screen.getByText(/Speed: 46 Kph/)).toBeInTheDocument();
    });

    it("handles zero speed", () => {
      const stationaryVehicle: AvlVehicle = {
        ...mockVehicle,
        velocity: 0,
      };
      render(<AvlLiveVehicle {...defaultProps} info={stationaryVehicle} />);

      expect(screen.getByText(/Speed: 0 Kph/)).toBeInTheDocument();
    });

    it("handles undefined velocity", () => {
      const noVelocityVehicle: AvlVehicle = {
        ...mockVehicle,
        velocity: undefined as unknown as number,
      };
      render(<AvlLiveVehicle {...defaultProps} info={noVelocityVehicle} />);

      expect(screen.getByText(/Speed: 0 Kph/)).toBeInTheDocument();
    });
  });

  describe("Null/Undefined Handling", () => {
    it("returns null when vehicle_name is undefined", () => {
      const noNameVehicle: AvlVehicle = {
        ...mockVehicle,
        vehicle_name: undefined as unknown as string,
      };
      const { container } = render(<AvlLiveVehicle {...defaultProps} info={noNameVehicle} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("CSS Classes", () => {
    it("applies red class for old last reported time", () => {
      const oldVehicle: AvlVehicle = {
        ...mockVehicle,
        cssClass: "red",
        lastReported: "Last Reported: 2 hr",
      };
      render(<AvlLiveVehicle {...defaultProps} info={oldVehicle} />);

      const lastReportedLabel = screen.getByText("Last Reported: 2 hr");
      expect(lastReportedLabel).toHaveClass("red");
    });

    it("applies green class for recent last reported time", () => {
      const recentVehicle: AvlVehicle = {
        ...mockVehicle,
        cssClass: "green",
        lastReported: "Last Reported: 5 min",
      };
      render(<AvlLiveVehicle {...defaultProps} info={recentVehicle} />);

      const lastReportedLabel = screen.getByText("Last Reported: 5 min");
      expect(lastReportedLabel).toHaveClass("green");
    });
  });
});
