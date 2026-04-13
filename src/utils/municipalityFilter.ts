/**
 * Municipality filter utility.
 *
 * When the viewer is scoped to a specific municipality (via config.municipality
 * or the MUNI URL parameter), secured information such as owner names,
 * MPAC / Teranet reports, mailing labels and planning reports should only be
 * available for parcels that belong to that municipality.
 */

import { useAppStore } from "@/stores/appStore";

/**
 * Return the active municipality filter string, or `null` if no filter is set.
 * Reads from the merged app config first, then falls back to the MUNI URL parameter.
 */
export function getActiveMunicipality(): string | null {
  const state = useAppStore.getState();
  const configMuni = state.config?.municipality as string | undefined;
  if (configMuni) return configMuni;
  const urlMuni = state.urlParameters?.MUNI;
  if (urlMuni) return urlMuni;
  return null;
}

/**
 * Check whether a property's municipality is allowed under the current filter.
 *
 * @param propertyMunicipality - The municipality of the property (e.g. from
 *   the property report API's `Municipality` field).
 * @returns `true` when there is no filter **or** the property belongs to the
 *   configured municipality; `false` otherwise.
 */
export function isPropertyInMunicipality(propertyMunicipality: string | undefined | null): boolean {
  const filter = getActiveMunicipality();
  if (!filter) return true; // no restriction
  if (!propertyMunicipality) return false; // municipality unknown — deny
  return filter.toLowerCase() === propertyMunicipality.toLowerCase();
}

/**
 * Return `true` when a municipality filter is active (regardless of whether a
 * specific property matches it). Useful for quick guards that skip expensive
 * work when there is no restriction.
 */
export function hasMunicipalityFilter(): boolean {
  return getActiveMunicipality() !== null;
}
