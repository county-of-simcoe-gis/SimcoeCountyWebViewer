"use client";

import { useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import { useToast } from "@/hooks/useToast";

type PermissionState = "granted" | "prompt" | "denied" | "unknown";

async function getLocalNetworkPermissionState(): Promise<PermissionState | "unsupported"> {
  if (!navigator.permissions) return "unsupported";

  const permissionNames = [
    // Chrome/Edge variants
    "local-network",
    // Experimental or vendor-specific attempts
    "loopback-network",
    "local-network-access",
  ];

  for (const name of permissionNames) {
    try {
      // TS: PermissionName is narrow; cast to any for experimental names
      const result = await (navigator.permissions as any).query({ name: name as any });
      return result.state as PermissionState;
    } catch {
      // Permission name not supported by this browser/version.
    }
  }

  return "unsupported";
}

export function usePermissions() {
  const setPermissionState = useAppStore((s) => s.setPermissionState);
  const toast = useToast();

  const checkGeolocation = useCallback(async () => {
    if (!navigator.permissions?.query) {
      setPermissionState("geolocation", "unknown");
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      const state = result.state as PermissionState;
      setPermissionState("geolocation", state);

      // Listen for changes
      try {
        result.addEventListener("change", () => setPermissionState("geolocation", result.state as PermissionState));
      } catch {
        // Some browsers expose onchange instead
        // @ts-ignore
        if (typeof result.onchange === "function") result.onchange = () => setPermissionState("geolocation", result.state as PermissionState);
      }

      // Intentionally do not notify the user on startup when geolocation is denied.
      // The UI control (CurrentLocation) will reflect the disabled state and provide the tooltip.
    } catch {
      setPermissionState("geolocation", "unknown");
    }
  }, [setPermissionState, toast]);

  const checkClipboard = useCallback(async () => {
    // Try both clipboard-read and -write where supported
    if (!navigator.permissions?.query) {
      setPermissionState("clipboard", "unknown");
      return;
    }

    try {
      const readPerm = await (navigator.permissions as any).query({ name: "clipboard-read" } as any);
      const writePerm = await (navigator.permissions as any).query({ name: "clipboard-write" } as any);

      const state =
        readPerm.state === "granted" || writePerm.state === "granted"
          ? "granted"
          : readPerm.state === "prompt" || writePerm.state === "prompt"
            ? "prompt"
            : readPerm.state === "denied" || writePerm.state === "denied"
              ? "denied"
              : "unknown";

      setPermissionState("clipboard", state as PermissionState);

      if (state === "denied") {
        toast.warning("Clipboard access is denied. Copy/share features may not work.");
      }
    } catch {
      setPermissionState("clipboard", "unknown");
    }
  }, [setPermissionState, toast]);

  const checkLocalNetwork = useCallback(async () => {
    try {
      const stateOrUnsupported = await getLocalNetworkPermissionState();
      const mapped: PermissionState = stateOrUnsupported === "unsupported" ? "unknown" : stateOrUnsupported;
      setPermissionState("local-network", mapped);

      if (mapped === "denied") {
        toast.warning("Local network access is denied. Some local services or layers may not load properly.");
      }
    } catch {
      setPermissionState("local-network", "unknown");
    }
  }, [setPermissionState, toast]);

  const checkAllPermissions = useCallback(async () => {
    await Promise.all([checkGeolocation(), checkClipboard(), checkLocalNetwork()]);
  }, [checkGeolocation, checkClipboard, checkLocalNetwork]);

  return { checkAllPermissions, checkGeolocation, checkClipboard, checkLocalNetwork, getLocalNetworkPermissionState };
}

export default usePermissions;
