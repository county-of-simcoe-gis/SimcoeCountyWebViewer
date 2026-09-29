"use client";

import { useState, useEffect, useRef, useCallback, CSSProperties } from "react";
import axiosInstance from "@/lib/axiosInstance";
import PanelComponent from "@/components/PanelComponent";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { List } from "react-window";
import { FaSearch, FaMapMarkerAlt, FaExternalLinkAlt, FaPalette } from "react-icons/fa";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Circle, Fill, Stroke } from "ol/style";
import { fromLonLat } from "ol/proj";
import { containsCoordinate } from "ol/extent";
import { unByKey } from "ol/Observable";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { useInteractionManagerStore, type InteractionResult } from "@/stores/interactionManagerStore";
import TwoOneOnePopupContent from "./TwoOneOnePopupContent";
import ResultsPopup, { type Result } from "@/components/ResultsPopup";

interface TwoOneOneProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

interface Result211 {
  id: number;
  recordNumber: string | null;
  organizationProgramName: string | null;
  locatedInCommunity: string | null;
  ageCategory: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  website: string | null;
  descriptionBrief: string | null;
  officePhone: string | null;
}

interface SelectOption {
  value: string;
  label: string;
}

// Props for the row component - must be separate from rowProps
interface ListRowData {
  items: Result211[];
  onViewDetails: (item: Result211) => void;
  onZoomTo: (item: Result211) => void;
  isFrench: boolean;
}

const ageCategoriesEnglish: SelectOption[] = [
  { value: "All", label: "All" },
  { value: "Adults", label: "Adults" },
  { value: "Children", label: "Children" },
  { value: "Seniors", label: "Seniors" },
  { value: "Youth", label: "Youth" },
];

const ageCategoriesFrench: SelectOption[] = [
  { value: "All", label: "Tout" },
  { value: "Adultes", label: "Adultes" },
  { value: "Aînés", label: "Aînés" },
  { value: "Jeunes", label: "Jeunes" },
];

// Row rendering component (must be defined outside to avoid re-creation)
const RowRenderer = ({
  index,
  style,
  items,
  onViewDetails,
  onZoomTo,
  isFrench,
}: {
  index: number;
  style: CSSProperties;
  items: Result211[];
  onViewDetails: (item: Result211) => void;
  onZoomTo: (item: Result211) => void;
  isFrench: boolean;
}) => {
  const item = items[index];
  if (!item) return null;

  return (
    <div style={style}>
      <div className="p-2 border-b border-base-300 hover:bg-base-200 h-full overflow-hidden">
        <div className="font-medium text-sm leading-tight mb-1 line-clamp-2" title={item.organizationProgramName || ""}>
          {item.organizationProgramName}
        </div>
        <div className="flex gap-2 mt-2">
          <button className="btn btn-xs btn-ghost text-primary" onClick={() => onViewDetails(item)}>
            <FaExternalLinkAlt className="mr-1" />
            {isFrench ? "Détails" : "Details"}
          </button>
          <button className="btn btn-xs btn-ghost text-primary" onClick={() => onZoomTo(item)}>
            <FaMapMarkerAlt className="mr-1" />
            Zoom
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TwoOneOne({ name = "211 Community Services", helpLink, hideHeader = false, onClose, onSidebarVisibility }: TwoOneOneProps) {
  const map = useMapStore((state) => state.map);
  const { show: showPopup, hide: hidePopup } = usePopupStore();
  const { registerHandler, unregisterHandler } = useInteractionManagerStore();

  // State
  const [isFrench, setIsFrench] = useState(false);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [subCategories, setSubCategories] = useState<SelectOption[]>([]);
  const [categorySelected, setCategorySelected] = useState<string>("All");
  const [subCategorySelected, setSubCategorySelected] = useState<string>("All");
  const [ageSelected, setAgeSelected] = useState<string>("All");
  const [searchText, setSearchText] = useState("");
  const [onlyInMapExtent, setOnlyInMapExtent] = useState(false);
  const [results, setResults] = useState<Result211[]>([]);
  const [filteredResults, setFilteredResults] = useState<Result211[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const layerIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFrenchRef = useRef(isFrench);
  const filterResultsRef = useRef<() => void>(() => {});

  // Keep isFrench ref updated for use in click handler
  useEffect(() => {
    isFrenchRef.current = isFrench;
  }, [isFrench]);

  // Fixed row height for the list
  const ROW_HEIGHT = 80;

  // Initialize vector layer
  useEffect(() => {
    if (!map) return;

    vectorSourceRef.current = new VectorSource({ features: [] });

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: "#e74c3c" }),
          stroke: new Stroke({ color: "#c0392b", width: 2 }),
        }),
      }),
    });

    vectorLayer.set("name", "sc-211");

    const layerId = LayerManager.addLayer(vectorLayer, "Themes", "211 Services", {
      visible: true,
      suppressParcelClick: true,
    });

    layerIdRef.current = layerId;

    // Register interaction handler for 211 features
    const handlerId = "211-identify";

    registerHandler({
      id: handlerId,
      eventType: "singleclick",
      priority: 50, // Higher priority than default (lower number = first)
      handler: async (coordinate: number[], pixel: number[]): Promise<InteractionResult[]> => {
        if (!vectorSourceRef.current) return [];

        const features = map.getFeaturesAtPixel(pixel, {
          layerFilter: (layer) => layer === vectorLayer,
        });

        if (!features || features.length === 0) return [];

        // Convert 211 features to InteractionResults
        const results: InteractionResult[] = features.map((f, index) => {
          const feature = f as Feature<Point>;
          const props = feature.getProperties();
          // Filter out internal OL properties from display attributes
          const filteredAttributes: Record<string, unknown> = {};
          Object.entries(props).forEach(([key, value]) => {
            if (key !== "geometry" && key !== "bbox" && !key.startsWith("_") && typeof value !== "object") {
              filteredAttributes[key] = value;
            }
          });
          return {
            id: `211-${props.recordNumber || index}`,
            type: "layer" as const,
            displayName: props.organizationProgramName || "211 Service",
            // Custom render component for this result type
            renderContent: () => (
              <TwoOneOnePopupContent
                name={props.organizationProgramName || "Unknown"}
                description={props.descriptionBrief}
                website={props.website}
                recordNumber={props.recordNumber}
                isFrench={isFrenchRef.current}
              />
            ),
            data: {
              layerName: "211 Community Services",
              featureId: props.recordNumber || String(index),
              attributes: filteredAttributes,
              feature: feature,
            },
          };
        });

        return results;
      },
    });

    return () => {
      unregisterHandler(handlerId);
      if (layerIdRef.current) {
        LayerManager.removeLayer(layerIdRef.current);
      }
    };
  }, [map, registerHandler, unregisterHandler]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/public/map/theme/211/categories/${isFrench}`);
      const data = response.data;
      const options: SelectOption[] = [{ value: "All", label: isFrench ? "Tout" : "All" }, ...data.map((cat: string) => ({ value: cat, label: cat }))];
      setCategories(options);
      setCategorySelected("All");
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, [isFrench]);

  // Fetch subcategories
  const fetchSubCategories = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/public/map/theme/211/subcategories/${encodeURIComponent(categorySelected)}/${isFrench}`);
      const data = response.data;
      const options: SelectOption[] = [{ value: "All", label: isFrench ? "Tout" : "All" }, ...data.map((subCat: string) => ({ value: subCat, label: subCat }))];
      setSubCategories(options);
      setSubCategorySelected("All");
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    }
  }, [categorySelected, isFrench]);

  // Fetch results
  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(
        `/public/map/theme/211/results/${encodeURIComponent(categorySelected)}/${encodeURIComponent(
          categorySelected === "All" ? "All" : subCategorySelected,
        )}/${encodeURIComponent(ageSelected)}/${isFrench}`,
      );
      setResults(response.data);
    } catch (error) {
      console.error("Error fetching results:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [categorySelected, subCategorySelected, ageSelected, isFrench]);

  // Filter results
  const filterResults = useCallback(() => {
    let filtered = results;

    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((item) => item.organizationProgramName?.toLowerCase().includes(searchLower) || item.address?.toLowerCase().includes(searchLower));
    }

    // Filter by map extent - check coordinates directly so it always reflects the current extent
    if (onlyInMapExtent && map) {
      const extent = map.getView().calculateExtent(map.getSize());
      filtered = filtered.filter((item) => {
        if (!item.latitude || !item.longitude) return false;
        const lat = parseFloat(item.latitude.replace(",", "."));
        const lon = parseFloat(item.longitude.replace(",", "."));
        if (isNaN(lat) || isNaN(lon)) return false;
        const coords = fromLonLat([lon, Math.abs(lat)]);
        return containsCoordinate(extent, coords);
      });
    }

    setFilteredResults(filtered);
  }, [results, searchText, onlyInMapExtent, map]);

  // Update map features
  const updateMapFeatures = useCallback(() => {
    if (!vectorSourceRef.current) return;

    vectorSourceRef.current.clear();

    filteredResults.forEach((item) => {
      if (item.latitude && item.longitude) {
        const lat = parseFloat(item.latitude.replace(",", "."));
        const lon = parseFloat(item.longitude.replace(",", "."));

        if (!isNaN(lat) && !isNaN(lon)) {
          const coords = fromLonLat([lon, Math.abs(lat)]);
          const feature = new Feature(new Point(coords));
          feature.setProperties({
            ...item,
            recordNumber: item.recordNumber,
          });
          vectorSourceRef.current!.addFeature(feature);
        }
      }
    });
  }, [filteredResults]);

  // Effect hooks
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (categorySelected !== "All") {
      fetchSubCategories();
    } else {
      setSubCategories([{ value: "All", label: isFrench ? "Tout" : "All" }]);
      setSubCategorySelected("All");
    }
  }, [categorySelected, isFrench, fetchSubCategories]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    filterResultsRef.current = filterResults;
  }, [filterResults]);

  useEffect(() => {
    filterResults();
  }, [filterResults]);

  // Re-filter on map pan/zoom when "only in map extent" is active
  useEffect(() => {
    if (!map || !onlyInMapExtent) return;

    const key = map.on("moveend", () => {
      filterResultsRef.current();
    });

    return () => unByKey(key);
  }, [map, onlyInMapExtent]);

  useEffect(() => {
    updateMapFeatures();
  }, [updateMapFeatures]);

  const handleViewDetails = useCallback(
    (item: Result211) => {
      const url = isFrench ? `https://simcoecounty.cioc.ca/record/${item.recordNumber}?Ln=fr-CA` : `https://simcoecounty.cioc.ca/record/${item.recordNumber}`;
      window.open(url, "_blank");
    },
    [isFrench],
  );

  const handleZoomToResult = useCallback(
    (item: Result211) => {
      if (!map || !item.latitude || !item.longitude) return;

      const lat = parseFloat(item.latitude.replace(",", "."));
      const lon = parseFloat(item.longitude.replace(",", "."));

      if (!isNaN(lat) && !isNaN(lon)) {
        const coords = fromLonLat([lon, Math.abs(lat)]);
        map.getView().animate({
          center: coords,
          zoom: 16,
          duration: 500,
        });

        // Create result for unified popup
        const result: Result = {
          id: `211-${item.recordNumber || Date.now()}`,
          type: "layer",
          displayName: item.organizationProgramName || "211 Service",
          renderContent: () => (
            <TwoOneOnePopupContent
              name={item.organizationProgramName || "Unknown"}
              description={item.descriptionBrief}
              website={item.website}
              recordNumber={item.recordNumber}
              isFrench={isFrenchRef.current}
            />
          ),
          data: {
            layerName: "211 Community Services",
            featureId: item.recordNumber || String(Date.now()),
            attributes: item as unknown as Record<string, unknown>,
          },
        };

        const handleClose = () => {
          hidePopup();
        };

        // Show unified popup after zoom
        showPopup(coords, <ResultsPopup results={[result]} onClose={handleClose} />, "Result", "211 Community Services");
      }
    },
    [map, showPopup, hidePopup],
  );

  const handleClose = () => {
    if (layerIdRef.current) {
      LayerManager.removeLayer(layerIdRef.current);
      layerIdRef.current = null;
    }
    onClose();
  };

  const ageOptions = isFrench ? ageCategoriesFrench : ageCategoriesEnglish;

  return (
    <PanelComponent icon={<FaPalette size={20} className="text-neutral/70" />} name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="p-4 space-y-4">
        {/* Language Toggle */}
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-2">
            <span className="label-text">{isFrench ? "Back to English" : "Voir en Français?"}</span>
            <input type="checkbox" className="toggle toggle-sm" checked={isFrench} onChange={(e) => setIsFrench(e.target.checked)} />
          </label>
        </div>

        {/* Category Select */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">{isFrench ? "Catégorie" : "Category"}</span>
          </label>
          <select className="select select-bordered select-sm w-full" value={categorySelected} onChange={(e) => setCategorySelected(e.target.value)}>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* SubCategory Select */}
        <div className="form-control">
          <label className="label">
            <span className={`label-text font-semibold ${categorySelected === "All" ? "opacity-50" : ""}`}>{isFrench ? "Sous Catégorie" : "Sub Category"}</span>
          </label>
          <select className="select select-bordered select-sm w-full" value={subCategorySelected} onChange={(e) => setSubCategorySelected(e.target.value)} disabled={categorySelected === "All"}>
            {subCategories.map((subCat) => (
              <option key={subCat.value} value={subCat.value}>
                {subCat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Age Category Select */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold">{isFrench ? "Catégorie d'âge" : "Age Category"}</span>
          </label>
          <select className="select select-bordered select-sm w-full" value={ageSelected} onChange={(e) => setAgeSelected(e.target.value)}>
            {ageOptions.map((age) => (
              <option key={age.value} value={age.value}>
                {age.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="form-control">
          <label className="input input-bordered input-sm flex items-center gap-2">
            <FaSearch className="text-base-content/70" />
            <input type="text" className="grow" placeholder={isFrench ? "Rechercher par mot-clé" : "Search by keyword"} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </label>
        </div>

        {/* Only in Map Extent */}
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-2 py-0">
            <input type="checkbox" className="checkbox checkbox-sm" checked={onlyInMapExtent} onChange={(e) => setOnlyInMapExtent(e.target.checked)} />
            <span className="label-text text-xs">{isFrench ? "Rechercher propriétés visibles sur la carte" : "Only search properties visible in the map"}</span>
          </label>
        </div>

        <div className="divider my-0"></div>

        {/* Results */}
        <div ref={containerRef} className="h-64 border border-base-300 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex items-center justify-center h-full text-base-content/70">{isFrench ? "Aucun résultat trouvé" : "No Results Found"}</div>
          ) : (
            <List<ListRowData>
              defaultHeight={256}
              rowComponent={RowRenderer}
              rowCount={filteredResults.length}
              rowHeight={ROW_HEIGHT}
              rowProps={{
                items: filteredResults,
                onViewDetails: handleViewDetails,
                onZoomTo: handleZoomToResult,
                isFrench: isFrench,
              }}
            />
          )}
        </div>

        <div className="text-xs text-base-content/70 text-center">
          {filteredResults.length} {isFrench ? "résultats" : "results"}
        </div>
      </div>
    </PanelComponent>
  );
}
