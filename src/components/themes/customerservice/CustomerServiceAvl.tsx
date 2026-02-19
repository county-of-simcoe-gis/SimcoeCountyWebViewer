"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Select from "react-select";
import DatePicker from "react-datepicker";
import moment from "moment";
import "react-datepicker/dist/react-datepicker.css";
import ImageLayer from "ol/layer/Image";
import ImageWMS from "ol/source/ImageWMS";
import { useSession } from "next-auth/react";
import { useMapStore } from "@/stores/mapStore";
import { useAvlStore } from "@/stores/avlStore";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import AvlLive from "../avl/AvlLive";
import type { AvlSecurityGroup, AvlConfig } from "../avl/types/avl.types";
import csAvlConfig from "./avlConfig.json";
import "./styles/CustomerServiceAvl.css";

const getImagePath = (imageName: string): string => `/images/customerservice/${imageName}`;

// GeoServer WMS URL from the CS AVL config
const GEOSERVER_WMS_URL = csAvlConfig.geoserverWMSUrl;

// Customer Service uses a subset of AVL groups
const CS_AVL_SECURITY_GROUPS: AvlSecurityGroup[] = [
  { key: "avl_roads", label: "Roads" },
  { key: "avl_roads", label: "Roads GeoTab" },
  { key: "avl_solid_waste", label: "Solid Waste GeoTab" },
  { key: "avl_waste_contractor", label: "Waste Contractor" },
];

// AVL roles that grant access to vehicle tracking
const CS_AVL_ROLES = ["avl_waste_contractor", "avl_roads", "avl_solid_waste", "theme_customer_service"];

// History WMS layer definitions
const HISTORY_LAYERS = {
  raw: { geoserverName: "AVL_Miller_Raw", internalName: "avlHistoryRaw" },
  armCycle: { geoserverName: "Avl_Miller_Diagnostics_Arm_Cycle", internalName: "avlHistoryArmCycle" },
  excessMaterial: { geoserverName: "AVL_Miller_Diagnostics_Excess_Material", internalName: "avlHistoryExcessMaterial" },
  nothingAtCurb: { geoserverName: "AVL_Miller_Diagnostics_Nothing_At_Curb", internalName: "avlHistoryNothingAtCurb" },
  wrongWeek: { geoserverName: "AVL_Miller_Diagnostics_Wrong_Week", internalName: "avlHistoryWrongWeek" },
  specialCollection: { geoserverName: "view_AVLWasteContractorsHistorySpecialCollectionGeom", internalName: "avlHistorySpecialCollection" },
  stopsRegular: { geoserverName: "view_avl_stops_regular_collection_geom", internalName: "avlStopsRegularCollection" },
  stopsSpecial: { geoserverName: "view_avl_stops_special_collection_geom", internalName: "avlStopsSpecialCollection" },
} as const;

// History date options
const HISTORY_OPTIONS = [
  { value: "None", label: "-- None --" },
  { value: "Today", label: "** Today **" },
  { value: "Custom", label: "** Custom **" },
  { value: "Monday", label: "Previous Monday" },
  { value: "Tuesday", label: "Previous Tuesday" },
  { value: "Wednesday", label: "Previous Wednesday" },
  { value: "Thursday", label: "Previous Thursday" },
  { value: "Friday", label: "Previous Friday" },
  { value: "Saturday", label: "Previous Saturday" },
];

// Refresh interval for WMS layers (30 seconds)
const WMS_REFRESH_INTERVAL = 30000;

interface CustomerServiceAvlProps {
  visible: boolean;
}

/**
 * Create a secured WMS ImageLayer that fetches tiles directly with auth headers.
 * Uses a ref to always read the latest token value.
 */
function createSecuredWMSLayer(layerName: string, cqlFilter: string, initialVisible: boolean, tokenRef: React.RefObject<string | undefined>): ImageLayer<ImageWMS> {
  const wmsSource = new ImageWMS({
    url: GEOSERVER_WMS_URL,
    params: {
      LAYERS: layerName,
      cql_filter: cqlFilter,
      FORMAT: "image/png",
      TRANSPARENT: true,
      VERSION: "1.3.0",
    },
    ratio: 1,
    serverType: "geoserver",
    crossOrigin: "anonymous",
    imageLoadFunction: (image, src) => {
      const img = image.getImage() as HTMLImageElement;
      img.onerror = () => {
        console.warn(`[CS-AVL] Failed to load WMS image for ${layerName}`);
      };

      const token = tokenRef.current;
      if (!token) {
        img.src = src;
        return;
      }

      // Direct fetch with auth header for secured GeoServer
      const headers: HeadersInit = src.includes("opengis2.simcoe.ca") ? { Authorization: `Bearer ${token}` } : {};

      fetch(src, { headers })
        .then((response) => {
          if (!response.ok) throw new Error(`WMS request failed: ${response.status}`);
          return response.blob();
        })
        .then((blob) => {
          const objectUrl = URL.createObjectURL(blob);
          img.onload = () => URL.revokeObjectURL(objectUrl);
          img.src = objectUrl;
        })
        .catch((err) => {
          console.warn(`[CS-AVL] WMS fetch error for ${layerName}:`, err);
        });
    },
  });

  return new ImageLayer({
    source: wmsSource,
    visible: initialVisible,
    zIndex: 499,
    properties: {
      disableParcelClick: true,
      secured: true,
      queryable: true,
    },
  });
}

export default function CustomerServiceAvl({ visible }: CustomerServiceAvlProps) {
  const { data: session } = useSession();
  const { map } = useMapStore();
  const { setConfig, setAllowedGroups } = useAvlStore();
  const { roles: userRoles } = useRequireAuth({ requiredRoles: CS_AVL_ROLES });

  // Track store initialization
  const storeInitializedRef = useRef(false);
  // Track WMS layer initialization
  const layersInitializedRef = useRef(false);

  // WMS layer refs
  const rawLayerRef = useRef<ImageLayer<ImageWMS> | null>(null);
  const armCycleLayerRef = useRef<ImageLayer<ImageWMS> | null>(null);
  const excessMaterialLayerRef = useRef<ImageLayer<ImageWMS> | null>(null);
  const nothingAtCurbLayerRef = useRef<ImageLayer<ImageWMS> | null>(null);
  const wrongWeekLayerRef = useRef<ImageLayer<ImageWMS> | null>(null);
  const specialCollectionLayerRef = useRef<ImageLayer<ImageWMS> | null>(null);
  const stopsRegularLayerRef = useRef<ImageLayer<ImageWMS> | null>(null);
  const stopsSpecialLayerRef = useRef<ImageLayer<ImageWMS> | null>(null);
  // LayerManager IDs for cleanup
  const layerIdsRef = useRef<string[]>([]);
  // Refresh timer
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [selectedHistoryOption, setSelectedHistoryOption] = useState(HISTORY_OPTIONS[1]);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(new Date());
  const [chkArmCycle, setChkArmCycle] = useState(true);
  const [chkExcessMaterial, setChkExcessMaterial] = useState(true);
  const [chkNothingAtCurb, setChkNothingAtCurb] = useState(true);
  const [chkWrongWeek, setChkWrongWeek] = useState(true);
  const [chkSummaryRegular, setChkSummaryRegular] = useState(false);
  const [chkSummarySpecial, setChkSummarySpecial] = useState(false);
  const [chkRaw, setChkRaw] = useState(false);

  // Access token for direct GeoServer WMS calls
  const accessToken = session?.accessToken || session?.user?.accessToken;
  const accessTokenRef = useRef<string | undefined>(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  // Populate the avlStore with the CS-specific config and allowed groups
  useEffect(() => {
    if (storeInitializedRef.current) return;
    if (!userRoles || userRoles.length === 0) return;

    const config: AvlConfig = csAvlConfig as AvlConfig;
    setConfig(config);

    const userRolesLower = userRoles.map((r) => r.toLowerCase());
    const allowed: string[] = [];
    CS_AVL_SECURITY_GROUPS.forEach((sg) => {
      if (userRolesLower.includes(sg.key.toLowerCase())) {
        allowed.push(sg.label);
      }
    });

    // Customer service role grants access to all CS AVL groups
    if (userRolesLower.includes("theme_customer_service") && allowed.length === 0) {
      CS_AVL_SECURITY_GROUPS.forEach((sg) => {
        if (!allowed.includes(sg.label)) {
          allowed.push(sg.label);
        }
      });
    }

    setAllowedGroups(allowed);
    storeInitializedRef.current = true;
  }, [userRoles, setConfig, setAllowedGroups]);

  // ---- CQL Filter Helpers ----

  const findPreviousDay = useCallback((dayName: string): Date => {
    const dayNumber =
      {
        MONDAY: 1,
        TUESDAY: 2,
        WEDNESDAY: 3,
        THURSDAY: 4,
        FRIDAY: 5,
        SATURDAY: 6,
      }[dayName.toUpperCase()] || 0;

    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);

    for (;;) {
      if (startDate.getDay() === dayNumber) return new Date(startDate);
      startDate.setDate(startDate.getDate() + 1);
    }
  }, []);

  const getHistoryDateCQLFilter = useCallback((): string => {
    const cqlTemplate = (fromDate: string, toDate: string) => `date AFTER ${fromDate} AND date BEFORE ${toDate}`;

    if (selectedHistoryOption.value === "Today") {
      return cqlTemplate(moment().format("YYYY-MM-DDT00:00:00"), moment().format("YYYY-MM-DDT23:59:59"));
    } else if (selectedHistoryOption.value === "Custom") {
      return cqlTemplate(moment(selectedHistoryDate).format("YYYY-MM-DDT00:00:00"), moment(selectedHistoryDate).format("YYYY-MM-DDT23:59:59"));
    } else {
      const prevDay = findPreviousDay(selectedHistoryOption.value);
      return cqlTemplate(moment(prevDay).format("YYYY-MM-DDT00:00:00"), moment(prevDay).format("YYYY-MM-DDT23:59:59"));
    }
  }, [selectedHistoryOption, selectedHistoryDate, findPreviousDay]);

  const getStopsDateCQLFilter = useCallback((): string => {
    const cqlTemplate = (date: string) => `date = '${date}'`;

    if (selectedHistoryOption.value === "Today") {
      return cqlTemplate(moment().format("YYYY-MM-DD"));
    } else if (selectedHistoryOption.value === "Custom") {
      return cqlTemplate(moment(selectedHistoryDate).format("YYYY-MM-DD"));
    } else {
      const prevDay = findPreviousDay(selectedHistoryOption.value);
      return cqlTemplate(moment(prevDay).format("YYYY-MM-DD"));
    }
  }, [selectedHistoryOption, selectedHistoryDate, findPreviousDay]);

  // ---- Initialize WMS Layers ----

  useEffect(() => {
    if (!map || layersInitializedRef.current) return;
    layersInitializedRef.current = true;

    const cqlHistory = getHistoryDateCQLFilter();
    const cqlStops = getStopsDateCQLFilter();

    // Create all 8 WMS layers
    rawLayerRef.current = createSecuredWMSLayer(HISTORY_LAYERS.raw.geoserverName, cqlHistory, false, accessTokenRef);
    armCycleLayerRef.current = createSecuredWMSLayer(HISTORY_LAYERS.armCycle.geoserverName, cqlHistory, true, accessTokenRef);
    excessMaterialLayerRef.current = createSecuredWMSLayer(HISTORY_LAYERS.excessMaterial.geoserverName, cqlHistory, true, accessTokenRef);
    nothingAtCurbLayerRef.current = createSecuredWMSLayer(HISTORY_LAYERS.nothingAtCurb.geoserverName, cqlHistory, true, accessTokenRef);
    wrongWeekLayerRef.current = createSecuredWMSLayer(HISTORY_LAYERS.wrongWeek.geoserverName, cqlHistory, true, accessTokenRef);
    specialCollectionLayerRef.current = createSecuredWMSLayer(HISTORY_LAYERS.specialCollection.geoserverName, cqlHistory, true, accessTokenRef);
    stopsRegularLayerRef.current = createSecuredWMSLayer(HISTORY_LAYERS.stopsRegular.geoserverName, cqlStops, false, accessTokenRef);
    stopsSpecialLayerRef.current = createSecuredWMSLayer(HISTORY_LAYERS.stopsSpecial.geoserverName, cqlStops, false, accessTokenRef);

    // Register all layers with LayerManager
    const layerEntries: Array<{ ref: React.RefObject<ImageLayer<ImageWMS> | null>; name: string }> = [
      { ref: rawLayerRef, name: HISTORY_LAYERS.raw.internalName },
      { ref: armCycleLayerRef, name: HISTORY_LAYERS.armCycle.internalName },
      { ref: excessMaterialLayerRef, name: HISTORY_LAYERS.excessMaterial.internalName },
      { ref: nothingAtCurbLayerRef, name: HISTORY_LAYERS.nothingAtCurb.internalName },
      { ref: wrongWeekLayerRef, name: HISTORY_LAYERS.wrongWeek.internalName },
      { ref: specialCollectionLayerRef, name: HISTORY_LAYERS.specialCollection.internalName },
      { ref: stopsRegularLayerRef, name: HISTORY_LAYERS.stopsRegular.internalName },
      { ref: stopsSpecialLayerRef, name: HISTORY_LAYERS.stopsSpecial.internalName },
    ];

    const ids: string[] = [];
    layerEntries.forEach(({ ref, name }) => {
      if (ref.current) {
        const id = LayerManager.addLayer(ref.current, "Overlay", `CS-AVL ${name}`, {
          visible: ref.current.getVisible(),
          metadata: { source: "CustomerServiceAvl", secured: true },
        });
        if (id) ids.push(id);
      }
    });
    layerIdsRef.current = ids;

    // Set up 30-second refresh for breadcrumb layers
    refreshTimerRef.current = setInterval(() => {
      [rawLayerRef, armCycleLayerRef, excessMaterialLayerRef, nothingAtCurbLayerRef, wrongWeekLayerRef, specialCollectionLayerRef].forEach((ref) => {
        if (ref.current?.getVisible()) {
          ref.current.getSource()?.changed();
        }
      });
    }, WMS_REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      layerIdsRef.current.forEach((id) => LayerManager.removeLayer(id));
      layerIdsRef.current = [];
      layersInitializedRef.current = false;
    };
  }, [map, getHistoryDateCQLFilter, getStopsDateCQLFilter]);

  // ---- Update layer filters & visibility when settings change ----

  useEffect(() => {
    if (!layersInitializedRef.current) return;

    const isNone = selectedHistoryOption.value === "None";
    const cqlHistory = getHistoryDateCQLFilter();
    const cqlStops = getStopsDateCQLFilter();

    // Update CQL filters on all history layers
    const historyLayers = [rawLayerRef, armCycleLayerRef, excessMaterialLayerRef, nothingAtCurbLayerRef, wrongWeekLayerRef, specialCollectionLayerRef];
    historyLayers.forEach((ref) => {
      ref.current?.getSource()?.updateParams({ cql_filter: cqlHistory });
    });

    // Update CQL filters on stops layers
    stopsRegularLayerRef.current?.getSource()?.updateParams({ cql_filter: cqlStops });
    stopsSpecialLayerRef.current?.getSource()?.updateParams({ cql_filter: cqlStops });

    // Set visibility based on tab visibility, "None" selection, and checkbox states
    const tabVisible = visible;

    armCycleLayerRef.current?.setVisible(tabVisible && !isNone && chkArmCycle);
    excessMaterialLayerRef.current?.setVisible(tabVisible && !isNone && chkExcessMaterial);
    nothingAtCurbLayerRef.current?.setVisible(tabVisible && !isNone && chkNothingAtCurb);
    wrongWeekLayerRef.current?.setVisible(tabVisible && !isNone && chkWrongWeek);
    specialCollectionLayerRef.current?.setVisible(tabVisible && !isNone);
    rawLayerRef.current?.setVisible(tabVisible && !isNone && chkRaw);
    stopsRegularLayerRef.current?.setVisible(tabVisible && !isNone && chkSummaryRegular);
    stopsSpecialLayerRef.current?.setVisible(tabVisible && !isNone && chkSummarySpecial);
  }, [
    visible,
    selectedHistoryOption,
    selectedHistoryDate,
    chkArmCycle,
    chkExcessMaterial,
    chkNothingAtCurb,
    chkWrongWeek,
    chkSummaryRegular,
    chkSummarySpecial,
    chkRaw,
    getHistoryDateCQLFilter,
    getStopsDateCQLFilter,
  ]);

  // Handle date change
  const handleHistoryDateChange = (date: Date | null) => {
    if (!date) return;
    if (date < moment().add(-30, "days").toDate() || date > new Date()) {
      alert("History is only available for last 30 days.");
      return;
    }
    setSelectedHistoryDate(date);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupsDropDownStyles: any = {
    control: (provided: Record<string, unknown>) => ({
      ...provided,
      minHeight: "30px",
    }),
    indicatorsContainer: (provided: Record<string, unknown>) => ({
      ...provided,
      height: "30px",
    }),
    clearIndicator: (provided: Record<string, unknown>) => ({
      ...provided,
      padding: "5px",
    }),
    dropdownIndicator: (provided: Record<string, unknown>) => ({
      ...provided,
      padding: "5px",
    }),
  };

  return (
    <div className={visible ? "sc-customer-service-avl-main-container" : "sc-hidden"}>
      {/* Live Vehicles Section — only render AvlLive when tab is active to stop GeoTab polling */}
      <div className="sc-theme-customer-service-avl-live-container">
        <div className="sc-title sc-border-bottom">Live Vehicles</div>
        {visible && (
          <AvlLive
            config={csAvlConfig as AvlConfig}
            securityGroups={CS_AVL_SECURITY_GROUPS}
            onHistoryPopupButtonClick={() => {}}
            showVehicleList={false}
            mapVehiclesVisible={visible}
            showFollowButton={false}
            showHistoryButton={false}
            useStorage={false}
          />
        )}
      </div>

      {/* History Section */}
      <div className="sc-theme-customer-service-avl-history-container">
        <div className="sc-title sc-border-bottom">History</div>
        <div className="sc-container">
          {/* History Date Selector */}
          <div>
            <Select styles={groupsDropDownStyles} isSearchable={false} onChange={(option) => option && setSelectedHistoryOption(option)} options={HISTORY_OPTIONS} value={selectedHistoryOption} />
          </div>

          {/* Custom Date Picker */}
          <div className={selectedHistoryOption.value === "Custom" ? "mt-2" : "sc-hidden"}>
            <DatePicker
              className="input input-bordered input-sm w-full sc-customer-service-avl-history-date-picker"
              selected={selectedHistoryDate}
              onChange={handleHistoryDateChange}
              dateFormat="MMMM d, yyyy"
              maxDate={new Date()}
              minDate={moment().add(-30, "days").toDate()}
            />
          </div>

          {/* Checkboxes */}
          <div className="text-xs mt-3 space-y-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="checkbox checkbox-xs" checked={chkArmCycle} onChange={() => setChkArmCycle(!chkArmCycle)} />
              <span>Display Arm Cycle</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="checkbox checkbox-xs" checked={chkExcessMaterial} onChange={() => setChkExcessMaterial(!chkExcessMaterial)} />
              <span>Display Excess Material</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="checkbox checkbox-xs" checked={chkNothingAtCurb} onChange={() => setChkNothingAtCurb(!chkNothingAtCurb)} />
              <span>Display Nothing at Curb</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="checkbox checkbox-xs" checked={chkWrongWeek} onChange={() => setChkWrongWeek(!chkWrongWeek)} />
              <span>Display Wrong Week</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="checkbox checkbox-xs" checked={chkSummaryRegular} onChange={() => setChkSummaryRegular(!chkSummaryRegular)} />
              <span>Summary data when zoomed out (Regular Collection)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="checkbox checkbox-xs" checked={chkSummarySpecial} onChange={() => setChkSummarySpecial(!chkSummarySpecial)} />
              <span>Summary data when zoomed out (Special Collection)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="checkbox checkbox-xs" checked={chkRaw} onChange={() => setChkRaw(!chkRaw)} />
              <span>Raw GPS Data</span>
            </label>
          </div>
        </div>

        {/* Legend */}
        <div>
          <div className="sc-title sc-border-bottom">Legend</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getImagePath("diagnosticsLegend.png")} alt="Legend" />
        </div>
      </div>
    </div>
  );
}
