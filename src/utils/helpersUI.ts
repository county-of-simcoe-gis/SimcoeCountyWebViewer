/**
 * UI and user interaction utilities
 */

import { useSidebarStore } from "@/stores/sidebarStore";
import { useURLModalStore } from "@/stores/urlModalStore";
import { useAppStore } from "@/stores/appStore";
import { useToastStore } from "@/hooks/useToast";
import { getSharedItem } from "@/utils/storage";
import { apiUrl } from "@/lib/axiosInstance";
import { getBasePath, getPublicPath } from "@/utils/getPublicPath";

/**
 * All tab names in their default order
 */
type TabName = "layers" | "tools" | "mymaps" | "themes" | "reports";

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
 * Alternative approach: Defer to a microtask so the caller's current
 * synchronous state update batch flushes first before we activate the tab.
 * @param tabName - The name of the tab to activate
 */
export function activateTabDelayed(tabName: TabName): void {
  queueMicrotask(() => activateTab(tabName));
}

/**
 * Show message (placeholder - can be enhanced with UI library)
 */
export function showMessage(title: string, message: string, type: "info" | "error" | "warning" | "success" = "info", timeout = 2000): void {
  console.log(`${type.toUpperCase()}: ${title} - ${message}`);
  useToastStore.getState().addToast(`${title}: ${message}`, type, timeout);
}

/**
 * Show URL in a full-screen iframe modal overlay.
 * Uses the global urlModalStore so it can be called from anywhere.
 */
export function showURLWindow(url: string, showFooter = false, mode = "normal", honorDontShow = false, hideScroll = false, title = "Information"): void {
  const resolvedUrl = (() => {
    if (/^https?:\/\//i.test(url) || url.startsWith("//")) return url;

    const basePath = getBasePath();
    if (basePath && (url === basePath || url.startsWith(`${basePath}/`))) return url;

    return getPublicPath(url);
  })();

  // If honorDontShow is true, check localStorage to see if the user has opted out
  if (honorDontShow) {
    try {
      const items = getSharedItem<Array<{ url?: string }>>("sc_dontshowagain") ?? [];
      if (items.some((item) => item.url?.toLowerCase() === resolvedUrl.toLowerCase())) return;
    } catch (e) {
      console.error("Error checking dont-show storage:", e);
    }
  }

  useURLModalStore.getState().open(resolvedUrl, title, { showFooter, honorDontShow, mode, hideScroll });
}

/**
 * Open the README help experience in the URL modal.
 * Supports an optional section hash such as "drawing-annotation".
 */
export function showHelpWindow(sectionId?: string): void {
  const sectionHash = sectionId ? `#${sectionId}` : "";
  showURLWindow(`${getPublicPath("/help")}${sectionHash}`, false, "normal", false, false, "Help");
}

/**
 * App statistics tracking.
 * Sends a fire-and-forget HTTP GET to the internal stats API route.
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

    // Build identifier matching old app format: {name}-{version}-{homepage}
    const { name, version, homepage } = useAppStore.getState().appInfo;
    let buildName = "";
    if (name && version) {
      buildName = `${name}-${version}`;
    } else {
      buildName = (config.title || "WebViewer").replace(/\s+/g, "-");
    }
    if (homepage) buildName += `-${homepage}`;
    if (!buildName) buildName = "Unknown";

    // Fire-and-forget GET request to internal NextJS API route
    const url = apiUrl(`/api/public/stats/write/${encodeURIComponent(buildName)}/${encodeURIComponent(type)}/${encodeURIComponent(description)}`);
    fetch(url, { method: "GET" }).catch(() => {
      // Intentionally swallowed — stats are best-effort
    });
  } catch {
    // Intentionally swallowed
  }
}
