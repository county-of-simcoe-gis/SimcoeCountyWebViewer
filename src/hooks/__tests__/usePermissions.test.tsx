import React, { useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import { vi } from "vitest";

// Mock the app store before importing the hook
const mockSetPermissionState = vi.fn();

vi.mock("@/stores/appStore", () => ({
  useAppStore: vi.fn((selector?: any) => (typeof selector === "function" ? selector({ setPermissionState: mockSetPermissionState }) : { setPermissionState: mockSetPermissionState })),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    warning: vi.fn(),
  }),
}));

import usePermissions from "@/hooks/usePermissions";

describe("usePermissions hook", () => {
  it("calls setPermissionState with 'unknown' when Permissions API is unavailable", async () => {
    // Ensure navigator.permissions is undefined for this test
    const originalPermissions = (global as any).navigator?.permissions;
    if ((global as any).navigator) (global as any).navigator.permissions = undefined;

    const TestComponent = () => {
      const { checkAllPermissions } = usePermissions();
      useEffect(() => {
        checkAllPermissions();
      }, [checkAllPermissions]);
      return null;
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(mockSetPermissionState).toHaveBeenCalled();
    });

    expect(mockSetPermissionState).toHaveBeenCalledWith("geolocation", "unknown");
    expect(mockSetPermissionState).toHaveBeenCalledWith("clipboard", "unknown");
    expect(mockSetPermissionState).toHaveBeenCalledWith("local-network", "unknown");

    // restore original permissions if present
    if ((global as any).navigator) (global as any).navigator.permissions = originalPermissions;
  });
});
