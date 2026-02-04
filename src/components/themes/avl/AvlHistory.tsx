"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
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
import { usePopupStore } from "@/stores/popupStore";
import { useAvlApi } from "./hooks/useAvlApi";
import { useGeoTab } from "./hooks/useGeoTab";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import AvlHistoryVehicle from "./components/AvlHistoryVehicle";
import AvlHistoryPopup from "./components/AvlHistoryPopup";
import { toWebMercatorFromLatLong, getFriendlyDateString, roundTime, download } from "./utils/avlHelpers";
import { avlGroupDropDownStyles, avlVehicleDropDownStyles, avlSpeedOperatorDropDownStyles, avlSpeedDropDownStyles, avlHistorySliderWrapperStyle, avlHistoryMarks } from "./utils/avlStyles";
import type { AvlHistoryProps, AvlHistoryVehicle as AvlHistoryVehicleType, AvlVehicle, SelectOption, SpeedOperatorOption, GroupSelectOption } from "./types/avl.types";
import "./styles/AvlHistory.css";

// Image helper
const getImagePath = (imageName: string): string => `/images/avl/${imageName}`;

/**
 * Convert a date string from the SQL API to actual UTC.
 * The SQL database stores dates in Eastern time, but the API serializes them with a 'Z' suffix.
 * For example, '2026-01-30T11:30:07.000Z' from the API is actually 11:30 AM EST, not 11:30 UTC.
 * To get the true UTC time, we need to ADD the timezone offset (EST = UTC-5).
 * So 11:30 EST = 16:30 UTC
 */
const convertSqlDateToActualUTC = (sqlDateString: string): string => {
  if (!sqlDateString) return sqlDateString;
  const date = new Date(sqlDateString);
  // SQL dates are stored in EST (UTC-5) but serialized as UTC
  // Add 5 hours to convert from "EST stored as UTC" to actual UTC
  const estOffsetMs = 5 * 60 * 60 * 1000;
  return new Date(date.getTime() + estOffsetMs).toISOString();
};

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
  const { allowedGroups, configGroups, geoTabCredentials, geoTabDevices } = useAvlStore();
  const { show: showPopup } = usePopupStore();
  const { fetchAllVehicles, fetchHistory, fetchHistorySpreader } = useAvlApi();
  const { groupHasGeoTabSpreaderData, fetchSpreaderData, isActiveAtTime, findClosestStatusValue, getDeviceIdForVehicle, authenticateGeoTab, fetchGeoTabDevices } = useGeoTab();

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
  const showPopupRef = useRef<((coords: number[], vehicleInfo: AvlHistoryVehicleType) => void) | null>(null);

  // Store the showPopup function in a ref to avoid stale closures in event handlers
  useEffect(() => {
    showPopupRef.current = (coords: number[], vehicleInfo: AvlHistoryVehicleType) => {
      showPopup(coords, <AvlHistoryPopup info={vehicleInfo} />, "AVL History");
    };
  }, [showPopup]);

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
        layerIdRef.current = null;
      }
      layerRef.current = null;
      if (shadowLayerIdRef.current) {
        LayerManager.removeLayer(shadowLayerIdRef.current);
        shadowLayerIdRef.current = null;
      }
      shadowLayerRef.current = null;
      if (mapClickEventRef.current) {
        unByKey(mapClickEventRef.current);
        mapClickEventRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    });
    layer.setProperties({ disableParcelClick: true, name: "avlHistory" });

    // Use LayerManager to add layer with "Overlay" category for highest z-index
    const layerId = LayerManager.addLayer(layer, "Overlay", "AVL History Vehicles", {
      id: "avl-history-layer",
    });

    if (!layerId) {
      console.error("[AVL History] LayerManager.addLayer returned null - adding directly to map");
      map.addLayer(layer);
    }

    console.log("[AVL History] Layer added with ID:", layerId, "zIndex:", layer.getZIndex());
    console.log("[AVL History] Layer in map after add:", map.getLayers().getArray().includes(layer));
    layerIdRef.current = layerId;
    layerRef.current = layer;

    mapClickEventRef.current = map.on("singleclick", (evt) => {
      map.forEachFeatureAtPixel(
        evt.pixel,
        (feature) => {
          const vehicleInfo = (feature as Feature & { vehicleInfo?: AvlHistoryVehicleType }).vehicleInfo;
          if (vehicleInfo) {
            console.log("Show popup for history vehicle:", vehicleInfo.vehicle_name);
            const coords = (feature as Feature).getGeometry()?.getExtent();
            if (coords) {
              const center = [(coords[0] + coords[2]) / 2, (coords[1] + coords[3]) / 2];
              // Use the popup store via the ref
              showPopupRef.current?.(center, vehicleInfo);
            }
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
      id: "avl-history-shadow-layer",
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
      let enrichedResults = result as AvlHistoryVehicleType[];

      const tooMany = result.length >= 5000;
      setTooManyRecords(tooMany);
      setZeroRecords(result.length === 0);

      // Check if this group has GeoTab spreader data and needs enrichment
      const hasGeoTabSpreaderData = groupHasGeoTabSpreaderData(selectedGroupOption.value);

      console.log("[AVL History] === ENRICHMENT DEBUG START ===");
      console.log("[AVL History] Selected group:", selectedGroupOption.value);
      console.log("[AVL History] hasGeoTabSpreaderData:", hasGeoTabSpreaderData);
      console.log("[AVL History] Result count:", result.length);
      console.log(
        "[AVL History] First few results subgroupings:",
        result.slice(0, 5).map((r) => r.subgrouping),
      );
      if (result.length > 0) {
        const firstRecord = result[0];
        console.log("[AVL History] First record keys:", Object.keys(firstRecord));
        console.log("[AVL History] First record date:", firstRecord.date);
        console.log("[AVL History] First record dateUTC:", (firstRecord as AvlHistoryVehicleType).dateUTC);
      }

      if (hasGeoTabSpreaderData && result.length > 0) {
        console.log("[AVL History] Enriching results with GeoTab spreader data");

        // Find the config group for this selection
        // "Roads (Spreader)" maps to "Roads" config group
        const configGroupName = selectedGroupOption.value === "Roads (Spreader)" ? "Roads" : selectedGroupOption.value;
        const configGroup = configGroups.find((g) => g.name === configGroupName);

        console.log("[AVL History] Config group name:", configGroupName);
        console.log("[AVL History] Config group found:", !!configGroup);
        console.log(
          "[AVL History] Available config groups:",
          configGroups.map((g) => g.name),
        );

        // Get or authenticate credentials
        let credentials = geoTabCredentials[configGroupName];
        let devices = geoTabDevices[configGroupName];

        console.log("[AVL History] Existing credentials:", !!credentials);
        console.log("[AVL History] Existing devices:", devices?.length || 0);

        // If no credentials exist, authenticate first
        if (!credentials && configGroup) {
          console.log("[AVL History] No credentials found, authenticating with GeoTab...");
          const authResult = await authenticateGeoTab(configGroup);
          if (authResult) {
            credentials = authResult;
            console.log("[AVL History] Authentication successful");
          } else {
            console.log("[AVL History] Authentication FAILED");
          }
        }

        // If no devices exist, fetch them
        if (credentials && (!devices || devices.length === 0) && configGroup) {
          console.log("[AVL History] No devices found, fetching GeoTab devices...");
          // Get vehicles to match with devices
          const vehiclesToMatch = enrichedResults.filter((r) => r.subgrouping === "Plow");
          console.log("[AVL History] Plow vehicles to match:", vehiclesToMatch.length);
          devices = await fetchGeoTabDevices(configGroup, credentials, vehiclesToMatch as AvlVehicle[]);
          console.log("[AVL History] Fetched devices:", devices?.length || 0);
        }

        if (credentials && devices && devices.length > 0) {
          // Filter to get only plow vehicles for enrichment
          const plowResults = enrichedResults.filter((r) => r.subgrouping === "Plow");
          console.log("[AVL History] Plow results to enrich:", plowResults.length);

          if (plowResults.length > 0) {
            // Get unique device IDs for plow vehicles
            const plowDeviceIds = [...new Set(plowResults.map((r) => getDeviceIdForVehicle(r.vehicle_name, configGroupName)).filter((id): id is string => id !== null))];

            console.log("[AVL History] Plow device IDs found:", plowDeviceIds.length);
            console.log("[AVL History] Device IDs:", plowDeviceIds.slice(0, 5));

            if (plowDeviceIds.length > 0) {
              console.log("[AVL History] Fetching spreader data for", plowDeviceIds.length, "devices");
              console.log("[AVL History] Date range:", startDate.toISOString(), "to", endDate.toISOString());

              // Fetch spreader data from GeoTab
              const spreaderData = await fetchSpreaderData(plowDeviceIds, startDate, endDate, credentials);

              console.log("[AVL History] === SPREADER DATA RECEIVED ===");
              console.log("[AVL History] plowActiveEvents count:", spreaderData.plowActiveEvents.length);
              console.log("[AVL History] spreaderActiveEvents count:", spreaderData.spreaderActiveEvents.length);
              console.log("[AVL History] spreaderRateData count:", spreaderData.spreaderRateData.length);
              console.log("[AVL History] wingData count:", spreaderData.wingData.length);
              console.log("[AVL History] airTempData count:", spreaderData.airTempData.length);
              console.log("[AVL History] surfaceTempData count:", spreaderData.surfaceTempData.length);
              console.log("[AVL History] materialTypeData count:", spreaderData.materialTypeData.length);

              // Log sample data
              if (spreaderData.plowActiveEvents.length > 0) {
                console.log("[AVL History] Sample plowActiveEvent:", spreaderData.plowActiveEvents[0]);
              }
              if (spreaderData.airTempData.length > 0) {
                console.log("[AVL History] Sample airTempData:", spreaderData.airTempData[0]);
              }

              // Enrich results with spreader data
              let enrichedCount = 0;
              enrichedResults = enrichedResults.map((record, idx) => {
                if (record.subgrouping !== "Plow") return record;

                const deviceId = getDeviceIdForVehicle(record.vehicle_name, configGroupName);
                if (!deviceId) {
                  if (idx === 0) console.log("[AVL History] First plow record - NO device ID found for:", record.vehicle_name);
                  return record;
                }

                // Convert SQL date (stored in EST but serialized as UTC) to actual UTC
                // The SQL API returns dates like '2026-01-30T11:30:07.000Z' which is actually 11:30 AM EST
                // GeoTab events are in actual UTC, so we need to convert for proper comparison
                const sqlDate = record.dateUTC || record.date;
                const recordDateUTC = convertSqlDateToActualUTC(sqlDate);

                // Debug first record
                if (enrichedCount === 0) {
                  console.log("[AVL History] === ENRICHING FIRST RECORD ===");
                  console.log("[AVL History] Vehicle:", record.vehicle_name);
                  console.log("[AVL History] Device ID:", deviceId);
                  console.log("[AVL History] Original SQL date:", sqlDate);
                  console.log("[AVL History] Converted to actual UTC:", recordDateUTC);
                }

                // Check plow and spreader active status
                const isPlowActive = isActiveAtTime(deviceId, recordDateUTC, spreaderData.plowActiveEvents);
                const isSpreaderActive = isActiveAtTime(deviceId, recordDateUTC, spreaderData.spreaderActiveEvents);

                if (enrichedCount === 0) {
                  console.log("[AVL History] isPlowActive:", isPlowActive);
                  console.log("[AVL History] isSpreaderActive:", isSpreaderActive);
                  // Log matching events
                  const matchingPlowEvents = spreaderData.plowActiveEvents.filter((e) => e.deviceId === deviceId);
                  console.log("[AVL History] Matching plow events for device:", matchingPlowEvents.length);
                  if (matchingPlowEvents.length > 0) {
                    console.log("[AVL History] First plow event:", {
                      activeFrom: matchingPlowEvents[0].activeFrom.toISOString(),
                      activeTo: matchingPlowEvents[0].activeTo.toISOString(),
                    });
                  }
                }

                const enrichedRecord = { ...record };
                enrichedRecord.PlowDown = isPlowActive;
                enrichedRecord.DryOn = isSpreaderActive;

                // Helper function to format date for "Reported on" display
                const formatReportedOn = (isoDateString: string): string => {
                  try {
                    const d = new Date(isoDateString);
                    return d.toLocaleString();
                  } catch {
                    return isoDateString;
                  }
                };

                // Get spreader rate
                if (isSpreaderActive) {
                  const spreaderRateResult = findClosestStatusValue(
                    deviceId,
                    recordDateUTC,
                    spreaderData.spreaderRateData,
                    60 * 60 * 1000, // 60 minutes
                  );
                  if (spreaderRateResult) {
                    enrichedRecord.DryRateKilosPerLaneKilometer = spreaderRateResult.value;
                    enrichedRecord.DryRateReportedOn = formatReportedOn(spreaderRateResult.matchedDateTime);
                  }
                }

                // Get wing status
                const wingResult = findClosestStatusValue(
                  deviceId,
                  recordDateUTC,
                  spreaderData.wingData,
                  15 * 60 * 1000, // 15 minutes
                );
                if (wingResult) {
                  enrichedRecord.WingDown = wingResult.value === 1;
                  enrichedRecord.WingReportedOn = formatReportedOn(wingResult.matchedDateTime);
                }

                // Get temperatures
                const airTempResult = findClosestStatusValue(
                  deviceId,
                  recordDateUTC,
                  spreaderData.airTempData,
                  6 * 60 * 60 * 1000, // 6 hours
                );
                if (airTempResult) {
                  enrichedRecord.TemperatureAir = airTempResult.value;
                  enrichedRecord.TemperatureAirReportedOn = formatReportedOn(airTempResult.matchedDateTime);
                }

                const surfaceTempResult = findClosestStatusValue(
                  deviceId,
                  recordDateUTC,
                  spreaderData.surfaceTempData,
                  6 * 60 * 60 * 1000, // 6 hours
                );
                if (surfaceTempResult) {
                  enrichedRecord.TemperatureSurface = surfaceTempResult.value;
                  enrichedRecord.TemperatureSurfaceReportedOn = formatReportedOn(surfaceTempResult.matchedDateTime);
                }

                // Debug logging for first record
                if (enrichedCount === 0) {
                  console.log("[AVL History] Air temp result:", airTempResult);
                  console.log("[AVL History] Surface temp result:", surfaceTempResult);
                }

                // Get material type
                if (isSpreaderActive) {
                  const materialTypeResult = findClosestStatusValue(
                    deviceId,
                    recordDateUTC,
                    spreaderData.materialTypeData,
                    12 * 60 * 60 * 1000, // 12 hours
                  );
                  if (materialTypeResult) {
                    const materialValue = materialTypeResult.value;
                    if (materialValue === 37) {
                      enrichedRecord.MaterialType = "SALT";
                    } else if (materialValue === 38) {
                      enrichedRecord.MaterialType = "SAND";
                    }
                    enrichedRecord.MaterialTypeReportedOn = formatReportedOn(materialTypeResult.matchedDateTime);
                  }
                }

                // Determine blasting status
                const spreaderRate = enrichedRecord.DryRateKilosPerLaneKilometer;
                const materialType = enrichedRecord.MaterialType;
                if (typeof spreaderRate === "number" && materialType) {
                  if (materialType === "SALT" && spreaderRate > 175) {
                    enrichedRecord.Blasting = true;
                  } else if (materialType === "SAND" && spreaderRate > 600) {
                    enrichedRecord.Blasting = true;
                  } else {
                    enrichedRecord.Blasting = false;
                  }
                }

                enrichedCount++;
                return enrichedRecord;
              });

              console.log("[AVL History] Enrichment complete, enriched records:", enrichedCount);

              // Count how many have PlowDown true vs false
              const plowDownTrue = enrichedResults.filter((r) => r.PlowDown === true).length;
              const plowDownFalse = enrichedResults.filter((r) => r.PlowDown === false).length;
              const dryOnTrue = enrichedResults.filter((r) => r.DryOn === true).length;
              console.log("[AVL History] PlowDown=true count:", plowDownTrue);
              console.log("[AVL History] PlowDown=false count:", plowDownFalse);
              console.log("[AVL History] DryOn=true count:", dryOnTrue);

              // Find a record that SHOULD be within plow active time
              if (spreaderData.plowActiveEvents.length > 0) {
                const firstEvent = spreaderData.plowActiveEvents[0];
                const midEventTime = new Date((firstEvent.activeFrom.getTime() + firstEvent.activeTo.getTime()) / 2);
                console.log("[AVL History] Looking for records near plow event at:", midEventTime.toISOString());

                // Find records close to this time (use converted UTC time)
                const recordsNearPlowEvent = enrichedResults.filter((r) => {
                  const recordTimeUTC = new Date(convertSqlDateToActualUTC(r.dateUTC || r.date)).getTime();
                  return Math.abs(recordTimeUTC - midEventTime.getTime()) < 5 * 60 * 1000; // within 5 minutes
                });
                console.log("[AVL History] Records within 5 min of plow event:", recordsNearPlowEvent.length);
                if (recordsNearPlowEvent.length > 0) {
                  const sample = recordsNearPlowEvent[0];
                  console.log("[AVL History] Sample record near plow event:", {
                    originalDate: sample.date,
                    convertedUTC: convertSqlDateToActualUTC(sample.date),
                    PlowDown: sample.PlowDown,
                    DryOn: sample.DryOn,
                    vehicle: sample.vehicle_name,
                  });
                }
              }
            }
          }
        }
      } else {
        console.log("[AVL History] Skipping enrichment - hasGeoTabSpreaderData:", hasGeoTabSpreaderData, "results:", result.length);
      }
      console.log("[AVL History] === ENRICHMENT DEBUG END ===");

      setSearchResults(enrichedResults);
      displayResults(enrichedResults);
    } catch (error) {
      console.error("Error fetching history:", error);
      setZeroRecords(true);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedGroupOption,
    selectedVehicleOption,
    startDate,
    endDate,
    selectedSpeedOperator,
    selectedSpeed,
    sliderValue,
    onlyVisibleExtent,
    map,
    fetchHistory,
    fetchHistorySpreader,
    groupHasGeoTabSpreaderData,
    geoTabCredentials,
    geoTabDevices,
    configGroups,
    getDeviceIdForVehicle,
    fetchSpreaderData,
    isActiveAtTime,
    findClosestStatusValue,
    authenticateGeoTab,
    fetchGeoTabDevices,
  ]);

  const displayResults = useCallback(
    (results: AvlHistoryVehicleType[]) => {
      console.log("[AVL History] displayResults called with", results.length, "results");
      console.log("[AVL History] layerRef.current:", layerRef.current);
      console.log("[AVL History] map:", map);

      if (!layerRef.current || !map) {
        console.log("[AVL History] Missing layer or map, returning");
        return;
      }

      // Verify the layer is actually in the map
      const mapLayers = map.getLayers().getArray();
      const layerInMap = mapLayers.includes(layerRef.current);
      console.log("[AVL History] Layer in map:", layerInMap, "Total map layers:", mapLayers.length);

      if (!layerInMap) {
        console.error("[AVL History] Layer is NOT in map! Re-adding...");
        map.addLayer(layerRef.current);
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
        const feature = new Feature(new Point(coords));
        feature.set("name", vehicle.vehicle_name);
        (feature as unknown as Feature & { vehicleInfo: AvlHistoryVehicleType }).vehicleInfo = vehicle;

        // Determine appropriate icon based on vehicle state (matching legacy app logic)
        let iconName = "Default-History.png";
        if (vehicle.PlowDown !== undefined) {
          if (vehicle.Blasting) iconName = "blasting.png";
          else if (vehicle.PlowDown && vehicle.DryOn) iconName = "plow-down-spreader-on.png";
          else if (vehicle.PlowDown && !vehicle.DryOn) iconName = "plow-down-spreader-off.png";
          else if (!vehicle.PlowDown && vehicle.DryOn) iconName = "plow-up-spreader-on.png";
          else if (!vehicle.PlowDown && !vehicle.DryOn) iconName = "plow-up-spreader-off.png";
        }

        if (index === 0) {
          console.log("[AVL History] First vehicle:", {
            vehicle_name: vehicle.vehicle_name,
            subgrouping: vehicle.subgrouping,
            PlowDown: vehicle.PlowDown,
            DryOn: vehicle.DryOn,
            Blasting: vehicle.Blasting,
          });
          console.log("[AVL History] First feature icon:", iconName, "path:", getImagePath(iconName));
        }

        // Create icon style matching legacy app
        const style = new Style({
          image: new Icon({
            anchor: [0.5, 0.5],
            scale: 0.75,
            src: getImagePath(iconName),
            rotation: (vehicle.direction || 0) * (Math.PI / 180),
          }),
        });

        feature.setStyle(style);
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
      <details className="sc-theme-avl-collapse" open>
        <summary className="sc-theme-avl-collapse-trigger">Search</summary>
        <div className="sc-theme-avl-collapse-content">
          <div className="sc-container" style={{ marginTop: "5px" }}>
            <div className="sc-theme-avl-history-control-row">
              <label className="sc-theme-avl-history-label">Group:</label>
              <Select
                styles={avlGroupDropDownStyles}
                isSearchable={false}
                onChange={(option) => {
                  setSelectedGroupOption(option as GroupSelectOption | null);
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
                    setSelectedVehicleTypeOption(option as SelectOption<string>);
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
                onChange={(option) => option && setSelectedVehicleOption(option as SelectOption<string> | null)}
                options={getVehiclesByGroup()}
                value={selectedVehicleOption}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              />
            </div>

            <div className="sc-theme-avl-history-control-row">
              <label className="sc-theme-avl-history-label">From:</label>
              <DatePicker
                className="sc-input sc-theme-avl-history-date-picker"
                selected={startDate}
                onChange={(date: Date | null) => date && setStartDate(date)}
                showTimeSelect
                dateFormat="MMMM d, yyyy h:mm aa"
              />
            </div>

            <div className="sc-theme-avl-history-control-row">
              <label className="sc-theme-avl-history-label">To:</label>
              <DatePicker
                className="sc-input sc-theme-avl-history-date-picker"
                selected={endDate}
                onChange={(date: Date | null) => date && setEndDate(date)}
                showTimeSelect
                dateFormat="MMMM d, yyyy h:mm aa"
              />
            </div>

            <div className="sc-theme-avl-history-control-row">
              <label className="sc-theme-avl-history-label">Speed:</label>
              <Select
                styles={avlSpeedOperatorDropDownStyles}
                isSearchable={false}
                onChange={(option) => option && setSelectedSpeedOperator(option as SpeedOperatorOption)}
                options={SPEED_OPERATORS}
                value={selectedSpeedOperator}
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              />
              <Select
                styles={avlSpeedDropDownStyles}
                isSearchable={false}
                onChange={(option) => option && setSelectedSpeed(option as SelectOption<number>)}
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
                <input type="checkbox" style={{ marginLeft: "5px" }} onChange={(e) => setOnlyVisibleExtent(e.target.checked)} checked={onlyVisibleExtent} />
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
        </div>
      </details>

      <details className="sc-theme-avl-collapse" open>
        <summary className="sc-theme-avl-collapse-trigger">{searchResults.length > 0 ? `Results (${searchResults.length} records)` : "Results"}</summary>
        <div className="sc-theme-avl-collapse-content">
          {tooManyRecords && <div className="sc-container sc-theme-avl-history-warning">Your search returned too many records. Only showing top 5000 records.</div>}
          {zeroRecords && <div className="sc-container sc-theme-avl-history-warning">Your search returned ZERO records. Please try again.</div>}
          {searchResults.length > 0 && (
            <div className="sc-container sc-theme-avl-history-results-container">
              <List id="sc-avl-history-virtual-layers" rowHeight={50} rowRenderer={renderRow} rowCount={searchResults.length} width={listWidth} height={listHeight} style={{ outline: "none" }} />
            </div>
          )}
        </div>
      </details>

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getImagePath(item.image)} alt={item.label} style={{ height: "20px" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
