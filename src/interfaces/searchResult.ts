/**
 * Shared SearchResult interface used by the search store, Search component,
 * SearchZoom, and any theme that reacts to search results.
 */
export interface SearchResult {
  name: string;
  type: string;
  municipality?: string;
  location_id?: string;
  place_id?: string;
  x?: number;
  y?: number;
  imageName?: string;
  fullName?: string;
  layerGroupName?: string;
  layerGroup?: string;
  index?: number;
  geojson?: string;
  geojson_point?: string;
  alias?: string;
  is_open_data?: boolean;
}
