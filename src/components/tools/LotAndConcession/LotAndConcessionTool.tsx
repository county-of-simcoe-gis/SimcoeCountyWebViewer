"use client";

/**
 * Lot And Concession Tool Component
 * Ported from SimcoeCountyWebViewerSecure LotAndConcession.jsx
 * Provides lot and concession search functionality for Simcoe County
 */

import React, { useState, useEffect, useCallback } from "react";
import PanelComponent from "@/components/PanelComponent";
import { useMapStore } from "@/stores/mapStore";
import { useLayerManagerStore } from "@/stores/layerManagerStore";
import { getUID } from "@/utils/helpersCore";
import { showMessage } from "@/utils/helpersUI";
import { getAxiosClient } from "@/lib/axiosInstance";
import { GeoJSON } from "ol/format";
import { LayerManager } from "@/utils/openlayers/LayerManager";

// OpenLayers imports
import { Vector as VectorSource, ImageWMS } from "ol/source";
import { Vector as VectorLayer, Image as ImageLayer } from "ol/layer";
import { Fill, Stroke, Style } from "ol/style";
import { extend } from "ol/extent";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";

// Import tool configuration
import toolConfig from "./config.json";

interface LotAndConcessionToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

interface MuniOption {
  value: string;
  label: string;
}

// Geographic townships list
const munis: MuniOption[] = [
  { value: "SEARCH ALL", label: "SEARCH ALL" },
  { value: "ADJALA", label: "ADJALA" },
  { value: "ESSA", label: "ESSA" },
  { value: "FLOS", label: "FLOS" },
  { value: "INNISFIL", label: "INNISFIL" },
  { value: "MARA", label: "MARA" },
  { value: "MATCHEDASH", label: "MATCHEDASH" },
  { value: "MEDONTE", label: "MEDONTE" },
  { value: "NOTTAWASAGA", label: "NOTTAWASAGA" },
  { value: "ORILLIA", label: "ORILLIA" },
  { value: "ORO", label: "ORO" },
  { value: "RAMA", label: "RAMA" },
  { value: "SUNNIDALE", label: "SUNNIDALE" },
  { value: "TAY", label: "TAY" },
  { value: "TECUMSETH", label: "TECUMSETH" },
  { value: "TINY", label: "TINY" },
  { value: "TOSORONTIO", label: "TOSORONTIO" },
  { value: "VESPRA", label: "VESPRA" },
  { value: "WEST GWILLIMBURY", label: "WEST GWILLIMBURY" },
];

// Results item component
interface ResultsProps {
  feature: Feature<Geometry>;
  onMouseEnter: (feature: Feature<Geometry>) => void;
  onMouseLeave: (feature: Feature<Geometry>) => void;
  onFeatureClick: (feature: Feature<Geometry>) => void;
}

function Results({ feature, onMouseEnter, onMouseLeave, onFeatureClick }: ResultsProps) {
  const lot = feature.get("_lot") as string;
  const con = feature.get("_con") as string;
  const muni = feature.get("_geog_twp") as string;

  return (
    <div
      className="p-3 mb-2 bg-white border border-[#e5e7eb] rounded-lg cursor-pointer transition-colors hover:bg-blue-50 hover:border-[#93c5fd]"
      title="Click to Zoom"
      onMouseLeave={() => onMouseLeave(feature)}
      onMouseEnter={() => onMouseEnter(feature)}
      onClick={() => onFeatureClick(feature)}
    >
      <div className="text-sm font-medium text-[#111827] mb-0.5">Lot: {lot}</div>
      <div className="text-sm font-medium text-[#111827] mb-0.5">Concession: {con}</div>
      <div className="text-xs text-[#6b7280]">Township: {muni}</div>
    </div>
  );
}

export default function LotAndConcessionTool({ name = "Lot And Concession", helpLink, hideHeader = false, onClose, onSidebarVisibility }: LotAndConcessionToolProps) {
  const { map } = useMapStore();

  // State
  const [lotNumber, setLotNumber] = useState("");
  const [concessionNumber, setConcessionNumber] = useState("");
  const [selectedMuni, setSelectedMuni] = useState<MuniOption>(munis[0]);
  const [features, setFeatures] = useState<Feature<Geometry>[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Layer IDs for layer manager
  const [wmsLayerId, setWmsLayerId] = useState<string | null>(null);
  const [shadowLayerId, setShadowLayerId] = useState<string | null>(null);

  // Create shadow layer for hover effect
  useEffect(() => {
    if (!map) return;

    const shadowStyle = new Style({
      stroke: new Stroke({
        color: [0, 255, 255, 0.3],
        width: 6,
      }),
      fill: new Fill({
        color: [0, 255, 255, 0.3],
      }),
    });

    const vectorLayerShadow = new VectorLayer({
      source: new VectorSource({
        features: [],
      }),
      style: shadowStyle,
    });

    const layerId = LayerManager.addLayer(vectorLayerShadow, "Tools", "Lot & Concession Shadow", {
      visible: true,
    });

    if (layerId) {
      setShadowLayerId(layerId);
    }

    return () => {
      if (layerId) {
        LayerManager.removeLayer(layerId);
        setShadowLayerId(null);
      }
    };
  }, [map]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wmsLayerId) {
        LayerManager.removeLayer(wmsLayerId);
      }
    };
  }, [wmsLayerId]);

  const handleClose = useCallback(() => {
    if (wmsLayerId) {
      LayerManager.removeLayer(wmsLayerId);
      setWmsLayerId(null);
    }
    if (shadowLayerId) {
      LayerManager.removeLayer(shadowLayerId);
      setShadowLayerId(null);
    }
    onClose();
  }, [wmsLayerId, shadowLayerId, onClose]);

  const updateFeatures = useCallback(
    (newFeatures: Feature<Geometry>[]) => {
      if (!map || newFeatures.length === 0) return;

      setFeatures(newFeatures);

      // Calculate extent of all features and zoom to it
      const initialExtent = newFeatures[0].getGeometry()?.getExtent()?.slice(0);
      if (!initialExtent) return;

      const combinedExtent = [...initialExtent];
      newFeatures.forEach((feature) => {
        const geomExtent = feature.getGeometry()?.getExtent();
        if (geomExtent) {
          extend(combinedExtent, geomExtent);
        }
      });

      const view = map.getView();
      view.fit(combinedExtent, { duration: 500 });

      // Small zoom adjustment to ensure features are visible
      setTimeout(() => {
        const currentZoom = view.getZoom();
        if (currentZoom) {
          view.setZoom(currentZoom + 0.01);
          view.setZoom(currentZoom);
        }
      }, 600);
    },
    [map],
  );

  const handleSearch = useCallback(async () => {
    if (!map) return;

    if (lotNumber === "" && concessionNumber === "") {
      showMessage("Lot And Con", "Please enter a LOT and/or CON.", "warning");
      return;
    }

    setIsSearching(true);

    try {
      // Remove existing WMS layer
      if (wmsLayerId) {
        LayerManager.removeLayer(wmsLayerId);
        setWmsLayerId(null);
      }

      // Build CQL filter
      let sql = "_description <> 'Road Allowance'";

      if (selectedMuni.value !== "SEARCH ALL") {
        sql += ` AND _geog_twp = '${selectedMuni.value}'`;
      }

      if (lotNumber.length !== 0) {
        sql += ` AND _lot = '${lotNumber.toUpperCase()}'`;
      }

      if (concessionNumber.length !== 0) {
        sql += ` AND _con = '${concessionNumber.toUpperCase()}'`;
      }

      // Create and add WMS layer
      const wmsSource = new ImageWMS({
        url: toolConfig.serverUrl + "wms/",
        params: {
          LAYERS: toolConfig.layerName,
          VERSION: "1.3.0",
          FORMAT: "image/png",
          SRS: "EPSG:3857",
          TRANSPARENT: true,
          CQL_FILTER: sql,
        },
        ratio: 1,
        crossOrigin: "anonymous",
      });

      const wmsLayer = new ImageLayer({
        source: wmsSource,
      });

      const layerId = LayerManager.addLayer(wmsLayer, "Tools", "Lot & Concession WMS", {
        visible: true,
      });

      if (layerId) {
        setWmsLayerId(layerId);
      }

      // Fetch features via WFS
      const wfsUrl = `${toolConfig.serverUrl}wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${toolConfig.layerName}&outputFormat=application/json&cql_filter=${encodeURIComponent(sql)}&sortBy=_lot,_con&count=1000`;

      const axiosClient = getAxiosClient(wfsUrl);
      const response = await axiosClient.get(wfsUrl);
      const geoJsonFormat = new GeoJSON();
      const result = geoJsonFormat.readFeatures(response.data);

      if (result.length === 0) {
        showMessage("Lot And Con", "No results found for your search.", "info");
        setFeatures([]);
      } else {
        updateFeatures(result);
      }
    } catch (error) {
      console.error("Error searching lot and concession:", error);
      showMessage("Lot And Con", "An error occurred while searching. Please try again.", "error");
    } finally {
      setIsSearching(false);
    }
  }, [map, lotNumber, concessionNumber, selectedMuni, updateFeatures, wmsLayerId]);

  const handleClear = useCallback(() => {
    setFeatures([]);
    setConcessionNumber("");
    setLotNumber("");
    setSelectedMuni(munis[0]);

    if (wmsLayerId) {
      LayerManager.removeLayer(wmsLayerId);
      setWmsLayerId(null);
    }

    // Clear shadow layer features
    if (shadowLayerId) {
      const { getLayer } = useLayerManagerStore.getState();
      const shadowLayer = getLayer(shadowLayerId);
      if (shadowLayer?.layer) {
        const source = (shadowLayer.layer as VectorLayer<VectorSource>).getSource();
        source?.clear();
      }
    }
  }, [wmsLayerId, shadowLayerId]);

  const handleMouseEnter = useCallback(
    (feature: Feature<Geometry>) => {
      if (shadowLayerId) {
        const { getLayer } = useLayerManagerStore.getState();
        const shadowLayer = getLayer(shadowLayerId);
        if (shadowLayer?.layer) {
          const source = (shadowLayer.layer as VectorLayer<VectorSource>).getSource();
          source?.clear();
          source?.addFeature(feature);
        }
      }
    },
    [shadowLayerId],
  );

  const handleMouseLeave = useCallback(() => {
    if (shadowLayerId) {
      const { getLayer } = useLayerManagerStore.getState();
      const shadowLayer = getLayer(shadowLayerId);
      if (shadowLayer?.layer) {
        const source = (shadowLayer.layer as VectorLayer<VectorSource>).getSource();
        source?.clear();
      }
    }
  }, [shadowLayerId]);

  const handleFeatureClick = useCallback(
    (feature: Feature<Geometry>) => {
      if (!map) return;

      const extent = feature.getGeometry()?.getExtent();
      if (extent) {
        map.getView().fit(extent, { duration: 500 });
      }
    },
    [map],
  );

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="flex flex-col min-h-full p-3 gap-3">
        <div className="text-[13px] text-[#6b7280]">Locate civic addresses within the County using the form below.</div>

        <div className="bg-base-200 border border-base-300 rounded-lg p-4 mb-3 shrink-0">
          <div className="mb-3 flex items-center gap-2">
            <label htmlFor="lot-number" className="text-[13px] font-semibold text-[#374151] whitespace-nowrap w-28 shrink-0">
              Lot:
            </label>
            <input id="lot-number" type="text" placeholder="Enter Lot Number" className="input input-bordered w-full input-sm" onChange={(e) => setLotNumber(e.target.value)} value={lotNumber} />
          </div>

          <div className="mb-3 flex items-center gap-2">
            <label htmlFor="concession-number" className="text-[13px] font-semibold text-[#374151] whitespace-nowrap w-28 shrink-0">
              Concession:
            </label>
            <input
              id="concession-number"
              type="text"
              placeholder="Concession Number"
              className="input input-bordered w-full input-sm"
              onChange={(e) => setConcessionNumber(e.target.value)}
              value={concessionNumber}
            />
          </div>

          <div className="mb-3 flex items-center gap-2">
            <label htmlFor="township-select" className="text-[13px] font-semibold text-[#374151] whitespace-nowrap w-28 shrink-0">
              Township:
            </label>
            <select
              id="township-select"
              className="select select-bordered w-full select-sm"
              onChange={(e) => {
                const selected = munis.find((m) => m.value === e.target.value);
                if (selected) setSelectedMuni(selected);
              }}
              value={selectedMuni.value}
            >
              {munis.map((muni) => (
                <option key={muni.value} value={muni.value}>
                  {muni.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end mt-3">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>

        {features.length === 0 && !isSearching && (
          <div className="flex items-start gap-[10px] py-3 px-4 bg-blue-100 border border-blue-300 rounded-lg text-xs text-blue-800 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Please enter a LOT and/or CONCESSION in the textboxes above then click SEARCH button.</span>
          </div>
        )}

        <div className="flex-1 min-h-[150px] max-h-[45vh] overflow-y-auto pr-1">
          {features.map((feature) => (
            <Results key={getUID()} feature={feature} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onFeatureClick={handleFeatureClick} />
          ))}
        </div>
      </div>
    </PanelComponent>
  );
}
