"use client";

/**
 * Coordinates Tool Component
 * Ported from SimcoeCountyWebViewer Coordinates.jsx
 * Displays live coordinates, allows coordinate input/conversion, and shows map extent/scale
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaCrosshairs, FaSearchPlus, FaMapMarkerAlt, FaCopy } from "react-icons/fa";
import PanelComponent from "@/components/PanelComponent";
import { useMapStore } from "@/stores/mapStore";
import { useMyMapsStore, createMyMapsItem } from "@/stores/myMapsStore";
import { useEventStore } from "@/stores/eventStore";
import { featureToGeoJSON, styleToJSON } from "@/utils/myMapsHelpers";
import { activateTab } from "@/utils/helpersUI";
import { getMapScale } from "@/utils/mapHelpers";
import { getPublicPath } from "@/utils/getPublicPath";
import { glowContainer } from "@/utils/helpersBrowser";

// OpenLayers imports
import { transform } from "ol/proj";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import Projection from "ol/proj/Projection";
import { Vector as VectorLayer } from "ol/layer";
import { Style, Icon } from "ol/style";
import { Vector as VectorSource } from "ol/source";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { unByKey } from "ol/Observable";
import type { EventsKey } from "ol/events";
import type { Coordinate } from "ol/coordinate";
import { LayerManager } from "@/utils/openlayers/LayerManager";

interface CoordinatesToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

type ProjectionType = "webmercator" | "latlong" | "nad83" | "nad27";

interface CoordinateSet {
  x: string;
  y: string;
}

const INPUT_PLACEHOLDER = "(listening for input)";

// Register custom projections
const registerProjections = () => {
  proj4.defs([
    ["EPSG:26917", "+proj=utm +zone=17 +ellps=GRS80 +datum=NAD83 +units=m +no_defs "],
    ["EPSG:26717", "+proj=utm +zone=17 +ellps=clrk66 +datum=NAD27 +units=m +no_defs "],
  ]);
  register(proj4);
};

// Create projection objects
const nad83Proj = new Projection({
  code: "EPSG:26917",
  extent: [194772.8107, 2657478.7094, 805227.1893, 9217519.4415],
});

const nad27Proj = new Projection({
  code: "EPSG:26717",
  extent: [169252.3099, 885447.906, 830747.6901, 9217404.5493],
});

export default function CoordinatesTool({ name = "Coordinates", helpLink, hideHeader = false, onClose, onSidebarVisibility }: CoordinatesToolProps) {
  // Stores
  const { map, setActiveToolId } = useMapStore();

  // Live coordinates state
  const [liveWebMercator, setLiveWebMercator] = useState<Coordinate | null>(null);
  const [liveLatLong, setLiveLatLong] = useState<Coordinate | null>(null);

  // Input coordinates state
  const [webMercatorCoords, setWebMercatorCoords] = useState<CoordinateSet>({ x: "", y: "" });
  const [latLongCoords, setLatLongCoords] = useState<CoordinateSet>({ x: "", y: "" });
  const [nad83Coords, setNad83Coords] = useState<CoordinateSet>({ x: "", y: "" });
  const [nad27Coords, setNad27Coords] = useState<CoordinateSet>({ x: "", y: "" });

  // Map extent state
  const [extent, setExtent] = useState<{ minX: number | null; minY: number | null; maxX: number | null; maxY: number | null }>({
    minX: null,
    minY: null,
    maxX: null,
    maxY: null,
  });

  // Map scale state
  const [mapScale, setMapScale] = useState<number>(0);

  // Refs for OpenLayers objects
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const layerIdRef = useRef<string | null>(null);
  const pointerMoveEventRef = useRef<EventsKey | null>(null);
  const mapClickEventRef = useRef<EventsKey | null>(null);
  const mapMoveEndEventRef = useRef<EventsKey | null>(null);
  const projectionsRegistered = useRef(false);

  // Update extent
  const updateExtent = useCallback(() => {
    if (!map) return;
    const currentExtent = map.getView().calculateExtent(map.getSize());
    setExtent({
      minX: currentExtent[0],
      minY: currentExtent[1],
      maxX: currentExtent[2],
      maxY: currentExtent[3],
    });
    setMapScale(getMapScale(map));
  }, [map]);

  // Create point on map
  const createPoint = useCallback(
    (coords: Coordinate, zoom = false) => {
      if (!vectorLayerRef.current || !map) return;

      vectorLayerRef.current.getSource()?.clear();
      const pointFeature = new Feature({
        geometry: new Point(coords),
      });
      vectorLayerRef.current.getSource()?.addFeature(pointFeature);

      if (zoom) {
        map.getView().animate({ center: coords, zoom: 18 });
      }
    },
    [map],
  );

  // Glow all coordinate inputs
  const glowAllInputs = useCallback(() => {
    ["webmercator-x", "webmercator-y", "latlong-x", "latlong-y", "nad83-x", "nad83-y", "nad27-x", "nad27-y"].forEach((id) => {
      glowContainer(`sc-coordinate-${id}`, "green");
    });
  }, []);

  // Handle map click
  const onMapClick = useCallback(
    (evt: { coordinate: Coordinate }) => {
      const webMercator = evt.coordinate;
      const latLong = transform(webMercator, "EPSG:3857", "EPSG:4326");
      const utmNad83 = transform(webMercator, "EPSG:3857", nad83Proj);
      const utmNad27 = transform(webMercator, "EPSG:3857", nad27Proj);

      setWebMercatorCoords({ x: String(webMercator[0]), y: String(webMercator[1]) });
      setLatLongCoords({ x: String(latLong[0]), y: String(latLong[1]) });
      setNad83Coords({ x: String(utmNad83[0]), y: String(utmNad83[1]) });
      setNad27Coords({ x: String(utmNad27[0]), y: String(utmNad27[1]) });

      glowAllInputs();
      createPoint(webMercator, false);
    },
    [createPoint, glowAllInputs],
  );

  // Handle pointer move
  const onPointerMove = useCallback((evt: { coordinate: Coordinate }) => {
    const webMercator = evt.coordinate;
    const latLong = transform(webMercator, "EPSG:3857", "EPSG:4326");
    setLiveWebMercator(webMercator);
    setLiveLatLong(latLong);
  }, []);

  // Handle zoom click
  const onZoomClick = useCallback(
    (proj: ProjectionType, x: string, y: string) => {
      const xNum = parseFloat(x);
      const yNum = parseFloat(y);

      if (isNaN(xNum) || isNaN(yNum)) return;

      let webMercatorCoords: Coordinate | null = null;

      switch (proj) {
        case "webmercator":
          webMercatorCoords = [xNum, yNum];
          break;
        case "latlong":
          webMercatorCoords = transform([xNum, yNum], "EPSG:4326", "EPSG:3857");
          break;
        case "nad83":
          webMercatorCoords = transform([xNum, yNum], nad83Proj, "EPSG:3857");
          break;
        case "nad27":
          webMercatorCoords = transform([xNum, yNum], nad27Proj, "EPSG:3857");
          break;
      }

      if (webMercatorCoords) {
        createPoint(webMercatorCoords, true);
      }
    },
    [createPoint],
  );

  // Handle add to MyMaps
  const onMyMapsClick = useCallback((x: string, y: string) => {
    if (!x || !vectorLayerRef.current) return;

    const features = vectorLayerRef.current.getSource()?.getFeatures();
    if (features && features.length > 0) {
      const feature = features[0];
      const featureStyle = feature.getStyle();
      const myMapsItem = createMyMapsItem(feature, "Buffer", `X:${x}, Y:${y}`, featureStyle instanceof Style ? styleToJSON(featureStyle) : undefined);
      myMapsItem.featureGeoJSON = featureToGeoJSON(feature);
      useMyMapsStore.getState().addItem(myMapsItem);
      useEventStore.getState().emit("mymap-item-created", { item: myMapsItem });
      activateTab("mymaps");
    }
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  }, []);

  // Initialize
  useEffect(() => {
    if (!map) return;

    // Register projections once
    if (!projectionsRegistered.current) {
      registerProjections();
      projectionsRegistered.current = true;
    }

    // Create vector layer for crosshair marker
    const vectorSource = new VectorSource({ features: [] });
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        image: new Icon({
          src: getPublicPath("/images/cross-hair.png"),
        }),
      }),
      zIndex: 500,
    });
    vectorLayerRef.current = vectorLayer;
    const coordLayerId = LayerManager.addLayer(vectorLayer, "Tools", "Coordinates Tool", { visible: true });
    layerIdRef.current = coordLayerId;

    // Disable parcel click
    setActiveToolId("coordinates");

    // Register map events
    pointerMoveEventRef.current = map.on("pointermove", onPointerMove);
    mapClickEventRef.current = map.on("click", onMapClick);
    mapMoveEndEventRef.current = map.on("moveend", updateExtent);

    // Initial extent
    updateExtent();

    // Cleanup
    return () => {
      if (pointerMoveEventRef.current) unByKey(pointerMoveEventRef.current);
      if (mapClickEventRef.current) unByKey(mapClickEventRef.current);
      if (mapMoveEndEventRef.current) unByKey(mapMoveEndEventRef.current);

      setActiveToolId(null);

      if (layerIdRef.current) {
        LayerManager.removeLayer(layerIdRef.current);
        layerIdRef.current = null;
      }
    };
  }, [map, onPointerMove, onMapClick, updateExtent, setActiveToolId]);

  // Format number for display
  const formatNumber = useCallback((num: number | null, decimals = 6): string => {
    if (num === null) return INPUT_PLACEHOLDER;
    return num.toFixed(decimals);
  }, []);

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="relative w-full overflow-auto text-base-content p-2">
        {/* LIVE COORDINATES */}
        <LiveCoordinatesSection liveWebMercator={liveWebMercator} liveLatLong={liveLatLong} formatNumber={formatNumber} />

        {/* SELECTED/CUSTOM COORDINATES */}
        <div className="divider my-2" />
        <h3 className="font-bold text-sm flex items-center gap-2 mb-1">
          <FaCrosshairs className="text-primary" />
          Selected/Custom Coordinates
        </h3>
        <p className="text-xs text-base-content/70 mb-3">
          Capture points in a variety of different coordinate systems or enter your own locations and zoom to its location. Simply click on the map to capture locations.
        </p>

        <div className="space-y-3">
          <CustomCoordinatesSection
            title="Map Coordinates (Web Mercator - Meters)"
            projType="webmercator"
            coords={webMercatorCoords}
            setCoords={setWebMercatorCoords}
            onZoomClick={onZoomClick}
            onMyMapsClick={onMyMapsClick}
            copyToClipboard={copyToClipboard}
            inputIdPrefix="webmercator"
          />

          <CustomCoordinatesSection
            title="Latitude/Longitude (WGS84 - Degrees)"
            projType="latlong"
            coords={latLongCoords}
            setCoords={setLatLongCoords}
            onZoomClick={onZoomClick}
            onMyMapsClick={onMyMapsClick}
            copyToClipboard={copyToClipboard}
            inputIdPrefix="latlong"
          />

          <CustomCoordinatesSection
            title="NAD 83 - Zone 17 (meters)"
            projType="nad83"
            coords={nad83Coords}
            setCoords={setNad83Coords}
            onZoomClick={onZoomClick}
            onMyMapsClick={onMyMapsClick}
            copyToClipboard={copyToClipboard}
            inputIdPrefix="nad83"
          />

          <CustomCoordinatesSection
            title="NAD 27 - Zone 17 (meters)"
            projType="nad27"
            coords={nad27Coords}
            setCoords={setNad27Coords}
            onZoomClick={onZoomClick}
            onMyMapsClick={onMyMapsClick}
            copyToClipboard={copyToClipboard}
            inputIdPrefix="nad27"
          />
        </div>

        {/* MAP EXTENT */}
        <div className="divider my-2" />
        <MapExtentSection extent={extent} formatNumber={formatNumber} />

        {/* MAP SCALE */}
        <div className="divider my-2" />
        <h3 className="font-bold text-sm mb-2">Map Scale</h3>
        <div className="bg-base-200 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Scale</span>
            <span className="text-sm text-primary font-mono">1:{mapScale.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </PanelComponent>
  );
}

// Live Coordinates Sub-component
interface LiveCoordinatesSectionProps {
  liveWebMercator: Coordinate | null;
  liveLatLong: Coordinate | null;
  formatNumber: (num: number | null, decimals?: number) => string;
}

function LiveCoordinatesSection({ liveWebMercator, liveLatLong, formatNumber }: LiveCoordinatesSectionProps) {
  return (
    <div>
      <h3 className="font-bold text-sm flex items-center gap-2 mb-1">
        <FaMapMarkerAlt className="text-success animate-pulse" />
        Live Coordinates
      </h3>
      <p className="text-xs text-base-content/70 mb-2">Live coordinates of your current pointer/mouse position.</p>

      <div className="bg-base-200 rounded-lg p-3 space-y-1">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="font-medium">X (meters):</span>
            <span className="ml-2 text-base-content/70 font-mono">{liveWebMercator ? formatNumber(liveWebMercator[0], 2) : INPUT_PLACEHOLDER}</span>
          </div>
          <div>
            <span className="font-medium">Y (meters):</span>
            <span className="ml-2 text-base-content/70 font-mono">{liveWebMercator ? formatNumber(liveWebMercator[1], 2) : INPUT_PLACEHOLDER}</span>
          </div>
        </div>

        <div className="divider my-1" />

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="font-medium">Latitude:</span>
            <span className="ml-2 text-base-content/70 font-mono">{liveLatLong ? formatNumber(liveLatLong[1], 6) : INPUT_PLACEHOLDER}</span>
          </div>
          <div>
            <span className="font-medium">Longitude:</span>
            <span className="ml-2 text-base-content/70 font-mono">{liveLatLong ? formatNumber(liveLatLong[0], 6) : INPUT_PLACEHOLDER}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Coordinates Sub-component
interface CustomCoordinatesSectionProps {
  title: string;
  projType: ProjectionType;
  coords: CoordinateSet;
  setCoords: React.Dispatch<React.SetStateAction<CoordinateSet>>;
  onZoomClick: (proj: ProjectionType, x: string, y: string) => void;
  onMyMapsClick: (x: string, y: string) => void;
  copyToClipboard: (text: string) => void;
  inputIdPrefix: string;
}

function CustomCoordinatesSection({ title, projType, coords, setCoords, onZoomClick, onMyMapsClick, copyToClipboard, inputIdPrefix }: CustomCoordinatesSectionProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onZoomClick(projType, coords.x, coords.y);
    }
  };

  const hasCoords = coords.x !== "" && coords.y !== "";

  return (
    <div className="card card-compact bg-base-100 border border-base-300">
      <div className="card-body p-3">
        <h4 className="text-xs font-medium text-primary">{title}</h4>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label py-0">
              <span className="label-text text-xs">X Coordinate</span>
            </label>
            <input
              id={`sc-coordinate-${inputIdPrefix}-x`}
              type="text"
              className="input input-bordered input-sm w-full text-xs font-mono"
              placeholder={INPUT_PLACEHOLDER}
              value={coords.x}
              onChange={(e) => setCoords((prev) => ({ ...prev, x: e.target.value }))}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div>
            <label className="label py-0">
              <span className="label-text text-xs">Y Coordinate</span>
            </label>
            <input
              id={`sc-coordinate-${inputIdPrefix}-y`}
              type="text"
              className="input input-bordered input-sm w-full text-xs font-mono"
              placeholder={INPUT_PLACEHOLDER}
              value={coords.y}
              onChange={(e) => setCoords((prev) => ({ ...prev, y: e.target.value }))}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs">
          <button
            className={`inline-flex items-center gap-1 hover:text-primary transition-colors ${hasCoords ? "text-base-content cursor-pointer" : "text-base-content/50 cursor-not-allowed"}`}
            onClick={() => hasCoords && onZoomClick(projType, coords.x, coords.y)}
            title="Zoom to coordinates"
          >
            <FaSearchPlus size={11} />
            <span className="underline">Zoom</span>
          </button>
          <button
            className={`inline-flex items-center gap-1 hover:text-primary transition-colors ${hasCoords ? "text-base-content cursor-pointer" : "text-base-content/50 cursor-not-allowed"}`}
            onClick={() => hasCoords && onMyMapsClick(coords.x, coords.y)}
            title="Add to My Maps"
          >
            <FaMapMarkerAlt size={11} />
            <span className="underline">My Maps</span>
          </button>
          <button
            className={`inline-flex items-center gap-1 hover:text-primary transition-colors ${hasCoords ? "text-base-content cursor-pointer" : "text-base-content/50 cursor-not-allowed"}`}
            onClick={() => hasCoords && copyToClipboard(`${coords.x}, ${coords.y}`)}
            title="Copy coordinates"
          >
            <FaCopy size={11} />
            <span className="underline">Copy</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Map Extent Sub-component
interface MapExtentSectionProps {
  extent: { minX: number | null; minY: number | null; maxX: number | null; maxY: number | null };
  formatNumber: (num: number | null, decimals?: number) => string;
}

function MapExtentSection({ extent, formatNumber }: MapExtentSectionProps) {
  return (
    <div>
      <h3 className="font-bold text-sm mb-2">Map Extent</h3>
      <div className="bg-base-200 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="font-medium">Min X:</span>
            <span className="text-base-content/70 font-mono">{formatNumber(extent.minX, 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Max X:</span>
            <span className="text-base-content/70 font-mono">{formatNumber(extent.maxX, 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Min Y:</span>
            <span className="text-base-content/70 font-mono">{formatNumber(extent.minY, 2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Max Y:</span>
            <span className="text-base-content/70 font-mono">{formatNumber(extent.maxY, 2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
