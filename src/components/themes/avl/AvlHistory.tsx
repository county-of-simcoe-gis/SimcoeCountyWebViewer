"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import Collapsible from "react-collapsible";
import { List } from "react-virtualized";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Circle as CircleStyle, Fill, Stroke, Style, Icon } from "ol/style";
import { transformExtent } from "ol/proj";
import { unByKey } from "ol/Observable";
import type { EventsKey } from "ol/events";

import { useAvlStore } from "@/stores/avlStore";
import { useMapStore } from "@/stores/mapStore";
import { useAvlApi } from "./hooks/useAvlApi";
import { useGeoTab } from "./hooks/useGeoTab";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import AvlHistoryVehicle from "./components/AvlHistoryVehicle";
import { toWebMercatorFromLatLong, getFriendlyDateString, roundTime, download } from "./utils/avlHelpers";
import { avlGroupDropDownStyles, avlVehicleDropDownStyles, avlSpeedOperatorDropDownStyles, avlSpeedDropDownStyles, avlHistorySliderWrapperStyle, avlHistoryMarks } from "./utils/avlStyles";
import type { AvlHistoryProps, AvlHistoryVehicle as AvlHistoryVehicleType, AvlVehicle, SelectOption, SpeedOperatorOption, GroupSelectOption } from "./types/avl.types";
import "./styles/AvlHistory.css";

// Image helper
const getImagePath = (imageName: string): string => `/images/avl/${imageName}`;

// Group options
const GROUPS: GroupSelectOption[] = [
  { key: "avl_roads", label: "Roads", value: "Roads" },
  { key: "avl_roads", label: "Roads GeoTab", value: "Roads GeoTab", isGeoTabDevice: true, geoTabAPIKey: "roads" },
  { key: "avl_solid_waste", label: "Solid Waste", value: "Solid Waste" },
  { key: "avl_solid_waste", label: "Solid Waste GeoTab", value: "Solid Waste GeoTab", isGeoTabDevice: true, geoTabAPIKey: "solid_waste" },
  { key: "avl_waste_contractor", label: "Waste Contractor", value: "Waste Contractor", isGeoTabDevice: true, geoTabAPIKey: "waste_contractor" },
  { key: "avl_roads_spreader", label: "Roads (Spreader)", value: "Roads (Spreader)" },
  { key: "avl_oro_roads_spreader", label: "Oro-Medonte Roads (Spreader)", value: "Oro Medonte Roads" },
  { key: "avl_severn_roads", label: "Severn", value: "Severn", isGeoTabDevice: true, geoTabAPIKey: "severn_roads" },
  { key: "avl_innisfil_roads", label: "Innisfil", value: "Innisfil", isGeoTabDevice: true, geoTabAPIKey: "innisfil_roads" },
];

const SPEED_OPERATORS: SpeedOperatorOption[] = [
  { label: ">=", value: ">=" },
  { label: "<=", value: "<=" },
  { label: ">", value: ">" },
  { label: "<", value: "<" },
  { label: "=", value: "=" },
];

const ALL_VEHICLES_OPTION: SelectOption = { label: "All Vehicles", value: "All Vehicles" };
const ALL_TYPES_OPTION: SelectOption = { label: "All Types", value: "All Types" };

const getInitialStartDate = (): Date => roundTime(new Date(Date.now() - 3 * 60 * 60 * 1000));
const getInitialEndDate = (): Date => roundTime(new Date());

export default function AvlHistory({ historyVehicle, onHistoryVehicleConsumed }: AvlHistoryProps) {
  const { map } = useMapStore();
  const { allowedGroups, configGroups } = useAvlStore();
  const { fetchAllVehicles, fetchHistory, fetchHistorySpreader } = useAvlApi();
  const { groupHasGeoTabSpreaderData } = useGeoTab();

  // State
  const [groupOptions, setGroupOptions] = useState<GroupSelectOption[]>([]);
  const [selectedGroupOption, setSelectedGroupOption] = useState<GroupSelectOption | null>(null);
  const [selectedVehicleTypeOption, setSelectedVehicleTypeOption] = useState<SelectOption>(ALL_TYPES_OPTION);
  const [selectedVehicleOption, setSelectedVehicleOption] = useState<SelectOption | null>(ALL_VEHICLES_OPTION);
  const [allVehicles, setAllVehicles] = useState<AvlVehicle[]>([]);
  const [startDate, setStartDate] = useState<Date>(getInitialStartDate());
  const [endDate, setEndDate] = useState<Date>(getInitialEndDate());
  const [selectedSpeedOperator, setSelectedSpeedOperator] = useState<SpeedOperatorOption>(SPEED_OPERATORS[0]);
  const [selectedSpeed, setSelectedSpeed] = useState<SelectOption<number>>({ label: "0", value: 0 });
  const [speedOptions, setSpeedOptions] = useState<SelectOption<number>[]>([]);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [onlyVisibleExtent, setOnlyVisibleExtent] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<AvlHistoryVehicleType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tooManyRecords, setTooManyRecords] = useState<boolean>(false);
  const [zeroRecords, setZeroRecords] = useState<boolean>(false);
  const [showLegendTooltip, setShowLegendTooltip] = useState<boolean>(false);

  // Refs
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const shadowLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const mapClickEventRef = useRef<EventsKey | null>(null);
  const layerIdRef = useRef<string | null>(null);
  const shadowLayerIdRef = useRef<string | null>(null);

  // Initialize
  useEffect(() => {
    if (!map) return;

    const speeds: SelectOption<number>[] = [];
    for (let i = 0; i < 141; i++) {
      speeds.push({ label: String(i), value: i });
    }
    setSpeedOptions(speeds);

    const allowed = GROUPS.filter((g) => allowedGroups.includes(g.label));
    setGroupOptions(allowed);
    if (allowed.length > 0) {
      setSelectedGroupOption(allowed[0]);
    }

    fetchVehicles();
    initLayers();
    createShadowLayer();

    return () => {
      // Use LayerManager for cleanup
      if (layerIdRef.current) {
        LayerManager.removeLayer(layerIdRef.current);
      }
      if (shadowLayerIdRef.current) {
        LayerManager.removeLayer(shadowLayerIdRef.current);
      }
      if (mapClickEventRef.current) {
        unByKey(mapClickEventRef.current);
      }
    };
  }, [map, allowedGroups]);

  useEffect(() => {
    if (historyVehicle && selectedVehicleOption?.value !== historyVehicle.vehicle_name) {
      const matchingGroup = groupOptions.find((g) => g.value === historyVehicle.grouping);
      const groupOption = matchingGroup || { label: historyVehicle.grouping, value: historyVehicle.grouping };

      setSelectedGroupOption(groupOption);
      setSelectedVehicleTypeOption(ALL_TYPES_OPTION);
      setSelectedVehicleOption({
        label: historyVehicle.vehicle_name,
        value: historyVehicle.vehicle_name,
      });

      onHistoryVehicleConsumed?.();
    }
  }, [historyVehicle, groupOptions, selectedVehicleOption, onHistoryVehicleConsumed]);

  const fetchVehicles = useCallback(async () => {
    const result = await fetchAllVehicles();
    if (result && result.length > 0) {
      const vehicles = result.map((v) => ({
        ...v,
        vehicle_name: v.vehicle_id,
        label: v.vehicle_id,
        value: v.vehicle_id,
      })) as AvlVehicle[];
      setAllVehicles(vehicles);
    }
  }, [fetchAllVehicles]);

  const initLayers = useCallback(() => {
    console.log("[AVL History] initLayers called, map:", !!map, "layerRef.current:", !!layerRef.current);
    if (!map || layerRef.current) return;

    const layer = new VectorLayer({
      source: new VectorSource({ features: [] }),
      zIndex: 10000, // Set high zIndex explicitly
    });
    layer.setProperties({ disableParcelClick: true, name: "avlHistory" });

    // Use LayerManager to add layer with "Overlay" category for highest z-index
    const layerId = LayerManager.addLayer(layer, "Overlay", "AVL History Vehicles", {
      userAdded: true,
    });
    console.log("[AVL History] Layer added with ID:", layerId, "zIndex:", layer.getZIndex());
    layerIdRef.current = layerId;
    layerRef.current = layer;

    mapClickEventRef.current = map.on("singleclick", (evt) => {
      map.forEachFeatureAtPixel(
        evt.pixel,
        (feature) => {
          const vehicleInfo = (feature as Feature & { vehicleInfo?: AvlHistoryVehicleType }).vehicleInfo;
          if (vehicleInfo) {
            console.log("Show popup for history vehicle:", vehicleInfo.vehicle_name);
          }
        },
        {
          layerFilter: (layer) => layer.get("name") === "avlHistory" && layer.getVisible() && layer instanceof VectorLayer,
        },
      );
    });
  }, [map]);

  const createShadowLayer = useCallback(() => {
    if (!map || shadowLayerRef.current) return;

    const shadowStyle = new Style({
      stroke: new Stroke({ color: [0, 255, 255, 0.3], width: 6 }),
      fill: new Fill({ color: [0, 255, 255, 0.3] }),
      image: new CircleStyle({
        radius: 10,
        stroke: new Stroke({ color: [0, 255, 255, 0.3], width: 8 }),
        fill: new Fill({ color: [0, 255, 255, 0.3] }),
      }),
    });

    const layer = new VectorLayer({
      source: new VectorSource({ features: [] }),
      style: shadowStyle,
    });

    // Use LayerManager with "Overlay" category - shadow should be on top of history points
    const shadowLayerId = LayerManager.addLayer(layer, "Overlay", "AVL History Shadow", {
      userAdded: true,
    });
    shadowLayerIdRef.current = shadowLayerId;
    shadowLayerRef.current = layer;
  }, [map]);

  const getVehiclesByGroup = useCallback((): SelectOption[] => {
    let filtered: AvlVehicle[] = [];

    if (selectedGroupOption) {
      filtered = allVehicles.filter(
        (v) =>
          v.grouping?.toUpperCase() === selectedGroupOption.value.toUpperCase() ||
          (selectedGroupOption.value.toUpperCase() === "ROADS (SPREADER)" && v.grouping?.toUpperCase() === "ROADS" && v.device_id),
      );
    }

    if (selectedVehicleTypeOption.value !== "All Types") {
      filtered = filtered.filter((v) => v.subgrouping === selectedVehicleTypeOption.value);
    }

    filtered.sort((a, b) => {
      const numA = parseInt(a.vehicle_name);
      const numB = parseInt(b.vehicle_name);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.vehicle_name.localeCompare(b.vehicle_name);
    });

    const options: SelectOption[] = filtered.map((v) => ({
      label: v.vehicle_name,
      value: v.vehicle_name,
    }));
    options.unshift(ALL_VEHICLES_OPTION);
    return options;
  }, [allVehicles, selectedGroupOption, selectedVehicleTypeOption]);

  const getVehicleTypes = useCallback((): SelectOption[] => {
    const types: SelectOption[] = [ALL_TYPES_OPTION];
    if (selectedGroupOption) {
      const configGroup = configGroups.find((g) => g.name === selectedGroupOption.value);
      if (configGroup?.subGroups) {
        configGroup.subGroups
          .map((sg) => sg.name)
          .sort()
          .forEach((name) => {
            types.push({ label: name, value: name });
          });
      }
    }
    return types;
  }, [selectedGroupOption, configGroups]);

  const handleSearch = useCallback(async () => {
    if (!selectedGroupOption || !selectedVehicleOption) return;

    setIsLoading(true);
    setSearchResults([]);
    setTooManyRecords(false);
    setZeroRecords(false);

    let extent = "";
    if (onlyVisibleExtent && map) {
      const mapExtent = map.getView().calculateExtent(map.getSize());
      const extentWgs84 = transformExtent(mapExtent, "EPSG:3857", "EPSG:4326");
      const ymax = extentWgs84[0];
      const xmin = extentWgs84[1];
      const ymin = extentWgs84[2];
      const xmax = extentWgs84[3];
      extent = `${ymin} ${xmin},${ymin} ${xmax},${ymax} ${xmax},${ymin} ${xmin},${ymin} ${xmin}`;
    }

    const isSpreader = selectedGroupOption.value === "Roads (Spreader)" || selectedGroupOption.value === "Oro Medonte Roads";
    const group = isSpreader && selectedGroupOption.value === "Roads (Spreader)" ? "Roads" : selectedGroupOption.value;

    const params = {
      fromDate: startDate,
      toDate: endDate,
      group,
      vehicleId: selectedVehicleOption.value,
      speedOperator: selectedSpeedOperator.value,
      speed: selectedSpeed.value,
      simplifyFactor: sliderValue + 1,
      extent: extent || undefined,
    };

    try {
      const result = isSpreader ? await fetchHistorySpreader(params) : await fetchHistory(params);

      const tooMany = result.length >= 5000;
      setTooManyRecords(tooMany);
      setZeroRecords(result.length === 0);
      setSearchResults(result as AvlHistoryVehicleType[]);
      displayResults(result as AvlHistoryVehicleType[]);
    } catch (error) {
      console.error("Error fetching history:", error);
      setZeroRecords(true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGroupOption, selectedVehicleOption, startDate, endDate, selectedSpeedOperator, selectedSpeed, sliderValue, onlyVisibleExtent, map, fetchHistory, fetchHistorySpreader]);

  const displayResults = useCallback(
    (results: AvlHistoryVehicleType[]) => {
      console.log("[AVL History] displayResults called with", results.length, "results");
      console.log("[AVL History] layerRef.current:", layerRef.current);
      console.log("[AVL History] map:", map);

      if (!layerRef.current || !map) {
        console.log("[AVL History] Missing layer or map, returning");
        return;
      }

      const source = layerRef.current.getSource();
      if (!source) {
        console.log("[AVL History] No source found on layer");
        return;
      }

      source.clear();

      if (results.length === 0) return;

      results.forEach((vehicle, index) => {
        const coords = toWebMercatorFromLatLong([vehicle.longitude, Math.abs(vehicle.latitude)]);
        const feature = new Feature(new Point(coords)) as Feature & { vehicleInfo: AvlHistoryVehicleType };
        feature.set("name", vehicle.vehicle_name);
        feature.vehicleInfo = vehicle;

        let iconName = "default.png"; // Use default.png which exists (lowercase)
        if (vehicle.PlowDown !== undefined) {
          if (vehicle.Blasting) iconName = "blasting.png";
          else if (vehicle.PlowDown && vehicle.DryOn) iconName = "plow-down-spreader-on.png";
          else if (vehicle.PlowDown && !vehicle.DryOn) iconName = "plow-down-spreader-off.png";
          else if (!vehicle.PlowDown && vehicle.DryOn) iconName = "plow-up-spreader-on.png";
        }

        if (index === 0) {
          console.log("[AVL History] First feature coords:", coords);
          console.log("[AVL History] Icon path:", getImagePath(iconName));
        }

        // Create icon style with fallback circle
        const iconStyle = new Style({
          image: new Icon({
            anchor: [0.5, 0.5],
            scale: 0.75,
            src: getImagePath(iconName),
            rotation: (vehicle.direction || 0) * (Math.PI / 180),
          }),
        });

        // Fallback circle style in case icon doesn't load
        const fallbackStyle = new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: "#FF0000" }),
            stroke: new Stroke({ color: "#FFFFFF", width: 2 }),
          }),
        });

        // Try icon first, use fallback if needed
        feature.setStyle([fallbackStyle, iconStyle]);
        source.addFeature(feature);
      });

      console.log("[AVL History] Added", source.getFeatures().length, "features to layer");
      console.log("[AVL History] Layer visible:", layerRef.current.getVisible());
      console.log("[AVL History] Layer zIndex:", layerRef.current.getZIndex());

      const extent = source.getExtent();
      console.log("[AVL History] Source extent:", extent);
      map.getView().fit(extent);
    },
    [map],
  );

  const handleVehicleClick = useCallback(
    (vehicle: AvlHistoryVehicleType) => {
      if (!map) return;
      const coords = toWebMercatorFromLatLong([vehicle.longitude, Math.abs(vehicle.latitude)]);
      map.getView().animate({ center: coords, zoom: 17 });
    },
    [map],
  );

  const handleVehicleMouseEnter = useCallback((vehicle: AvlHistoryVehicleType) => {
    if (!shadowLayerRef.current) return;
    const source = shadowLayerRef.current.getSource();
    if (!source) return;

    source.clear();
    const coords = toWebMercatorFromLatLong([vehicle.longitude, Math.abs(vehicle.latitude)]);
    const feature = new Feature(new Point(coords));
    source.addFeature(feature);
  }, []);

  const handleVehicleMouseLeave = useCallback(() => {
    if (!shadowLayerRef.current) return;
    shadowLayerRef.current.getSource()?.clear();
  }, []);

  const handleClear = useCallback(() => {
    layerRef.current?.getSource()?.clear();
    setSearchResults([]);
    setTooManyRecords(false);
    setZeroRecords(false);
  }, []);

  const handleExport = useCallback(() => {
    if (searchResults.length === 0) return;

    const vehicles = searchResults.map((v) => ({
      ...v,
      friendlyDate: getFriendlyDateString(new Date(v.date)),
    }));

    const fields = Object.keys(vehicles[0]);
    const csv = [fields.join(","), ...vehicles.map((row) => fields.map((field) => JSON.stringify((row as Record<string, unknown>)[field] ?? "")).join(","))].join("\r\n");

    download("data:text/csv;charset=utf-8," + encodeURIComponent(csv), "avl_export.csv");
  }, [searchResults]);

  const renderRow = useCallback(
    ({ index, key, style }: { index: number; key: string; style: React.CSSProperties }) => {
      const vehicle = searchResults[index];
      if (!vehicle) return <div key={key}>Null</div>;

      return (
        <li key={key} style={style} className="sc-theme-avl-history-list-item sc-noselect" onMouseEnter={() => handleVehicleMouseEnter(vehicle)} onMouseLeave={handleVehicleMouseLeave}>
          <AvlHistoryVehicle info={vehicle} onVechileClick={() => handleVehicleClick(vehicle)} />
        </li>
      );
    },
    [searchResults, handleVehicleClick, handleVehicleMouseEnter, handleVehicleMouseLeave],
  );

  const listHeight = typeof window !== "undefined" ? window.innerHeight - 245 : 400;
  const listWidth = typeof window !== "undefined" && window.innerWidth <= 350 ? 330 - (350 - window.innerWidth) : 330;

  return (
    <div className="sc-theme-avl-history-container">
      <Collapsible trigger="Search" open={true}>
        <div className="sc-container" style={{ marginTop: "5px" }}>
          <div className="sc-theme-avl-history-control-row">
            <label className="sc-theme-avl-history-label">Group:</label>
            <Select
              styles={avlGroupDropDownStyles}
              isSearchable={false}
              onChange={(option) => {
                setSelectedGroupOption(option);
                setSelectedVehicleTypeOption(ALL_TYPES_OPTION);
                setSelectedVehicleOption(ALL_VEHICLES_OPTION);
              }}
              options={groupOptions}
              value={selectedGroupOption}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            />
          </div>

          <div className="sc-theme-avl-history-control-row">
            <label className="sc-theme-avl-history-label">Type:</label>
            <Select
              styles={avlVehicleDropDownStyles}
              isSearchable={false}
              onChange={(option) => {
                if (option) {
                  setSelectedVehicleTypeOption(option);
                  setSelectedVehicleOption(ALL_VEHICLES_OPTION);
                }
              }}
              options={getVehicleTypes()}
              value={selectedVehicleTypeOption}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            />
          </div>

          <div className="sc-theme-avl-history-control-row">
            <label className="sc-theme-avl-history-label">Vehicle Id:</label>
            <Select
              styles={avlVehicleDropDownStyles}
              isSearchable={false}
              onChange={(option) => option && setSelectedVehicleOption(option)}
              options={getVehiclesByGroup()}
              value={selectedVehicleOption}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            />
          </div>

          <div className="sc-theme-avl-history-control-row">
            <label className="sc-theme-avl-history-label">From:</label>
            <DatePicker className="sc-input sc-theme-avl-history-date-picker" selected={startDate} onChange={(date) => date && setStartDate(date)} showTimeSelect dateFormat="MMMM d, yyyy h:mm aa" />
          </div>

          <div className="sc-theme-avl-history-control-row">
            <label className="sc-theme-avl-history-label">To:</label>
            <DatePicker className="sc-input sc-theme-avl-history-date-picker" selected={endDate} onChange={(date) => date && setEndDate(date)} showTimeSelect dateFormat="MMMM d, yyyy h:mm aa" />
          </div>

          <div className="sc-theme-avl-history-control-row">
            <label className="sc-theme-avl-history-label">Speed:</label>
            <Select
              styles={avlSpeedOperatorDropDownStyles}
              isSearchable={false}
              onChange={(option) => option && setSelectedSpeedOperator(option)}
              options={SPEED_OPERATORS}
              value={selectedSpeedOperator}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            />
            <Select
              styles={avlSpeedDropDownStyles}
              isSearchable={false}
              onChange={(option) => option && setSelectedSpeed(option)}
              options={speedOptions}
              value={selectedSpeed}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
            />
            <label className="sc-theme-avl-history-kph"> KPH</label>
          </div>

          <div className="sc-theme-avl-history-control-row">
            <label className="sc-theme-avl-history-label">Simplify:</label>
            <Slider style={avlHistorySliderWrapperStyle} marks={avlHistoryMarks} min={0} max={10} step={1} value={sliderValue} onChange={(value) => setSliderValue(value as number)} />
          </div>

          <div className="sc-theme-avl-history-only-visible-extent">
            <label>
              Only Visible Extent
              <input type="checkbox" onChange={(e) => setOnlyVisibleExtent(e.target.checked)} checked={onlyVisibleExtent} />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
          <button className={isLoading ? "sc-button sc-disabled" : "sc-button"} style={{ flex: 1, padding: "5px 2px" }} onClick={handleSearch} disabled={isLoading}>
            {isLoading ? "Searching..." : "Search"}
          </button>
          <button className="sc-button" style={{ flex: 1, padding: "5px 2px" }} onClick={handleClear}>
            Clear
          </button>
          <button className="sc-button" style={{ flex: 1, padding: "5px 2px" }} onClick={handleExport}>
            Export
          </button>
          {groupHasGeoTabSpreaderData(selectedGroupOption?.value || "") && (
            <button className="sc-button" style={{ flex: 1, padding: "5px 2px" }} onClick={() => setShowLegendTooltip(!showLegendTooltip)}>
              Legend
            </button>
          )}
        </div>
      </Collapsible>

      <Collapsible trigger={searchResults.length > 0 ? `Results (${searchResults.length} records)` : "Results"} open={true}>
        {tooManyRecords && <div className="sc-container sc-theme-avl-history-warning">Your search returned too many records. Only showing top 5000 records.</div>}
        {zeroRecords && <div className="sc-container sc-theme-avl-history-warning">Your search returned ZERO records. Please try again.</div>}
        {searchResults.length > 0 && (
          <div className="sc-container sc-theme-avl-history-results-container">
            <List id="sc-avl-history-virtual-layers" rowHeight={50} rowRenderer={renderRow} rowCount={searchResults.length} width={listWidth} height={listHeight} style={{ outline: "none" }} />
          </div>
        )}
      </Collapsible>

      {showLegendTooltip && <AVLLegendTooltip onClose={() => setShowLegendTooltip(false)} />}
    </div>
  );
}

function AVLLegendTooltip({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "150px",
        width: "300px",
        backgroundColor: "white",
        border: "1px solid #ccc",
        borderRadius: "4px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        padding: "10px",
        zIndex: 10000,
      }}
    >
      <div style={{ position: "relative" }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            background: "none",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
            color: "#666",
            fontWeight: "bold",
          }}
        >
          ×
        </button>
        <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>AVL Vehicle Legend</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { label: "Blasting", image: "blasting.png" },
            { label: "Plow Down Spreader On", image: "plow-down-spreader-on.png" },
            { label: "Plow Down Spreader Off", image: "plow-down-spreader-off.png" },
            { label: "Plow Up Spreader On", image: "plow-up-spreader-on.png" },
            { label: "Plow Up Spreader Off", image: "plow-up-spreader-off.png" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px" }}>{item.label}</span>
              <img src={getImagePath(item.image)} alt={item.label} style={{ height: "20px" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
