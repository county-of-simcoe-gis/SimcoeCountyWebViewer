/**
 * UI and user interaction utilities
 */

import { useSidebarStore } from "@/stores/sidebarStore";
import { useURLModalStore } from "@/stores/urlModalStore";
import { useToastStore } from "@/hooks/useToast";
import { getSharedItem } from "@/utils/storage";
import { getBasePath, getPublicPath } from "@/utils/getPublicPath";

export { addAppStat } from "@/lib/appStats";

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
  const { openSidebar, setActiveTabByName } = useSidebarStore.getState();

  // Open sidebar and activate the tab by name (uses absolute indices)
  openSidebar();
  setActiveTabByName(tabName);
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
  console.log(`${type.toUpperCase()}: ${title}: ${message}`);
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

