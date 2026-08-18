/**
 * App statistics tracking.
 *
 * Centralises the legacy addAppStat behaviour used by the old
 * SimcoeCountyWebViewer apps. Sends a fire-and-forget GET to the
 * internal Next.js stats endpoint.
 */

import { useAppStore } from "@/stores/appStore";
import { apiUrl } from "@/lib/axiosInstance";

/**
 * Determines whether app stats should be collected.
 * Controlled by the NEXT_PUBLIC_COLLECT_APP_STATS env variable.
 * Only "true" enables collection; anything else disables it.
 */
function isAppStatsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_COLLECT_APP_STATS === "true";
}

/**
 * Send a usage statistic to the server.
 * Gated by NEXT_PUBLIC_COLLECT_APP_STATS.
 * Errors are intentionally swallowed — stats are best-effort.
 */
export function addAppStat(type: string, description: string): void {
  try {
    if (!isAppStatsEnabled()) return;

    const config = useAppStore.getState().config;
    if (!config) return;

    // Build identifier matching old app format: {name}-{version}-{homepage}
    const { appInfo, userName } = useAppStore.getState();
    const { name, version, homepage } = appInfo;
    let buildName = "";
    if (name && version) {
      buildName = `${name}-${version}`;
    } else {
      buildName = (config.title || "WebViewer").replace(/\s+/g, "-");
    }
    if (homepage) buildName += `-${homepage}`;
    if (!buildName) buildName = "Unknown";

    // Append authenticated username when available
    const userNameParam = userName ? `?user_name=${encodeURIComponent(userName)}` : "";

    // Fire-and-forget GET request to internal NextJS API route
    const url = apiUrl(`/api/public/stats/write/${encodeURIComponent(buildName)}/${encodeURIComponent(type)}/${encodeURIComponent(description)}${userNameParam}`);
    fetch(url, { method: "GET" }).catch(() => {
      // Intentionally swallowed — stats are best-effort
    });
  } catch {
    // Intentionally swallowed
  }
}

/** Track which map id was loaded. */
export function trackMapLoad(mapId: string): void {
  addAppStat("Map", mapId);
}

/** Track a theme being opened. */
export function trackTheme(themeName: string): void {
  addAppStat("Theme", themeName);
}

/** Track a tool being opened. */
export function trackTool(toolName: string): void {
  addAppStat("Tool", toolName);
}

/** Track the My Maps tab being opened. */
export function trackMyMaps(): void {
  addAppStat("MyMaps", "My Maps");
}

/** Track a basemap being selected. */
export function trackBasemap(basemapName: string): void {
  addAppStat("Basemap", basemapName);
}

/** Track a layer being toggled on by the user. */
export function trackLayer(layerName: string, groupName?: string): void {
  const description = groupName ? `${layerName} (${groupName})` : layerName;
  addAppStat("Layer", description);
}

/** Track a group being toggled on by the user. */
export function trackGroup(groupName: string): void {
  addAppStat("Group", groupName);
}
