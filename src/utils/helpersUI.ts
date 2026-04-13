/**
 * UI and user interaction utilities
 */

import { useSidebarStore } from "@/stores/sidebarStore";
import { useURLModalStore } from "@/stores/urlModalStore";
import { useAppStore } from "@/stores/appStore";

/**
 * All tab names in their default order
 */
const ALL_TAB_NAMES = ["layers", "tools", "mymaps", "themes", "reports"] as const;

type TabName = (typeof ALL_TAB_NAMES)[number];

/**
 * Activate a sidebar tab by name. Works even if the tab button is hidden -
 * the content will be shown while the tab button remains hidden.
 * @param tabName - The name of the tab to activate ('layers', 'tools', 'mymaps', 'themes', 'reports')
 */
export function activateTab(tabName: TabName): void {
  console.log(`activateTab called with: ${tabName}`);

  const { openSidebar, setActiveTabByName } = useSidebarStore.getState();

  // Open sidebar and activate the tab by name (uses absolute indices)
  openSidebar();
  setActiveTabByName(tabName);

  console.log(`Tab activation completed for: ${tabName}`);
}

/**
 * Alternative approach: Use window timeout to ensure state changes are processed
 * @param tabName - The name of the tab to activate
 */
export function activateTabDelayed(tabName: TabName): void {
  setTimeout(() => activateTab(tabName), 0);
}

/**
 * Show message (placeholder - can be enhanced with UI library)
 */
export function showMessage(
  title: string,
  message: string,
  type: "info" | "error" | "warning" | "success" = "info",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  timeout = 2000,
): void {
  // For now, just use console and alert
  // TODO: Replace with proper toast/notification system
  console.log(`${type.toUpperCase()}: ${title} - ${message}`);
  if (type === "error") {
    alert(`${title}: ${message}`);
  }
}

/**
 * Show URL in a full-screen iframe modal overlay.
 * Uses the global urlModalStore so it can be called from anywhere.
 */
export function showURLWindow(url: string, showFooter = false, mode = "normal", honorDontShow = false, hideScroll = false, title = "Information"): void {
  // If honorDontShow is true, check localStorage to see if the user has opted out
  if (honorDontShow) {
    try {
      const storageKey = "sc_dontshowagain";
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Support both wrapped {value: [...]} format and plain array
        const items: Array<{ url?: string }> = Array.isArray(data) ? data : (data?.value ?? []);
        const isDontShow = items.some((item) => item.url?.toLowerCase() === url.toLowerCase());
        if (isDontShow) return;
      }
    } catch (e) {
      console.error("Error checking dont-show storage:", e);
    }
  }

  useURLModalStore.getState().open(url, title, { showFooter, honorDontShow, mode, hideScroll });
}

/**
 * App statistics tracking.
 * Sends a fire-and-forget HTTP GET to the appStatsUrl endpoint.
 * Gated by the includeAppStats config flag and skipped on localhost.
 */
export function addAppStat(type: string, description: string): void {
  try {
    const config = useAppStore.getState().config;
    if (!config) return;

    // Gate: config opt-out
    if (config.includeAppStats === false) return;

    // Gate: skip on localhost
    const hostname = window?.location?.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return;

    const appStatsUrl = config.appStatsUrl;
    if (!appStatsUrl) return;

    // Build a simple build identifier
    const appName = config.title || "WebViewer";
    const buildName = appName.replace(/\s+/g, "-");

    // Fire-and-forget GET request (matches old app pattern)
    const url = `${appStatsUrl}${encodeURIComponent(buildName)}/${encodeURIComponent(type)}/${encodeURIComponent(description)}`;
    fetch(url, { method: "GET", mode: "no-cors" }).catch(() => {
      // Intentionally swallowed — stats are best-effort
    });
  } catch {
    // Intentionally swallowed
  }
}
