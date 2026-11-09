/**
 * Helpers for the legacy standalone pages (/legend, /layerInfo, /featurereports).
 */

/** Case-insensitive query parameter lookup. Returns null when the parameter is absent. */
export function getLegacyParam(search: string, name: string): string | null {
  const wanted = name.toLowerCase();
  for (const [key, value] of new URLSearchParams(search).entries()) {
    if (key.toLowerCase() === wanted) return value;
  }
  return null;
}

// Legacy legend URLs used the group names of the old Config_Public_Default layer group.
const LEGEND_GROUP_ALIASES: Record<string, string> = {
  all_layers: "all_layers_public",
};

function normalizeGroupName(name: string): string {
  const withoutWorkspace = name.includes(":") ? name.split(":").slice(1).join(":") : name;
  return withoutWorkspace.trim().toLowerCase().replace(/\s+/g, "_");
}

interface NamedGroup {
  value: string;
  label: string;
}

/**
 * Selects legend groups from legacy parameters such as `?Popular=1&All_Layers=0`.
 * Only parameters set to "1" select a group. When none match, every group is returned.
 */
export function selectLegendGroups<T extends NamedGroup>(groups: T[], search: string): T[] {
  const enabled = new Set<string>();
  for (const [key, value] of new URLSearchParams(search).entries()) {
    if (value !== "1") continue;
    const normalized = normalizeGroupName(key);
    enabled.add(LEGEND_GROUP_ALIASES[normalized] ?? normalized);
  }

  if (enabled.size === 0) return groups;

  const selected = groups.filter((group) => enabled.has(normalizeGroupName(group.value)) || enabled.has(normalizeGroupName(group.label)));
  return selected.length > 0 ? selected : groups;
}
