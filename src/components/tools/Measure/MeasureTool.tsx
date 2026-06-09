"use client";

/**
 * Measure Tool Component
 * Ported from SimcoeCountyWebViewer Measure.jsx
 * Provides distance and area measurement functionality using OpenLayers
 */

import "@/components/tools/Measure/MeasureTool.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaRulerHorizontal, FaDrawPolygon, FaRegCircle, FaRegSquare, FaCompass, FaTrash } from "react-icons/fa";
import PanelComponent from "@/components/PanelComponent";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { useMyMapsStore, createMyMapsItem } from "@/stores/myMapsStore";
import { useEventStore } from "@/stores/eventStore";
import { showMessage } from "@/utils/helpersUI";
import { getBearing, featureToGeoJSON, styleToJSON } from "@/utils/myMapsHelpers";

// OpenLayers imports
import Draw, { createBox } from "ol/interaction/Draw";
import { Snap } from "ol/interaction";
import { Vector as VectorSource } from "ol/source";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { LineString, Polygon, Circle } from "ol/geom";
import { getArea, getLength } from "ol/sphere";
import { fromCircle } from "ol/geom/Polygon";
import { unByKey } from "ol/Observable";
import Overlay from "ol/Overlay";
import { Vector as VectorLayer } from "ol/layer";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { EventsKey } from "ol/events";
import type { Coordinate } from "ol/coordinate";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { useInteractionManagerStore } from "@/stores/interactionManagerStore";

interface MeasureToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

type GeometryType = "LineString" | "Polygon" | "Circle" | "Rectangle" | "Bearing" | "Clear" | "";
type UnitType = "distance" | "area" | "bearing" | "clear";

interface UnitDefinition {
  name: string;
  abbreviation: string;
  type: UnitType;
  convertFunction: (meters: number) => number | string;
}

const measureButtons = [
  { type: "LineString" as GeometryType, unitType: "distance" as UnitType, icon: FaRulerHorizontal, title: "Draw a single line on the map" },
  { type: "Polygon" as GeometryType, unitType: "area" as UnitType, icon: FaDrawPolygon, title: "Draw a polygon on the map" },
  { type: "Circle" as GeometryType, unitType: "area" as UnitType, icon: FaRegCircle, title: "Draw a circle on the map" },
  { type: "Rectangle" as GeometryType, unitType: "area" as UnitType, icon: FaRegSquare, title: "Draw a rectangle on the map" },
  { type: "Bearing" as GeometryType, unitType: "bearing" as UnitType, icon: FaCompass, title: "Draw a Bearing Line on the map" },
  { type: "Clear" as GeometryType, unitType: "clear" as UnitType, icon: FaTrash, title: "Clear Drawing" },
];

const unitList: UnitDefinition[] = [
  {
    name: "Kilometer",
    abbreviation: "km",
    type: "distance",
    convertFunction: (meters) => Math.round((meters / 1000) * 100) / 100,
  },
  {
    name: "Miles",
    abbreviation: "mi",
    type: "distance",
    convertFunction: (meters) => Math.round((meters / 1609.344) * 100) / 100,
  },
  {
    name: "Meter",
    abbreviation: "m",
    type: "distance",
    convertFunction: (meters) => Math.round(meters * 100) / 100,
  },
  {
    name: "Feet",
    abbreviation: "ft",
    type: "distance",
    convertFunction: (meters) => Math.round(meters * 3.28084 * 100) / 100,
  },
  {
    name: "Yard",
    abbreviation: "yd",
    type: "distance",
    convertFunction: (meters) => Math.round(meters * 1.09361 * 100) / 100,
  },
  {
    name: "Inches",
    abbreviation: "in",
    type: "distance",
    convertFunction: (meters) => Math.round(meters * 39.3701 * 100) / 100,
  },
  {
    name: "Square Meter",
    abbreviation: "sq m",
    type: "area",
    convertFunction: (meters) => Math.round(meters * 100) / 100,
  },
  {
    name: "Hectare",
    abbreviation: "ha",
    type: "area",
    convertFunction: (meters) => Math.round((meters / 10000) * 100) / 100,
  },
  {
    name: "Acre",
    abbreviation: "ac",
    type: "area",
    convertFunction: (meters) => Math.round((meters / 4046.856) * 100) / 100,
  },
  {
    name: "Square Km",
    abbreviation: "sq km",
    type: "area",
    convertFunction: (meters) => Math.round((meters / 1000000) * 100) / 100,
  },
  {
    name: "Square Feet",
    abbreviation: "sq ft",
    type: "area",
    convertFunction: (meters) => Math.round(meters * 10.764 * 100) / 100,
  },
  {
    name: "Square Yard",
    abbreviation: "sq yard",
    type: "area",
    convertFunction: (meters) => Math.round(meters * 1.196 * 100) / 100,
  },
  {
    name: "Square Inches",
    abbreviation: "sq in",
    type: "area",
    convertFunction: (meters) => Math.round(meters * 1550.003 * 100) / 100,
  },
  {
    name: "Degrees",
    abbreviation: "deg",
    type: "bearing",
    convertFunction: (meters) => meters,
  },
];

export default function MeasureTool({ name = "Measure", helpLink, hideHeader = false, onClose, onSidebarVisibility }: MeasureToolProps) {
  // Stores
  const { map, activeToolId, setActiveToolId } = useMapStore();
  const isDrawingOrEditing = activeToolId === "mymaps-draw" || activeToolId === "mymaps-edit" || activeToolId === "mymaps-eraser";
  const { hide: hidePopup } = usePopupStore();

  // State
  const [hideTooltips, setHideTooltips] = useState(false);
  const [enableSnapping, setEnableSnapping] = useState(false);
  const [geometryType, setGeometryType] = useState<GeometryType>("");
  const [unitType, setUnitType] = useState<UnitType>("distance");
  const [unitMeters, setUnitMeters] = useState<number | string>(-1);
  const [feature, setFeature] = useState<Feature<Geometry> | null>(null);
  const [activeTool, setActiveTool] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // Refs for OpenLayers objects and IDs
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const drawRef = useRef<Draw | null>(null);
  const snapRef = useRef<Snap | null>(null);
  const sketchRef = useRef<Feature<Geometry> | null>(null);
  const listenerRef = useRef<EventsKey | null>(null);
  const pointerMoveEventRef = useRef<EventsKey | null>(null);
  const mouseOutEventRef = useRef<(() => void) | null>(null);
  const helpTooltipRef = useRef<Overlay | null>(null);
  const measureTooltipRef = useRef<Overlay | null>(null);
  const helpTooltipElementRef = useRef<HTMLDivElement | null>(null);
  const measureTooltipElementRef = useRef<HTMLDivElement | null>(null);
  const layerIdRef = useRef<string | null>(null);
  const activeToolRef = useRef(false);
  const hideTooltipsRef = useRef(false);
  const geometryTypeRef = useRef<GeometryType>("");
  const enableSnappingRef = useRef(false);

  // Keep refs in sync with state
  activeToolRef.current = activeTool;
  hideTooltipsRef.current = hideTooltips;
  geometryTypeRef.current = geometryType;
  enableSnappingRef.current = enableSnapping;

  // Tooltip messages
  const continuePolygonMsg = "Click to continue drawing the polygon";
  const continueLineMsg = "Click to continue drawing the line";
  const continueCircleMsg = "Move pointer to size the circle";
  const continueRectangleMsg = "Move pointer to size the rectangle";

  // Get all visible vector sources for snapping
  const getVisibleVectorSources = useCallback((): VectorSource[] => {
    if (!map) return [];
    const sources: VectorSource[] = [];
    const layers = map.getLayers().getArray();

    layers.forEach((layer) => {
      if (layer === vectorLayerRef.current) return;
      if (layer.getVisible() && "getSource" in layer) {
        const source = (layer as VectorLayer<VectorSource>).getSource();
        if (source instanceof VectorSource) {
          sources.push(source);
        }
      }
    });

    return sources;
  }, [map]);

  // Format length output
  const formatLength = useCallback((line: LineString): string => {
    const length = getLength(line);
    let output: string;
    if (length > 100) {
      output = Math.round((length / 1000) * 100) / 100 + " km";
    } else {
      output = Math.round(length * 100) / 100 + " m";
    }
    setUnitMeters(length);
    return output;
  }, []);

  // Format area output
  const formatArea = useCallback((polygon: Polygon): string => {
    const area = getArea(polygon);
    let output: string;
    if (area > 10000) {
      output = Math.round((area / 1000000) * 100) / 100 + " km²";
    } else {
      output = Math.round(area * 100) / 100 + " m²";
    }
    setUnitMeters(area);
    return output;
  }, []);

  // Format circle area
  const formatCircle = useCallback((circle: Circle): string => {
    const polygon = fromCircle(circle);
    const area = getArea(polygon);
    let output: string;
    if (area > 15800000) {
      output = "r : " + Math.round((Math.sqrt(area / Math.PI) / 1000) * 100) / 100 + " km";
    } else {
      output = "r : " + Math.round(Math.sqrt(area / Math.PI) * 100) / 100 + " m";
    }
    setUnitMeters(area);
    return output;
  }, []);

  // Mouse out event handler
  const onMouseOutEvent = useCallback(() => {
    if (helpTooltipElementRef.current) helpTooltipElementRef.current.className = "hidden";
  }, []);

  // Pointer move handler
  const pointerMoveHandler = useCallback((evt: { dragging: boolean; coordinate: Coordinate }) => {
    if (evt.dragging || !activeToolRef.current) {
      if (measureTooltipElementRef.current) measureTooltipElementRef.current.className = "hidden";
      if (helpTooltipElementRef.current) helpTooltipElementRef.current.className = "hidden";
      return;
    }

    let helpMsg = "Click to start drawing";
    if (sketchRef.current) {
      switch (geometryTypeRef.current) {
        case "Polygon":
          helpMsg = continuePolygonMsg;
          break;
        case "LineString":
          helpMsg = continueLineMsg;
          break;
        case "Circle":
          helpMsg = continueCircleMsg;
          break;
        case "Rectangle":
          helpMsg = continueRectangleMsg;
          break;
        case "Bearing":
          helpMsg = continueLineMsg;
          break;
      }
    }

    if (helpTooltipElementRef.current) {
      helpTooltipElementRef.current.innerHTML = helpMsg;
    }
    if (helpTooltipRef.current) {
      helpTooltipRef.current.setPosition(evt.coordinate);
    }

    if (!hideTooltipsRef.current) {
      if (helpTooltipElementRef.current) helpTooltipElementRef.current.className = "measure-tooltip-help";
      if (measureTooltipElementRef.current) measureTooltipElementRef.current.className = "measure-tooltip";
    } else {
      if (helpTooltipElementRef.current) helpTooltipElementRef.current.className = "hidden";
      if (measureTooltipElementRef.current) measureTooltipElementRef.current.className = "hidden";
    }
  }, []);

  // Reset function
  const reset = useCallback(() => {
    if (!map) return;

    if (drawRef.current) {
      useInteractionManagerStore.getState().unregisterInteraction("measure-draw");
      drawRef.current = null;
    }
    if (snapRef.current) {
      useInteractionManagerStore.getState().unregisterInteraction("measure-snap");
      snapRef.current = null;
    }
    if (vectorLayerRef.current) {
      vectorLayerRef.current.getSource()?.clear();
    }
    if (listenerRef.current) {
      unByKey(listenerRef.current);
      listenerRef.current = null;
    }

    if (measureTooltipElementRef.current) measureTooltipElementRef.current.className = "hidden";
    if (helpTooltipElementRef.current) helpTooltipElementRef.current.className = "hidden";
    setActiveTool(false);
    setIsDrawing(false);
    setFeature(null);

    // Only release the active tool ID if this tool owns it
    if (useMapStore.getState().activeToolId === "measure") {
      setActiveToolId(null);
    }
  }, [map, setActiveToolId]);

  // Add interaction
  const addInteraction = useCallback(() => {
    if (!map) return;

    setUnitMeters(-1);

    // Clean up existing interactions
    if (drawRef.current) {
      useInteractionManagerStore.getState().unregisterInteraction("measure-draw");
      drawRef.current = null;
    }
    if (snapRef.current) {
      useInteractionManagerStore.getState().unregisterInteraction("measure-snap");
      snapRef.current = null;
    }
    if (vectorSourceRef.current) {
      vectorSourceRef.current.clear();
    }

    if (isDrawingOrEditing) {
      showMessage("Measure", "Active MyMaps drawing in progress. Please finish your MyMaps and try again.", "warning", 3000);
      setGeometryType("Clear");
      return;
    }

    // Disable parcel click
    setActiveToolId("measure");
    if (helpTooltipElementRef.current) helpTooltipElementRef.current.className = "measure-tooltip-help";
    setActiveTool(true);

    // Set up pointer move event
    if (pointerMoveEventRef.current) {
      unByKey(pointerMoveEventRef.current);
    }
    pointerMoveEventRef.current = map.on("pointermove", pointerMoveHandler);

    // Set up mouse out event
    const viewport = map.getViewport();
    if (mouseOutEventRef.current) {
      viewport.removeEventListener("mouseout", mouseOutEventRef.current);
    }
    mouseOutEventRef.current = onMouseOutEvent;
    viewport.addEventListener("mouseout", onMouseOutEvent);

    // Determine draw type
    let drawType: "LineString" | "Polygon" | "Circle" | "Point" = "LineString";
    if (geometryType === "Rectangle") {
      drawType = "Circle"; // Uses createBox geometry function
    } else if (geometryType === "Polygon") {
      drawType = "Polygon";
    } else if (geometryType === "Circle") {
      drawType = "Circle";
    } else if (geometryType === "Bearing" || geometryType === "LineString") {
      drawType = "LineString";
    }

    // Create draw interaction
    const draw = new Draw({
      source: vectorSourceRef.current!,
      type: drawType,
      geometryFunction: geometryType === "Rectangle" ? createBox() : undefined,
      style: new Style({
        fill: new Fill({
          color: "rgba(255, 255, 255, 0.2)",
        }),
        stroke: new Stroke({
          color: "#1346AD",
          width: 3,
        }),
        image: new CircleStyle({
          radius: 5,
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 0.7)",
          }),
          fill: new Fill({
            color: "rgba(255, 255, 255, 0.2)",
          }),
        }),
      }),
      maxPoints: geometryType === "Bearing" ? 2 : undefined,
    });

    // Draw start event
    draw.on("drawstart", (evt) => {
      hidePopup();
      setActiveToolId("measure");
      vectorSourceRef.current?.clear();
      setIsDrawing(true);
      setFeature(evt.feature);
      sketchRef.current = evt.feature;

      let tooltipCoord: Coordinate = [0, 0];

      listenerRef.current = sketchRef.current.getGeometry()!.on("change", (changeEvt) => {
        const geom = changeEvt.target;
        let output: string;

        if (geom instanceof Polygon) {
          output = formatArea(geom);
          tooltipCoord = geom.getInteriorPoint().getCoordinates();
        } else if (geom instanceof LineString) {
          if (geometryType === "Bearing") {
            const bearing = getBearing(geom.getFirstCoordinate(), geom.getLastCoordinate());
            output = String(bearing);
            setUnitMeters(bearing);
          } else {
            output = formatLength(geom);
          }
          tooltipCoord = geom.getLastCoordinate();
        } else if (geom instanceof Circle) {
          output = formatCircle(geom);
          tooltipCoord = geom.getLastCoordinate();
        } else {
          output = "";
        }

        if (measureTooltipElementRef.current) {
          measureTooltipElementRef.current.innerHTML = output;
        }
        if (measureTooltipRef.current) {
          measureTooltipRef.current.setPosition(tooltipCoord);
        }

        if (!hideTooltipsRef.current && measureTooltipElementRef.current) {
          measureTooltipElementRef.current.className = "measure-tooltip";
        } else if (measureTooltipElementRef.current) {
          measureTooltipElementRef.current.className = "hidden";
        }
      });
    });

    // Draw end event
    draw.on("drawend", () => {
      if (measureTooltipElementRef.current) {
        measureTooltipElementRef.current.innerHTML = "";
      }
      if (measureTooltipRef.current) {
        measureTooltipRef.current.setPosition(undefined);
      }
      if (measureTooltipElementRef.current) measureTooltipElementRef.current.className = "hidden";
      setIsDrawing(false);
      setFeature(sketchRef.current);
      sketchRef.current = null;

      if (listenerRef.current) {
        unByKey(listenerRef.current);
        listenerRef.current = null;
      }
    });

    useInteractionManagerStore.getState().registerInteraction("measure-draw", draw, "measure");
    drawRef.current = draw;

    // Add snap interaction if enabled
    if (enableSnappingRef.current) {
      const snapSources = getVisibleVectorSources();
      if (snapSources.length > 0) {
        const combinedSource = new VectorSource();
        snapSources.forEach((source) => {
          source.getFeatures().forEach((f) => {
            combinedSource.addFeature(f.clone());
          });
        });

        const snap = new Snap({
          source: combinedSource,
          edge: true,
          vertex: true,
          pixelTolerance: 15,
        });
        useInteractionManagerStore.getState().registerInteraction("measure-snap", snap, "measure");
        snapRef.current = snap;
      }
    }
  }, [map, geometryType, isDrawingOrEditing, setActiveToolId, hidePopup, formatLength, formatArea, formatCircle, pointerMoveHandler, onMouseOutEvent, getVisibleVectorSources]);

  // Handle geometry button click
  const onGeometryButtonClick = useCallback(
    (type: GeometryType, newUnitType: UnitType) => {
      if (type === "Clear") {
        reset();
        setGeometryType(type);
        setUnitType(newUnitType);
        // reset() already guards this, but guard here too in case reset() is skipped
        if (useMapStore.getState().activeToolId === "measure") {
          setActiveToolId(null);
        }
      } else {
        setGeometryType(type);
        setUnitType(newUnitType);
      }
    },
    [reset, setActiveToolId],
  );

  // Handle snapping checkbox change
  const onSnappingCheckboxChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      const newEnableSnapping = evt.target.checked;
      setEnableSnapping(newEnableSnapping);

      if (!map || !activeTool) return;

      if (newEnableSnapping) {
        // Add snap interaction
        const snapSources = getVisibleVectorSources();
        if (snapSources.length > 0) {
          const combinedSource = new VectorSource();
          snapSources.forEach((source) => {
            source.getFeatures().forEach((f) => {
              combinedSource.addFeature(f.clone());
            });
          });

          const snap = new Snap({
            source: combinedSource,
            edge: true,
            vertex: true,
            pixelTolerance: 15,
          });
          useInteractionManagerStore.getState().registerInteraction("measure-snap", snap, "measure");
          snapRef.current = snap;
        }
      } else {
        // Remove snap interaction
        if (snapRef.current) {
          useInteractionManagerStore.getState().unregisterInteraction("measure-snap");
          snapRef.current = null;
        }
      }
    },
    [map, activeTool, getVisibleVectorSources],
  );

  // Add to MyMaps
  const addToMyMaps = useCallback(
    (featureToAdd: Feature<Geometry>, label: string) => {
      const featureStyle = featureToAdd.getStyle();
      const myMapsItem = createMyMapsItem(featureToAdd, "Buffer", label, featureStyle instanceof Style ? styleToJSON(featureStyle) : undefined);
      myMapsItem.featureGeoJSON = featureToGeoJSON(featureToAdd);
      useMyMapsStore.getState().addItem(myMapsItem);
      useEventStore.getState().emit("mymap-item-created", { item: myMapsItem });
      showMessage("My Maps", `"${label}" has been added to My Maps.`, "success", 3000);
      // Reset interaction if user is still measuring to prevent error after click
      if (activeTool && geometryType !== "" && geometryType !== "Clear") {
        addInteraction();
      }
    },
    [activeTool, geometryType, addInteraction],
  );

  // Initialize vector layer and tooltips
  useEffect(() => {
    if (!map) return;

    // Create vector source and layer
    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      zIndex: 500,
      style: new Style({
        fill: new Fill({
          color: "rgba(255, 255, 255, 0.2)",
        }),
        stroke: new Stroke({
          color: "#1346AD",
          width: 3,
        }),
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: "#ffcc33",
          }),
        }),
      }),
    });
    vectorLayerRef.current = vectorLayer;
    const measureLayerId = LayerManager.addLayer(vectorLayer, "Tools", "Measure", { visible: true });
    layerIdRef.current = measureLayerId;

    // Create help tooltip element imperatively (not via JSX) so OL can own the DOM node
    const helpTooltipElement = document.createElement("div");
    helpTooltipElement.className = "hidden";
    helpTooltipElementRef.current = helpTooltipElement;

    const helpTooltip = new Overlay({
      element: helpTooltipElement,
      offset: [15, 0],
      positioning: "center-left",
      stopEvent: false,
    });
    helpTooltipRef.current = helpTooltip;
    LayerManager.addOverlay("measure-help-tooltip", helpTooltip);

    // Create measure tooltip element imperatively
    const measureTooltipElement = document.createElement("div");
    measureTooltipElement.className = "hidden";
    measureTooltipElementRef.current = measureTooltipElement;

    const measureTooltip = new Overlay({
      element: measureTooltipElement,
      offset: [0, -15],
      positioning: "bottom-center",
      stopEvent: false,
    });
    measureTooltipRef.current = measureTooltip;
    LayerManager.addOverlay("measure-tooltip", measureTooltip);

    // Cleanup
    return () => {
      LayerManager.removeOverlay("measure-help-tooltip");
      LayerManager.removeOverlay("measure-tooltip");
      helpTooltipElementRef.current = null;
      measureTooltipElementRef.current = null;
      helpTooltipRef.current = null;
      measureTooltipRef.current = null;
      if (listenerRef.current) {
        unByKey(listenerRef.current);
      }
      if (pointerMoveEventRef.current) {
        unByKey(pointerMoveEventRef.current);
      }
      if (mouseOutEventRef.current) {
        map.getViewport().removeEventListener("mouseout", mouseOutEventRef.current);
      }
      // Clean up interactions via centralized store
      useInteractionManagerStore.getState().unregisterAllByOwner("measure");
      drawRef.current = null;
      snapRef.current = null;
      if (vectorSourceRef.current) {
        vectorSourceRef.current.clear();
      }
      if (layerIdRef.current) {
        LayerManager.removeLayer(layerIdRef.current);
        layerIdRef.current = null;
      }
      // Only release the active tool ID if this tool owns it — don't stomp
      // on another tool's ID (e.g. MyMaps drawing started after measure closed)
      if (useMapStore.getState().activeToolId === "measure") {
        setActiveToolId(null);
      }
    };
  }, [map, setActiveToolId]);

  // Trigger addInteraction when geometry type changes
  useEffect(() => {
    if (geometryType && geometryType !== "Clear" && map) {
      addInteraction();
    }
  }, [geometryType, map, addInteraction]);

  // Get converted value for display
  const getConvertedValue = useCallback(
    (unit: UnitDefinition): string => {
      if (unitMeters === -1) return "";
      const result = unit.convertFunction(typeof unitMeters === "number" ? unitMeters : parseFloat(unitMeters as string));
      return String(result);
    },
    [unitMeters],
  );

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={onClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="relative w-full overflow-auto text-base-content">
        <p className="p-3 text-sm">Please select the type of measurements you wish to perform from the toolbar below. Use the line tools for distances and polygon tools for area.</p>

        {/* HEADER WITH TITLE AND OPTIONS */}
        <div className="flex items-center justify-between px-3 mb-2">
          <h3 className="font-semibold text-sm">Measure Tools</h3>
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" className="checkbox checkbox-xs" onChange={onSnappingCheckboxChange} checked={enableSnapping} />
              <span>Snapping</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" className="checkbox checkbox-xs" onChange={(e) => setHideTooltips(e.target.checked)} checked={hideTooltips} />
              <span>Hide Tooltips</span>
            </label>
          </div>
        </div>

        {/* BUTTON BAR */}
        <div className="flex justify-center gap-1 mx-2 mb-4 p-1 bg-base-200 rounded-lg shadow">
          {measureButtons.map((btn) => {
            const IconComponent = btn.icon;
            const isActive = geometryType === btn.type;
            return (
              <button key={btn.type} className={`btn btn-square btn-sm ${isActive ? "btn-primary" : "btn-ghost"}`} title={btn.title} onClick={() => onGeometryButtonClick(btn.type, btn.unitType)}>
                <IconComponent size={18} />
              </button>
            );
          })}
        </div>

        <h3 className="font-semibold text-sm px-3 mb-2">Measure Results</h3>

        {/* INTRO MESSAGE */}
        <p className={`p-3 text-sm text-base-content/70 ${geometryType === "" || geometryType === "Clear" ? "" : "hidden"}`}>
          There are currently no measurements to display. Please select a tool from above to start your measurements. Results will display in this area.
        </p>

        {/* RESULTS */}
        <div className={`flex flex-col gap-2 px-2 ${geometryType === "" || geometryType === "Clear" ? "hidden" : ""}`}>
          {unitList
            .filter((unit) => unit.type === unitType)
            .map((unit) => (
              <MeasureResult key={unit.abbreviation} unitDetails={unit} feature={feature} addToMyMaps={addToMyMaps} getConvertedValue={getConvertedValue} isMeasuring={isDrawing} />
            ))}
        </div>
      </div>
    </PanelComponent>
  );
}

// MeasureResult sub-component
interface MeasureResultProps {
  unitDetails: UnitDefinition;
  feature: Feature<Geometry> | null;
  addToMyMaps: (feature: Feature<Geometry>, label: string) => void;
  getConvertedValue: (unit: UnitDefinition) => string;
  isMeasuring: boolean;
}

function MeasureResult({ unitDetails, feature, addToMyMaps, getConvertedValue, isMeasuring }: MeasureResultProps) {
  const displayValue = getConvertedValue(unitDetails);

  const handleAddToMyMaps = () => {
    if (feature) {
      addToMyMaps(feature, `${displayValue} ${unitDetails.abbreviation}`);
    }
  };

  return (
    <div className="card card-compact bg-base-100 border border-base-300 hover:border-primary/50 transition-colors">
      <div className="card-body p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
          <span className="font-medium text-sm">{unitDetails.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <input readOnly className="input input-bordered input-sm flex-1 text-center text-primary font-medium" placeholder="Waiting..." type="text" value={displayValue} />
          <span className="text-xs text-base-content/70 w-12">{unitDetails.abbreviation}</span>
        </div>

        {feature !== null && !isMeasuring && (
          <button className="link link-primary text-xs mt-1 self-start" onClick={handleAddToMyMaps}>
            Add to My Maps
          </button>
        )}
      </div>
    </div>
  );
}
