/**
 * Tests for AvlLivePopup component - Live vehicle popup content.
 *
 * Tests cover:
 * - Vehicle information display
 * - Follow button functionality
 * - History button functionality
 * - Close button functionality
 * - GeoTab spreader data display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AvlLivePopup from "../components/AvlLivePopup";
import { mockVehicle } from "./mockData";
import type { AvlVehicle } from "../types/avl.types";

describe("AvlLivePopup", () => {
  const defaultProps = {
    info: mockVehicle,
    followingVehicleName: "",
    onFollowClick: vi.fn(),
    onHistoryClick: vi.fn(),
    showFollowButton: true,
    showHistoryButton: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Rendering", () => {
    it("renders vehicle name", () => {
      render(<AvlLivePopup {...defaultProps} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText(mockVehicle.vehicle_name)).toBeInTheDocument();
    });

    it("renders vehicle group", () => {
      render(<AvlLivePopup {...defaultProps} />);

      expect(screen.getByText("Group")).toBeInTheDocument();
      expect(screen.getByText(mockVehicle.subgrouping)).toBeInTheDocument();
    });

    it("renders vehicle speed", () => {
      render(<AvlLivePopup {...defaultProps} />);

      expect(screen.getByText("Speed")).toBeInTheDocument();
      expect(screen.getByText(String(mockVehicle.velocity))).toBeInTheDocument();
    });

    it("renders vehicle date", () => {
      render(<AvlLivePopup {...defaultProps} />);

      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText(mockVehicle.dateFriendly)).toBeInTheDocument();
    });

    it("renders last reported time", () => {
      render(<AvlLivePopup {...defaultProps} />);

      expect(screen.getByText(mockVehicle.lastReported!)).toBeInTheDocument();
    });
  });

  describe("Follow Button", () => {
    it("renders follow button when showFollowButton is true", () => {
      render(<AvlLivePopup {...defaultProps} showFollowButton={true} />);

      expect(screen.getByRole("button", { name: /follow/i })).toBeInTheDocument();
    });

    it("does not render follow button when showFollowButton is false", () => {
      render(<AvlLivePopup {...defaultProps} showFollowButton={false} />);

      expect(screen.queryByRole("button", { name: /^follow$/i })).not.toBeInTheDocument();
    });

    it("shows 'Follow' text when not following", () => {
      render(<AvlLivePopup {...defaultProps} followingVehicleName="" />);

      expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
    });

    it("shows 'Stop Following' text when currently following this vehicle", () => {
      render(<AvlLivePopup {...defaultProps} followingVehicleName={mockVehicle.vehicle_name} />);

      expect(screen.getByRole("button", { name: "Stop Following" })).toBeInTheDocument();
    });

    it("calls onFollowClick with vehicle info when Follow is clicked", () => {
      const onFollowClick = vi.fn();
      render(<AvlLivePopup {...defaultProps} onFollowClick={onFollowClick} followingVehicleName="" />);

      const followButton = screen.getByRole("button", { name: "Follow" });
      fireEvent.click(followButton);

      expect(onFollowClick).toHaveBeenCalledWith(mockVehicle);
    });

    it("calls onFollowClick with null when Stop Following is clicked", () => {
      const onFollowClick = vi.fn();
      render(<AvlLivePopup {...defaultProps} onFollowClick={onFollowClick} followingVehicleName={mockVehicle.vehicle_name} />);

      const stopButton = screen.getByRole("button", { name: "Stop Following" });
      fireEvent.click(stopButton);

      expect(onFollowClick).toHaveBeenCalledWith(null);
    });
  });

  describe("History Button", () => {
    it("renders history button when showHistoryButton is true", () => {
      render(<AvlLivePopup {...defaultProps} showHistoryButton={true} />);

      expect(screen.getByRole("button", { name: /history/i })).toBeInTheDocument();
    });

    it("does not render history button when showHistoryButton is false", () => {
      render(<AvlLivePopup {...defaultProps} showHistoryButton={false} />);

      expect(screen.queryByRole("button", { name: /history/i })).not.toBeInTheDocument();
    });

    it("calls onHistoryClick when history button is clicked", () => {
      const onHistoryClick = vi.fn();
      render(<AvlLivePopup {...defaultProps} onHistoryClick={onHistoryClick} />);

      const historyButton = screen.getByRole("button", { name: /history/i });
      fireEvent.click(historyButton);

      expect(onHistoryClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Close Button", () => {
    it("renders close button", () => {
      render(<AvlLivePopup {...defaultProps} />);

      expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", () => {
      const onClose = vi.fn();
      render(<AvlLivePopup {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("GeoTab Spreader Data", () => {
    it("shows plow active status for plow vehicles with spreader data", () => {
      const plowVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Plow",
        hasGeoTabSpreaderData: true,
        isPlowActive: true,
        isSpreaderActive: false,
        isWingActive: false,
      };
      render(<AvlLivePopup {...defaultProps} info={plowVehicle} />);

      expect(screen.getByText("Plow Active")).toBeInTheDocument();
      expect(screen.getByText("Yes")).toBeInTheDocument();
    });

    it("shows spreader active status", () => {
      const spreaderVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Plow",
        hasGeoTabSpreaderData: true,
        isPlowActive: true,
        isSpreaderActive: true,
        isWingActive: false,
      };
      render(<AvlLivePopup {...defaultProps} info={spreaderVehicle} />);

      expect(screen.getByText("Spreader Active")).toBeInTheDocument();
    });

    it("shows wing active status", () => {
      const wingVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Plow",
        hasGeoTabSpreaderData: true,
        isPlowActive: false,
        isSpreaderActive: false,
        isWingActive: true,
      };
      render(<AvlLivePopup {...defaultProps} info={wingVehicle} />);

      expect(screen.getByText("Wing Active")).toBeInTheDocument();
    });

    it("shows spreader rate when available", () => {
      const spreaderRateVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Plow",
        hasGeoTabSpreaderData: true,
        isPlowActive: true,
        isSpreaderActive: true,
        isWingActive: false,
        SpreaderRate: 150,
      };
      render(<AvlLivePopup {...defaultProps} info={spreaderRateVehicle} />);

      expect(screen.getByText("Spreader Rate")).toBeInTheDocument();
    });

    it("shows material type when available", () => {
      const materialVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Plow",
        hasGeoTabSpreaderData: true,
        isPlowActive: true,
        isSpreaderActive: true,
        isWingActive: false,
        MaterialType: "SALT",
      };
      render(<AvlLivePopup {...defaultProps} info={materialVehicle} />);

      expect(screen.getByText("Material Type")).toBeInTheDocument();
    });

    it("shows temperature data when available", () => {
      const tempVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Plow",
        hasGeoTabSpreaderData: true,
        isPlowActive: true,
        isSpreaderActive: false,
        isWingActive: false,
        AirTemperature: -5,
        SurfaceTemperature: -8,
      };
      render(<AvlLivePopup {...defaultProps} info={tempVehicle} />);

      expect(screen.getByText("Air Temp")).toBeInTheDocument();
      expect(screen.getByText("Surface Temp")).toBeInTheDocument();
    });

    it("does not show spreader data for non-plow vehicles", () => {
      const patrolVehicle: AvlVehicle = {
        ...mockVehicle,
        subgrouping: "Patrol",
        hasGeoTabSpreaderData: false,
      };
      render(<AvlLivePopup {...defaultProps} info={patrolVehicle} />);

      expect(screen.queryByText("Plow Active")).not.toBeInTheDocument();
      expect(screen.queryByText("Spreader Active")).not.toBeInTheDocument();
    });
  });

  describe("Last Reported Styling", () => {
    it("applies green class for recent reports", () => {
      const recentVehicle: AvlVehicle = {
        ...mockVehicle,
        date: new Date().toISOString(),
        lastReported: "Last Reported: 1 sec",
      };
      render(<AvlLivePopup {...defaultProps} info={recentVehicle} />);

      const lastReported = screen.getByText("Last Reported: 1 sec");
      expect(lastReported).toHaveClass("green");
    });

    it("applies red class for old reports", () => {
      const oldVehicle: AvlVehicle = {
        ...mockVehicle,
        date: new Date(Date.now() - 100000000).toISOString(),
        lastReported: "Last Reported: 1 day",
      };
      render(<AvlLivePopup {...defaultProps} info={oldVehicle} />);

      const lastReported = screen.getByText("Last Reported: 1 day");
      expect(lastReported).toHaveClass("red");
    });
  });

  describe("onRef Callback", () => {
    it("calls onRef with container element when mounted", () => {
      const onRef = vi.fn();
      render(<AvlLivePopup {...defaultProps} onRef={onRef} />);

      // onRef should be called with the container element
      expect(onRef).toHaveBeenCalled();
    });
  });
});
