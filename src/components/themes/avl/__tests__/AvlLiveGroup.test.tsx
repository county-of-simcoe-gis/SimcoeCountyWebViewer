/**
 * Tests for AvlLiveGroup component - Vehicle group display with expand/collapse.
 *
 * Tests cover:
 * - Group rendering with vehicle count
 * - Visibility toggle via checkbox
 * - Expand/collapse functionality
 * - Sub-group rendering and visibility toggles
 * - Empty group handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AvlLiveGroup from "../components/AvlLiveGroup";
import { mockRoadsGroup, mockSubGroups, mockVehicles } from "./mockData";
import type { AvlGroup, AvlSubGroup } from "../types/avl.types";

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: vi.fn(({ src, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  )),
}));

// Mock react-collapsible
vi.mock("react-collapsible", () => ({
  default: vi.fn(({ trigger, children, open, onOpening, onClosing }) => (
    <div data-testid="collapsible">
      <div
        data-testid="collapsible-trigger"
        onClick={() => {
          if (open) {
            onClosing?.();
          } else {
            onOpening?.();
          }
        }}
      >
        {trigger}
      </div>
      {open && <div data-testid="collapsible-content">{children}</div>}
    </div>
  )),
}));

describe("AvlLiveGroup", () => {
  const defaultProps = {
    info: mockRoadsGroup,
    onInputChangeSubGroup: vi.fn(),
    onInputChangeGroup: vi.fn(),
    onPanelOpen: vi.fn(),
    onVechileClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Rendering", () => {
    it("renders group name", () => {
      render(<AvlLiveGroup {...defaultProps} />);

      expect(screen.getByText("Roads GeoTab")).toBeInTheDocument();
    });

    it("renders vehicle count", () => {
      const groupWithData = {
        ...mockRoadsGroup,
        data: mockVehicles,
      };

      render(<AvlLiveGroup {...defaultProps} info={groupWithData} />);

      expect(screen.getByText(`(${mockVehicles.length})`)).toBeInTheDocument();
    });

    it("renders group checkbox", () => {
      render(<AvlLiveGroup {...defaultProps} />);

      const checkbox = screen.getAllByRole("checkbox")[0];
      expect(checkbox).toBeInTheDocument();
    });

    it("renders checkbox as checked when group is visible", () => {
      const visibleGroup = { ...mockRoadsGroup, visible: true };
      render(<AvlLiveGroup {...defaultProps} info={visibleGroup} />);

      const checkbox = screen.getAllByRole("checkbox")[0];
      expect(checkbox).toBeChecked();
    });

    it("renders checkbox as unchecked when group is not visible", () => {
      const hiddenGroup = { ...mockRoadsGroup, visible: false };
      render(<AvlLiveGroup {...defaultProps} info={hiddenGroup} />);

      const checkbox = screen.getAllByRole("checkbox")[0];
      expect(checkbox).not.toBeChecked();
    });

    it("does not render when group has no data", () => {
      const emptyGroup = { ...mockRoadsGroup, data: [] };
      const { container } = render(<AvlLiveGroup {...defaultProps} info={emptyGroup} />);

      expect(container.firstChild).toBeNull();
    });

    it("does not render when group data is undefined", () => {
      const noDataGroup = { ...mockRoadsGroup, data: undefined };
      const { container } = render(<AvlLiveGroup {...defaultProps} info={noDataGroup} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Group Visibility Toggle", () => {
    it("calls onInputChangeGroup when checkbox is clicked", () => {
      const onInputChangeGroup = vi.fn();
      render(<AvlLiveGroup {...defaultProps} onInputChangeGroup={onInputChangeGroup} />);

      const checkbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(checkbox);

      expect(onInputChangeGroup).toHaveBeenCalledWith(mockRoadsGroup, expect.any(Boolean));
    });

    it("passes correct checked state when toggling visibility on", () => {
      const hiddenGroup = { ...mockRoadsGroup, visible: false };
      const onInputChangeGroup = vi.fn();
      render(<AvlLiveGroup {...defaultProps} info={hiddenGroup} onInputChangeGroup={onInputChangeGroup} />);

      const checkbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(checkbox);

      expect(onInputChangeGroup).toHaveBeenCalledWith(hiddenGroup, true);
    });

    it("passes correct checked state when toggling visibility off", () => {
      const visibleGroup = { ...mockRoadsGroup, visible: true };
      const onInputChangeGroup = vi.fn();
      render(<AvlLiveGroup {...defaultProps} info={visibleGroup} onInputChangeGroup={onInputChangeGroup} />);

      const checkbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(checkbox);

      expect(onInputChangeGroup).toHaveBeenCalledWith(visibleGroup, false);
    });
  });

  describe("Expand/Collapse", () => {
    it("renders collapsible component", () => {
      render(<AvlLiveGroup {...defaultProps} />);

      expect(screen.getByTestId("collapsible")).toBeInTheDocument();
    });

    it("shows content when group is open", () => {
      const openGroup = { ...mockRoadsGroup, open: true };
      render(<AvlLiveGroup {...defaultProps} info={openGroup} />);

      expect(screen.getByTestId("collapsible-content")).toBeInTheDocument();
    });

    it("hides content when group is closed", () => {
      const closedGroup = { ...mockRoadsGroup, open: false };
      render(<AvlLiveGroup {...defaultProps} info={closedGroup} />);

      expect(screen.queryByTestId("collapsible-content")).not.toBeInTheDocument();
    });

    it("calls onPanelOpen with true when opening", () => {
      const closedGroup = { ...mockRoadsGroup, open: false };
      const onPanelOpen = vi.fn();
      render(<AvlLiveGroup {...defaultProps} info={closedGroup} onPanelOpen={onPanelOpen} />);

      const trigger = screen.getByTestId("collapsible-trigger");
      fireEvent.click(trigger);

      expect(onPanelOpen).toHaveBeenCalledWith(closedGroup, true);
    });

    it("calls onPanelOpen with false when closing", () => {
      const openGroup = { ...mockRoadsGroup, open: true };
      const onPanelOpen = vi.fn();
      render(<AvlLiveGroup {...defaultProps} info={openGroup} onPanelOpen={onPanelOpen} />);

      const trigger = screen.getByTestId("collapsible-trigger");
      fireEvent.click(trigger);

      expect(onPanelOpen).toHaveBeenCalledWith(openGroup, false);
    });
  });

  describe("Sub-Groups", () => {
    it("renders sub-groups when group is open", () => {
      const openGroup = {
        ...mockRoadsGroup,
        open: true,
        subGroups: mockSubGroups,
      };
      render(<AvlLiveGroup {...defaultProps} info={openGroup} />);

      // Each sub-group should be rendered
      mockSubGroups.forEach((subGroup) => {
        expect(screen.getByText(subGroup.name)).toBeInTheDocument();
      });
    });

    it("renders sub-group checkboxes", () => {
      const openGroup = {
        ...mockRoadsGroup,
        open: true,
        subGroups: mockSubGroups,
      };
      render(<AvlLiveGroup {...defaultProps} info={openGroup} />);

      // Should have group checkbox + sub-group checkboxes
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(1 + mockSubGroups.length);
    });

    it("calls onInputChangeSubGroup when sub-group checkbox is clicked", () => {
      const openGroup = {
        ...mockRoadsGroup,
        open: true,
        subGroups: mockSubGroups,
      };
      const onInputChangeSubGroup = vi.fn();
      render(<AvlLiveGroup {...defaultProps} info={openGroup} onInputChangeSubGroup={onInputChangeSubGroup} />);

      // Click the first sub-group checkbox (index 1, since index 0 is the group checkbox)
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[1]);

      expect(onInputChangeSubGroup).toHaveBeenCalledWith(mockSubGroups[0], openGroup, expect.any(Boolean));
    });

    it("renders sub-group images", () => {
      const openGroup = {
        ...mockRoadsGroup,
        open: true,
        subGroups: mockSubGroups,
      };
      render(<AvlLiveGroup {...defaultProps} info={openGroup} />);

      // Each sub-group should have an image
      mockSubGroups.forEach((subGroup) => {
        const image = screen.getByAltText(subGroup.name);
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute("src", `/images/avl/${subGroup.imageName}`);
      });
    });
  });

  describe("Different Group Types", () => {
    it("handles Roads group", () => {
      const roadsGroup = { ...mockRoadsGroup, name: "Roads" };
      render(<AvlLiveGroup {...defaultProps} info={roadsGroup} />);

      expect(screen.getByText("Roads")).toBeInTheDocument();
    });

    it("handles Solid Waste group", () => {
      const solidWasteGroup = { ...mockRoadsGroup, name: "Solid Waste" };
      render(<AvlLiveGroup {...defaultProps} info={solidWasteGroup} />);

      expect(screen.getByText("Solid Waste")).toBeInTheDocument();
    });

    it("handles Waste Contractor group", () => {
      const wasteContractorGroup = { ...mockRoadsGroup, name: "Waste Contractor" };
      render(<AvlLiveGroup {...defaultProps} info={wasteContractorGroup} />);

      expect(screen.getByText("Waste Contractor")).toBeInTheDocument();
    });
  });
});
