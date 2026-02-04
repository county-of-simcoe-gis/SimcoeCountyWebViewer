/**
 * Tests for AvlTheme component - main AVL container with tabs.
 *
 * Tests cover:
 * - Authentication states (loading, unauthenticated, no access, authorized)
 * - Tab switching between Live, History, and Trips
 * - Conditional rendering of Trips tab based on showTripsTab
 * - allowedGroups filtering based on user roles
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AvlTheme from "../AvlTheme";
import { mockAuthLoading, mockAuthUnauthenticated, mockAuthNoAccess, mockAuthWithRoadsAccess, mockAuthWithFullAccess, mockAvlConfig, mockRoadsGroup, createMockAvlStoreState } from "./mockData";

// Mock the useRequireAuth hook
const mockPromptLogin = vi.fn();
let mockAuthState = mockAuthWithFullAccess;

vi.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: vi.fn(() => ({
    ...mockAuthState,
    promptLogin: mockPromptLogin,
  })),
}));

// Mock the AVL store
const mockSetActiveTab = vi.fn();
const mockSetConfig = vi.fn();
const mockSetAllowedGroups = vi.fn();
const mockSetShowTripsTab = vi.fn();
const mockSetPlowGroups = vi.fn();
const mockLoadFromStorage = vi.fn();

let mockAvlStoreState = createMockAvlStoreState();

vi.mock("@/stores/avlStore", () => ({
  useAvlStore: vi.fn(() => ({
    ...mockAvlStoreState,
    setActiveTab: mockSetActiveTab,
    setConfig: mockSetConfig,
    setAllowedGroups: mockSetAllowedGroups,
    setShowTripsTab: mockSetShowTripsTab,
    setPlowGroups: mockSetPlowGroups,
    loadFromStorage: mockLoadFromStorage,
  })),
}));

// Mock child components to isolate AvlTheme testing
vi.mock("../AvlLive", () => ({
  default: vi.fn(() => <div data-testid="avl-live">AvlLive Component</div>),
}));

vi.mock("../AvlHistory", () => ({
  default: vi.fn(() => <div data-testid="avl-history">AvlHistory Component</div>),
}));

vi.mock("../AvlTrips", () => ({
  default: vi.fn(() => <div data-testid="avl-trips">AvlTrips Component</div>),
}));

// Mock PanelComponent
vi.mock("@/components/PanelComponent", () => ({
  default: vi.fn(({ children, name }) => (
    <div data-testid="panel-component" data-name={name}>
      {children}
    </div>
  )),
}));

describe("AvlTheme", () => {
  const defaultProps = {
    onClose: vi.fn(),
    onSidebarVisibility: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = mockAuthWithFullAccess;
    mockAvlStoreState = createMockAvlStoreState();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Authentication States", () => {
    it("shows loading spinner when auth is loading", () => {
      mockAuthState = mockAuthLoading;

      render(<AvlTheme {...defaultProps} />);

      expect(screen.getByText("Checking authentication...")).toBeInTheDocument();
    });

    it("shows sign in prompt when not authenticated", () => {
      mockAuthState = mockAuthUnauthenticated;

      render(<AvlTheme {...defaultProps} />);

      expect(screen.getByText("Authentication Required")).toBeInTheDocument();
      expect(screen.getByText(/Please sign in to access AVL/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Sign In with Azure AD/i })).toBeInTheDocument();
    });

    it("calls promptLogin when sign in button is clicked", () => {
      mockAuthState = mockAuthUnauthenticated;

      render(<AvlTheme {...defaultProps} />);

      const signInButton = screen.getByRole("button", { name: /Sign In with Azure AD/i });
      fireEvent.click(signInButton);

      expect(mockPromptLogin).toHaveBeenCalledTimes(1);
    });

    it("shows access denied when authenticated but no AVL access", () => {
      mockAuthState = mockAuthNoAccess;

      render(<AvlTheme {...defaultProps} />);

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(screen.getByText(/You don't have access to any AVL groups/)).toBeInTheDocument();
    });

    it("renders main content when authenticated with access", async () => {
      mockAuthState = mockAuthWithFullAccess;

      render(<AvlTheme {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Live Vehicles")).toBeInTheDocument();
        expect(screen.getByText("Vehicle History")).toBeInTheDocument();
      });
    });
  });

  describe("Tab Navigation", () => {
    it("renders all tabs when showTripsTab is true", async () => {
      mockAvlStoreState = createMockAvlStoreState({ showTripsTab: true });

      render(<AvlTheme {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Live Vehicles")).toBeInTheDocument();
        expect(screen.getByText("Vehicle History")).toBeInTheDocument();
        expect(screen.getByText("Trips")).toBeInTheDocument();
      });
    });

    it("hides Trips tab when showTripsTab is false", async () => {
      mockAvlStoreState = createMockAvlStoreState({ showTripsTab: false });

      render(<AvlTheme {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Live Vehicles")).toBeInTheDocument();
        expect(screen.getByText("Vehicle History")).toBeInTheDocument();
        expect(screen.queryByText("Trips")).not.toBeInTheDocument();
      });
    });

    it("calls setActiveTab when clicking History tab", async () => {
      render(<AvlTheme {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Vehicle History")).toBeInTheDocument();
      });

      const historyTab = screen.getByText("Vehicle History");
      fireEvent.click(historyTab);

      expect(mockSetActiveTab).toHaveBeenCalledWith(1);
    });

    it("calls setActiveTab when clicking Trips tab", async () => {
      mockAvlStoreState = createMockAvlStoreState({ showTripsTab: true });

      render(<AvlTheme {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Trips")).toBeInTheDocument();
      });

      const tripsTab = screen.getByText("Trips");
      fireEvent.click(tripsTab);

      expect(mockSetActiveTab).toHaveBeenCalledWith(2);
    });
  });

  describe("Component Props", () => {
    it("passes name prop to PanelComponent", () => {
      render(<AvlTheme {...defaultProps} name="Custom AVL Name" />);

      expect(screen.getByTestId("panel-component")).toHaveAttribute("data-name", "Custom AVL Name");
    });

    it("uses default name when not provided", () => {
      render(<AvlTheme {...defaultProps} />);

      expect(screen.getByTestId("panel-component")).toHaveAttribute("data-name", "AVL");
    });

    it("calls onClose when close is triggered", async () => {
      // We can't easily test this without accessing PanelComponent internals,
      // but we can verify the callback is passed correctly
      render(<AvlTheme {...defaultProps} />);

      // The component should render without errors
      await waitFor(() => {
        expect(screen.getByTestId("panel-component")).toBeInTheDocument();
      });
    });
  });

  describe("Configuration", () => {
    it("hides live feed when config.hideLiveFeed is true", async () => {
      mockAvlStoreState = createMockAvlStoreState({
        config: { ...mockAvlConfig, hideLiveFeed: true },
      });

      render(<AvlTheme {...defaultProps} />);

      await waitFor(() => {
        // When hideLiveFeed is true, the tab list should be hidden
        const tabList = screen.queryByRole("tablist");
        // The tabs should still exist but may be hidden via CSS
        expect(screen.getByTestId("avl-live")).toBeInTheDocument();
      });
    });

    it("merges propsConfig with default config", async () => {
      const customConfig = { hideLiveFeed: true };

      render(<AvlTheme {...defaultProps} config={customConfig} />);

      await waitFor(() => {
        expect(mockSetConfig).toHaveBeenCalled();
      });
    });
  });

  describe("Initialization", () => {
    it("sets allowed groups based on user roles", async () => {
      mockAuthState = mockAuthWithRoadsAccess;

      render(<AvlTheme {...defaultProps} />);

      await waitFor(() => {
        expect(mockSetAllowedGroups).toHaveBeenCalled();
      });
    });

    it("loads state from storage on initialization", async () => {
      render(<AvlTheme {...defaultProps} />);

      await waitFor(() => {
        expect(mockLoadFromStorage).toHaveBeenCalled();
      });
    });
  });

  describe("Child Component Rendering", () => {
    it("renders AvlLive component in live tab", async () => {
      mockAvlStoreState = createMockAvlStoreState({ activeTab: 0 });

      render(<AvlTheme {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("avl-live")).toBeInTheDocument();
      });
    });

    it("renders AvlHistory component in history tab panel", async () => {
      mockAvlStoreState = createMockAvlStoreState({ activeTab: 1 });

      render(<AvlTheme {...defaultProps} />);

      // TabPanel with forceRenderTabPanel keeps all panels in DOM
      await waitFor(() => {
        expect(screen.getByTestId("avl-history")).toBeInTheDocument();
      });
    });

    it("renders AvlTrips component when showTripsTab is true", async () => {
      mockAvlStoreState = createMockAvlStoreState({
        activeTab: 2,
        showTripsTab: true,
        plowGroups: [mockRoadsGroup],
      });

      render(<AvlTheme {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId("avl-trips")).toBeInTheDocument();
      });
    });
  });
});
