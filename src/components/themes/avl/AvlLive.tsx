"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import Select from "react-select";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import { Icon, Style } from "ol/style";
import { unByKey } from "ol/Observable";
import type { EventsKey } from "ol/events";

import { useAvlStore } from "@/stores/avlStore";
import { useMapStore } from "@/stores/mapStore";
import { usePopupStore } from "@/stores/popupStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { useAvlApi } from "./hooks/useAvlApi";
import { useGeoTab } from "./hooks/useGeoTab";
import AvlLiveGroup from "./components/AvlLiveGroup";
import AvlLiveVehicle from "./components/AvlLiveVehicle";
import AvlLivePopup from "./components/AvlLivePopup";
import {
  addVehicleInfo,
  sortByVehicleIdAsc,
  sortByVehicleIdDesc,
  sortBySpeedAsc,
  sortBySpeedDesc,
  sortByDateAsc,
  sortByDateDesc,
  toWebMercatorFromLatLong,
  dateDiffInDays,
  cleanDeviceNameForMatching,
} from "./utils/avlHelpers";
import { avlLiveDropDownStyles } from "./utils/avlStyles";
import type { AvlLiveProps, AvlVehicle, AvlGroup, AvlSubGroup, SortOption, GeoTabDevice } from "./types/avl.types";
import "./styles/AvlLive.css";

// Import images - using a simpler approach for NextJS
const getImagePath = (imageName: string): string => {
  // In NextJS, we need to use public folder or dynamic imports
  // For now, return a path that would work with the images in the public folder
  return `/images/avl/${imageName}`;
};

const SORT_OPTIONS: SortOption[] = [
  { label: "Date", value: "date" },
  { label: "Vehicle Id", value: "vehicle_name" },
  { label: "Speed", value: "velocity" },
];

const FETCH_INTERVAL = 300000; // 5 minutes
const GEOTAB_FETCH_INTERVAL = 1000; // 1 second

export default function AvlLive({
  onHistoryPopupButtonClick,
  showVehicleList = true,
  mapVehiclesVisible = true,
  showFollowButton = true,
  showHistoryButton = true,
  useStorage = true,
  onPlowVehiclesUpdate,
  onPlowGroupsUpdate,
}: AvlLiveProps) {
  // Get store values and actions
  const {
    allowedGroups,
    configGroups,
    vehicles,
    geoTabDevices,
    geoTabCredentials,
    selectedSortOption,
    sortAscendingChecked,
    showLabels,
    searchText,
    followingVehicle,
    setConfigGroups,
    setVehicles,
    setSelectedSortOption,
    setSortAscendingChecked,
    setShowLabels,
    setSearchText,
    setFollowingVehicle,
    setGroupVisibility,
    setSubGroupVisibility,
    setGroupOpen,
    loadFromStorage,
  } = useAvlStore();

  const { map } = useMapStore();
  const { show: showPopupStore, hide: hidePopup, updateContent } = usePopupStore();
  const { fetchCurrentLocations } = useAvlApi();
  const { authenticateGeoTab, fetchGeoTabDevices, fetchDeviceStatusInfo, fetchGeoTabDiagnostics } = useGeoTab();

  // Local state
  const [isLoading, setIsLoading] = useState(true);

  // Local refs
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const layerIdRef = useRef<string | null>(null);
  const mapClickEventRef = useRef<EventsKey | null>(null);
  const fetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const geoTabIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popupFeatureRef = useRef<(Feature & { vehicleInfo: AvlVehicle }) | null>(null);

  // Refs to hold latest callback functions for intervals (prevents stale closures)
  const fetchCurrentLocationsRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const getGeoTabCurrentLocationsRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const updateVehiclesFromGeoTabRef = useRef<
    | ((
        groupName: string,
        statusInfo: Array<{
          latitude: number;
          longitude: number;
          speed?: number;
          bearing?: number;
          dateTime: string;
          device: { id: string };
          exceptionEvents?: Array<{ rule?: { id: string }; diagnostic?: { id: string } }>;
        }>,
      ) => void)
    | undefined
  >(undefined);

  // Initialize component
  useEffect(() => {
    if (!map) return;

    // Don't run until allowedGroups is populated (prevents empty initialization)
    if (!allowedGroups || allowedGroups.length === 0) {
      return;
    }

    initLayers();
    if (useStorage) {
      loadFromStorage();
    }

    // Initial fetch - direct call since refs may not be set yet
    setIsLoading(true);
    fetchCurrentLocationsForAllGroups().finally(() => {
      setIsLoading(false);
    });

    // Set up fetch interval - uses ref to always call latest function (avoids stale closures)
    fetchIntervalRef.current = setInterval(() => {
      fetchCurrentLocationsRef.current?.();
    }, FETCH_INTERVAL);

    // Set up GeoTab interval if we have GeoTab devices - uses ref to always call latest function
    const hasGeoTabDevices = configGroups.some((group) => allowedGroups.includes(group.name) && group.isGeoTabDevice);
    if (hasGeoTabDevices) {
      geoTabIntervalRef.current = setInterval(() => {
        getGeoTabCurrentLocationsRef.current?.();
      }, GEOTAB_FETCH_INTERVAL);
    }

    // Set up map click handler
    mapClickEventRef.current = map.on("singleclick", handleMapClick);

    return () => {
      // Cleanup
      if (layerIdRef.current) {
        LayerManager.removeLayer(layerIdRef.current);
        layerIdRef.current = null;
      }
      layerRef.current = null;
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
      if (geoTabIntervalRef.current) {
        clearInterval(geoTabIntervalRef.current);
      }
      if (mapClickEventRef.current) {
        unByKey(mapClickEventRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, allowedGroups]);

  // Update layer visibility when mapVehiclesVisible changes
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setVisible(mapVehiclesVisible);
    }
  }, [mapVehiclesVisible]);

  // Re-sort vehicles when group/subgroup visibility changes
  // This ensures sortVehicles uses the updated configGroups state after visibility toggles
  useEffect(() => {
    // Only run after initial load (when vehicles exist or map is ready)
    if (!map || !layerRef.current) return;

    // sortVehicles will now have access to the updated configGroups and sort options
    sortVehicles(configGroups);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Track changes to visibility and sorting parameters
    configGroups,
    selectedSortOption,
    sortAscendingChecked,
    showLabels,
  ]);

  // Initialize map layers
  const initLayers = useCallback(() => {
    if (!map || layerRef.current) return;

    const layer = new VectorLayer({
      source: new VectorSource({ features: [] }),
    });
    layer.setProperties({ disableParcelClick: true, name: "avlLive" });

    // Use LayerManager to add layer with "Overlay" category for highest z-index
    const layerId = LayerManager.addLayer(layer, "Overlay", "AVL Live Vehicles", {
      id: "avl-live-layer",
      metadata: { type: "avl", component: "AvlLive" },
    });

    layerRef.current = layer;
    layerIdRef.current = layerId;
  }, [map]);

  // Show popup for a vehicle feature
  const showVehiclePopup = useCallback(
    async (feature: Feature & { vehicleInfo: AvlVehicle }) => {
      popupFeatureRef.current = feature;
      const vehicleInfo = feature.vehicleInfo;
      const coords = (feature.getGeometry() as Point)?.getCoordinates();

      if (!coords) return;

      // Check if this is a plow vehicle and if the group has spreader data enabled
      const groupFromConfig = configGroups.find((g) => g.name === vehicleInfo.grouping);
      const hasGeoTabSpreaderData = groupFromConfig?.hasGeoTabSpreaderData === true;

      // Handler for follow button
      const onFollowClick = (vehicle: AvlVehicle | null) => {
        if (vehicle) {
          setFollowingVehicle({ name: vehicle.vehicle_name, grouping: vehicle.grouping });
        } else {
          setFollowingVehicle(null);
        }
        // Re-show popup to update the follow button state
        if (popupFeatureRef.current) {
          showVehiclePopup(popupFeatureRef.current);
        }
      };

      // Handler for history button
      const onHistoryClick = () => {
        hidePopup();
        onHistoryPopupButtonClick(vehicleInfo);
      };

      // For plow vehicles with GeoTab spreader data, show popup with placeholders first
      if (vehicleInfo.subgrouping === "Plow" && hasGeoTabSpreaderData) {
        const initialInfo: AvlVehicle = {
          ...vehicleInfo,
          hasGeoTabSpreaderData: true,
          isPlowActive: vehicleInfo.isPlowActive ?? false,
          isSpreaderActive: vehicleInfo.isSpreaderActive ?? false,
          isWingActive: vehicleInfo.isWingActive ?? false,
          SpreaderRate: vehicleInfo.SpreaderRate ?? "Getting Data...",
          SurfaceTemperature: vehicleInfo.SurfaceTemperature ?? "Getting Data...",
          AirTemperature: vehicleInfo.AirTemperature ?? "Getting Data...",
          MaterialType: vehicleInfo.MaterialType ?? "Getting Data...",
        };

        // Show popup immediately with placeholders
        showPopupStore(
          coords,
          <AvlLivePopup
            key={`popup-${Date.now()}`}
            info={initialInfo}
            followingVehicleName={followingVehicle?.name || ""}
            onFollowClick={onFollowClick}
            onHistoryClick={onHistoryClick}
            onClose={hidePopup}
            showFollowButton={showFollowButton}
            showHistoryButton={showHistoryButton}
          />,
          "Avl",
        );

        // Fetch diagnostic data asynchronously
        const diagnosticData = await fetchGeoTabDiagnostics(vehicleInfo);

        if (diagnosticData && popupFeatureRef.current === feature) {
          const updatedInfo: AvlVehicle = {
            ...vehicleInfo,
            ...diagnosticData,
            hasGeoTabSpreaderData: true,
            isPlowActive: vehicleInfo.isPlowActive ?? false,
            isSpreaderActive: vehicleInfo.isSpreaderActive ?? false,
            isWingActive: vehicleInfo.isWingActive ?? false,
          };

          // Update the feature's vehicleInfo so follow updates also have the data
          feature.vehicleInfo = updatedInfo;

          // Update popup content with diagnostic data
          updateContent(
            <AvlLivePopup
              key={`popup-${Date.now()}`}
              info={updatedInfo}
              followingVehicleName={followingVehicle?.name || ""}
              onFollowClick={onFollowClick}
              onHistoryClick={onHistoryClick}
              onClose={hidePopup}
              showFollowButton={showFollowButton}
              showHistoryButton={showHistoryButton}
            />,
          );
        }
      } else {
        // For non-plow vehicles, show popup immediately with available data
        showPopupStore(
          coords,
          <AvlLivePopup
            key={`popup-${Date.now()}`}
            info={{
              ...vehicleInfo,
              hasGeoTabSpreaderData: hasGeoTabSpreaderData || false,
            }}
            followingVehicleName={followingVehicle?.name || ""}
            onFollowClick={onFollowClick}
            onHistoryClick={onHistoryClick}
            onClose={hidePopup}
            showFollowButton={showFollowButton}
            showHistoryButton={showHistoryButton}
          />,
          "Avl",
        );
      }
    },
    [configGroups, followingVehicle, showFollowButton, showHistoryButton, setFollowingVehicle, showPopupStore, updateContent, hidePopup, fetchGeoTabDiagnostics, onHistoryPopupButtonClick],
  );

  // Handle map click
  const handleMapClick = useCallback(
    (evt: { pixel: number[] }) => {
      if (!map || !layerRef.current) return;

      map.forEachFeatureAtPixel(
        evt.pixel,
        (feature) => {
          if (feature instanceof Feature) {
            const vehicleFeature = feature as Feature & { vehicleInfo?: AvlVehicle };
            if (vehicleFeature.vehicleInfo) {
              showVehiclePopup(vehicleFeature as Feature & { vehicleInfo: AvlVehicle });
            }
          }
        },
        {
          layerFilter: (layer) => {
            return layer.get("name") === "avlLive" && layer.getVisible() && layer instanceof VectorLayer;
          },
        },
      );
    },
    [map, showVehiclePopup],
  );

  // Fetch current locations for all allowed groups
  const fetchCurrentLocationsForAllGroups = useCallback(async () => {
    const sortOrder = sortAscendingChecked ? "ASC" : "DESC";
    const updatedGroups = [...configGroups];

    // Filter groups that need to be fetched
    const groupsToFetch = updatedGroups.filter((group) => {
      if (!allowedGroups.includes(group.name)) return false;
      // For GeoTab groups that already have devices, skip
      if (group.isGeoTabDevice && geoTabDevices[group.name]?.length > 0) {
        return false;
      }
      return true;
    });

    // Fetch all groups in parallel
    const fetchPromises = groupsToFetch.map(async (group) => {
      try {
        const result = await fetchCurrentLocations(group.name, selectedSortOption.value, sortOrder);
        return { group, result };
      } catch (error) {
        console.error(`Error fetching data for group ${group.name}:`, error);
        return { group, result: null };
      }
    });

    const results = await Promise.all(fetchPromises);

    // Process results and update groups
    const geoTabAuthPromises: Promise<void>[] = [];
    for (const { group, result } of results) {
      if (Array.isArray(result)) {
        const groupIndex = updatedGroups.findIndex((g) => g.name === group.name);
        if (groupIndex !== -1) {
          updatedGroups[groupIndex] = { ...updatedGroups[groupIndex], data: result as AvlVehicle[] };
        }
        // For GeoTab groups, start authentication (in parallel)
        if (group.isGeoTabDevice) {
          geoTabAuthPromises.push(authenticateAndGetDevices(group, result as AvlVehicle[]));
        }
      }
    }

    // Wait for all GeoTab authentications to complete (they run in parallel)
    if (geoTabAuthPromises.length > 0) {
      await Promise.all(geoTabAuthPromises);
    }

    setConfigGroups(updatedGroups);
    sortVehicles(updatedGroups);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedGroups, configGroups, fetchCurrentLocations, geoTabDevices, selectedSortOption, sortAscendingChecked, setConfigGroups]);

  // Keep ref updated with latest callback
  useEffect(() => {
    fetchCurrentLocationsRef.current = fetchCurrentLocationsForAllGroups;
  }, [fetchCurrentLocationsForAllGroups]);

  // Authenticate with GeoTab and get devices
  const authenticateAndGetDevices = useCallback(
    async (group: AvlGroup, vehicles: AvlVehicle[]) => {
      const credentials = await authenticateGeoTab(group);
      if (credentials) {
        await fetchGeoTabDevices(group, credentials, vehicles);
      }
    },
    [authenticateGeoTab, fetchGeoTabDevices],
  );

  // Get GeoTab current locations (real-time updates)
  const getGeoTabCurrentLocations = useCallback(async () => {
    if (Object.keys(geoTabDevices).length === 0) return;

    for (const groupName of allowedGroups) {
      const groupConfig = configGroups.find((g) => g.name === groupName);
      if (!groupConfig?.isGeoTabDevice || !groupConfig.visible) continue;
      if (!geoTabDevices[groupName] || !geoTabCredentials[groupName]) continue;

      const deviceIds = geoTabDevices[groupName].map((d: GeoTabDevice) => d.id);
      const credentials = geoTabCredentials[groupName];

      try {
        const statusInfo = await fetchDeviceStatusInfo(deviceIds, credentials);
        if (statusInfo.length > 0) {
          // Use ref to avoid circular dependency
          updateVehiclesFromGeoTabRef.current?.(groupName, statusInfo);
        }
      } catch (error) {
        console.error(`GeoTab API error for group ${groupName}:`, error);
      }
    }
  }, [allowedGroups, configGroups, geoTabDevices, geoTabCredentials, fetchDeviceStatusInfo]);

  // Keep ref updated with latest callback
  useEffect(() => {
    getGeoTabCurrentLocationsRef.current = getGeoTabCurrentLocations;
  }, [getGeoTabCurrentLocations]);

  // Update vehicles from GeoTab status info
  const updateVehiclesFromGeoTab = useCallback(
    (
      groupName: string,
      statusInfo: Array<{
        latitude: number;
        longitude: number;
        speed?: number;
        bearing?: number;
        dateTime: string;
        device: { id: string };
        exceptionEvents?: Array<{ rule?: { id: string }; diagnostic?: { id: string } }>;
      }>,
    ) => {
      const devices = geoTabDevices[groupName];
      if (!devices) return;

      const updatedGroups = configGroups.map((group) => {
        if (group.name !== groupName || !group.data || !Array.isArray(group.data)) {
          return group;
        }

        const updatedData = group.data.map((vehicle) => {
          const matchingDevice = statusInfo.find((info) => {
            const device = devices.find((d: GeoTabDevice) => d.id === info.device.id);
            if (!device) return false;
            const cleanedName = cleanDeviceNameForMatching(device.name, groupName);
            return vehicle.vehicle_name === cleanedName || (parseInt(cleanedName) && parseInt(vehicle.vehicle_name) && parseInt(cleanedName) === parseInt(vehicle.vehicle_name));
          });

          if (!matchingDevice) return vehicle;

          // Check for plow and spreader active states
          let isPlowActive = false;
          let isSpreaderActive = false;
          let isWingActive = false;

          if (matchingDevice.exceptionEvents) {
            matchingDevice.exceptionEvents.forEach((event) => {
              if (event.rule?.id === "RuleMaterialManagementPlowActiveId") {
                isPlowActive = true;
              }
              if (event.rule?.id === "RuleMaterialManagementSolidApplicationId") {
                isSpreaderActive = true;
              }
              if (event.diagnostic?.id === "DiagnosticThirdPartyAux7Id") {
                isWingActive = true;
              }
            });
          }

          return {
            ...vehicle,
            latitude: matchingDevice.latitude,
            longitude: matchingDevice.longitude,
            velocity: matchingDevice.speed || vehicle.velocity,
            direction: matchingDevice.bearing || vehicle.direction,
            date: matchingDevice.dateTime,
            isPlowActive,
            isSpreaderActive,
            isWingActive,
          };
        });

        return { ...group, data: updatedData };
      });

      setConfigGroups(updatedGroups);
      sortVehicles(updatedGroups);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [configGroups, geoTabDevices, setConfigGroups],
  );

  // Keep ref updated with latest callback
  useEffect(() => {
    updateVehiclesFromGeoTabRef.current = updateVehiclesFromGeoTab;
  }, [updateVehiclesFromGeoTab]);

  // Sort and filter vehicles
  const sortVehicles = useCallback(
    (groups: AvlGroup[] = configGroups) => {
      const vehicleList: AvlVehicle[] = [];
      const vehicleKeys = new Set<string>();

      for (const group of groups) {
        if (!group.visible || !group.data || !Array.isArray(group.data)) continue;

        for (const subGroup of group.subGroups) {
          if (!subGroup.visible) continue;

          for (const vehicle of group.data) {
            if (vehicle.subgrouping !== subGroup.name) continue;

            const vehicleKey = `${vehicle.grouping}-${vehicle.subgrouping}-${vehicle.vehicle_name}`;
            if (vehicleKeys.has(vehicleKey)) continue;

            vehicleKeys.add(vehicleKey);
            const enrichedVehicle = addVehicleInfo(vehicle, subGroup);
            enrichedVehicle.hasGeoTabSpreaderData = group.hasGeoTabSpreaderData === true;
            vehicleList.push(enrichedVehicle);
          }
        }
      }

      // Sort vehicles
      let sortedVehicles = [...vehicleList];
      if (selectedSortOption.value === "vehicle_name") {
        sortedVehicles = sortAscendingChecked ? sortedVehicles.sort(sortByVehicleIdAsc) : sortedVehicles.sort(sortByVehicleIdDesc);
      } else if (selectedSortOption.value === "velocity") {
        sortedVehicles = sortAscendingChecked ? sortedVehicles.sort(sortBySpeedAsc) : sortedVehicles.sort(sortBySpeedDesc);
      } else if (selectedSortOption.value === "date") {
        sortedVehicles = sortAscendingChecked ? sortedVehicles.sort(sortByDateAsc) : sortedVehicles.sort(sortByDateDesc);
      }

      setVehicles(sortedVehicles);
      updateMap(sortedVehicles);

      // Update trips tab visibility
      const hasShowTripsTab = groups.some((g) => g.visible === true && g.showTripsTab === true);
      onPlowVehiclesUpdate?.(hasShowTripsTab);

      // Update plow groups for trips
      const groupsWithVehicles = groups
        .filter((g) => g.visible === true && g.showTripsTab === true)
        .map((g) => ({
          ...g,
          vehicles: Array.isArray(g.data) ? g.data.filter((v) => v.subgrouping === "Plow") : [],
        }));
      onPlowGroupsUpdate?.(groupsWithVehicles);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [configGroups, selectedSortOption, sortAscendingChecked, setVehicles, onPlowVehiclesUpdate, onPlowGroupsUpdate],
  );

  // Update map with vehicles
  const updateMap = useCallback((vehicleList: AvlVehicle[]) => {
    if (!layerRef.current) {
      return;
    }

    const source = layerRef.current.getSource();
    if (!source) {
      return;
    }

    // Hide features that are no longer visible
    source.getFeatures().forEach((feature) => {
      const featInfo = (feature as Feature & { vehicleInfo?: AvlVehicle }).vehicleInfo;
      if (!featInfo) return;

      const found = vehicleList.find((v) => v.vehicle_name === featInfo.vehicle_name && v.grouping === featInfo.grouping);
      if (!found) {
        feature.setStyle(new Style({}));
      } else {
        setFeatureStyle(feature as Feature & { vehicleInfo: AvlVehicle });
      }
    });

    // Add/update features
    vehicleList.forEach((vehicle) => {
      const coords = toWebMercatorFromLatLong([vehicle.longitude, Math.abs(vehicle.latitude)]);
      const existingFeature = getFeatureForVehicle(vehicle);

      if (!existingFeature) {
        const newFeature = new Feature(new Point(coords)) as unknown as Feature & { vehicleInfo: AvlVehicle };
        newFeature.set("name", vehicle.vehicle_name);
        newFeature.set("grouping", vehicle.grouping);
        newFeature.vehicleInfo = vehicle;
        setFeatureStyle(newFeature);
        source.addFeature(newFeature);
      } else {
        // Animate existing feature
        animateFeature(existingFeature, vehicle, coords);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get feature for a vehicle
  const getFeatureForVehicle = useCallback((vehicle: AvlVehicle): (Feature & { vehicleInfo: AvlVehicle }) | null => {
    if (!layerRef.current) return null;
    const source = layerRef.current.getSource();
    if (!source) return null;

    let found: (Feature & { vehicleInfo: AvlVehicle }) | null = null;
    source.getFeatures().forEach((feature) => {
      const featInfo = (feature as Feature & { vehicleInfo?: AvlVehicle }).vehicleInfo;
      if (featInfo?.vehicle_name === vehicle.vehicle_name && featInfo?.grouping === vehicle.grouping) {
        found = feature as Feature & { vehicleInfo: AvlVehicle };
      }
    });
    return found;
  }, []);

  // Animate feature movement
  const animateFeature = useCallback(
    (feature: Feature & { vehicleInfo: AvlVehicle; isAnimating?: boolean }, newVehicle: AvlVehicle, newCoords: [number, number]) => {
      const oldCoords = (feature.getGeometry() as Point)?.getCoordinates();
      if (!oldCoords || feature.isAnimating) return;

      // Check if position changed
      if (feature.vehicleInfo.latitude === newVehicle.latitude && feature.vehicleInfo.longitude === newVehicle.longitude) {
        return;
      }

      // Create line between old and new
      const line = new LineString([oldCoords, newCoords]);
      feature.isAnimating = true;

      for (let i = 0.01; i < 1; i += 0.01) {
        ((index) => {
          setTimeout(() => {
            const pointInterval = line.getCoordinateAt(index);
            feature.setGeometry(new Point(pointInterval));
          }, index * 1000);
        })(i);
      }

      feature.isAnimating = false;
      feature.vehicleInfo = newVehicle;
      setFeatureStyle(feature);

      // Update popup if following this vehicle
      if (followingVehicle?.name === newVehicle.vehicle_name && followingVehicle?.grouping === newVehicle.grouping) {
        map?.getView().animate({ center: newCoords, zoom: 17 });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [followingVehicle, map],
  );

  // Set feature style
  const setFeatureStyle = useCallback((feature: Feature & { vehicleInfo: AvlVehicle }) => {
    const vehicleInfo = feature.vehicleInfo;
    const diffDays = dateDiffInDays(new Date(vehicleInfo.date), new Date());

    let iconName = vehicleInfo.imageName || "default.png";

    // Determine plow icon based on status
    if (vehicleInfo.subgrouping === "Plow" && vehicleInfo.hasGeoTabSpreaderData) {
      const isPlowOrWingActive = vehicleInfo.isPlowActive || vehicleInfo.isWingActive;
      if (isPlowOrWingActive && vehicleInfo.isSpreaderActive) {
        iconName = "plow_red.png";
      } else if (isPlowOrWingActive && !vehicleInfo.isSpreaderActive) {
        iconName = "plow_green.png";
      } else if (!isPlowOrWingActive && vehicleInfo.isSpreaderActive) {
        iconName = "plow_orange.png";
      } else {
        iconName = "plow.png";
      }
    }

    const style = new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        src: getImagePath(iconName),
        rotation: (vehicleInfo.direction || 0) * (Math.PI / 180),
        opacity: diffDays > 1 ? 0.4 : 1,
      }),
    });

    feature.setStyle(style);
  }, []);

  // Handle sort dropdown change
  const handleSortDropDownChange = (option: unknown) => {
    const sortOption = option as SortOption | null;
    if (sortOption) {
      setSelectedSortOption(sortOption);
      // Note: sortVehicles is called via useEffect when selectedSortOption changes
    }
  };

  // Handle sort checkbox change
  const handleSortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSortAscendingChecked(e.target.checked);
    // Note: sortVehicles is called via useEffect when sortAscendingChecked changes
  };

  // Handle labels checkbox change
  const handleLabelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowLabels(e.target.checked);
    // Note: sortVehicles is called via useEffect when showLabels changes
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  // Handle vehicle list item click
  const handleVehicleListItemClick = (vehicle: AvlVehicle) => {
    const feature = getFeatureForVehicle(vehicle);
    if (feature && map) {
      const coords = (feature.getGeometry() as Point)?.getCoordinates();
      if (coords) {
        map.getView().animate({ center: coords, zoom: 17 });
        // Show popup for the vehicle
        showVehiclePopup(feature);
      }
    }
  };

  // Handle group visibility change
  const handleGroupChange = (group: AvlGroup, checked: boolean) => {
    setGroupVisibility(group.name, checked);
    // Note: sortVehicles is called via useEffect when configGroups changes
    // This avoids the race condition where sortVehicles uses stale configGroups
  };

  // Handle subgroup visibility change
  const handleSubGroupChange = (subGroup: AvlSubGroup, group: AvlGroup, checked: boolean) => {
    setSubGroupVisibility(group.name, subGroup.name, checked);
    // Note: sortVehicles is called via useEffect when configGroups changes
    // This avoids the race condition where sortVehicles uses stale configGroups
  };

  // Handle group panel open/close
  const handlePanelOpen = (group: AvlGroup, open: boolean) => {
    setGroupOpen(group.name, open);
  };

  // Handle follow click
  const handleFollowClick = (vehicle: AvlVehicle | null) => {
    if (vehicle) {
      setFollowingVehicle({ name: vehicle.vehicle_name, grouping: vehicle.grouping });
    } else {
      setFollowingVehicle(null);
    }
  };

  // Filter vehicles by search text
  const filteredVehicles = searchText ? vehicles.filter((v) => v.vehicle_name.toUpperCase().includes(searchText.toUpperCase())) : vehicles;

  return (
    <div className={showVehicleList ? "sc-avl-live-container" : "sc-avl-live-container-no-list"}>
      {/* Following message */}
      <div className={followingVehicle ? "sc-avl-live-following-msg" : "sc-hidden"}>
        <label className="sc-avl-live-following-msg-label">{"Following: " + (followingVehicle?.name || "")}</label>
        <button className="sc-button" style={{ width: "60px" }} onClick={() => handleFollowClick(null)}>
          Stop
        </button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="sc-theme-avl-live-groups" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0" }}>
          <svg style={{ width: "48px", height: "48px", animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <span style={{ marginTop: "8px", fontSize: "14px", color: "#6b7280" }}>Loading vehicle groups...</span>
        </div>
      )}

      {/* Groups */}
      {!isLoading && (
        <div className="sc-theme-avl-live-groups">
          {configGroups.map((group) => (
            <AvlLiveGroup key={group.name} info={group} onInputChangeSubGroup={handleSubGroupChange} onInputChangeGroup={handleGroupChange} onPanelOpen={handlePanelOpen} />
          ))}
        </div>
      )}

      {/* Vehicle list */}
      <div className={showVehicleList && !isLoading ? "sc-avl-live-vehicles" : "sc-hidden"}>
        <div className="sc-title sc-border-bottom" style={{ fontSize: "12pt" }}>
          Avl Vehicles
        </div>
        <div className="sc-avl-live-vehicles-container sc-container">
          <div className="sc-avl-live-controls">
            {/* Search */}
            <div className="sc-avl-live-controls-search">
              <label>Search:</label>
              <input className="sc-avl-live-controls-search-input" type="text" placeholder=" Enter Vehicle Name..." onChange={handleSearchChange} value={searchText} />
              <button className="sc-button" onClick={() => setSearchText("")}>
                Clear
              </button>
            </div>

            {/* Sort */}
            <div className="sc-avl-live-controls-sort">
              <label style={{ width: "106px" }}>Sort By:</label>
              <Select styles={avlLiveDropDownStyles} isSearchable={false} onChange={handleSortDropDownChange} options={SORT_OPTIONS} value={selectedSortOption} />
              <div style={{ fontSize: "11pt", paddingLeft: "5px" }}>
                <label>
                  <input type="checkbox" onChange={handleSortChange} checked={sortAscendingChecked} />
                  Sort Ascending
                </label>
                <label>
                  <input type="checkbox" onChange={handleLabelsChange} checked={showLabels} />
                  Show Labels
                </label>
              </div>
            </div>
          </div>

          {/* Vehicle list items */}
          {filteredVehicles.map((vehicle) => (
            <AvlLiveVehicle key={`${vehicle.grouping}-${vehicle.subgrouping}-${vehicle.vehicle_name}`} info={vehicle} onVechileClick={handleVehicleListItemClick} />
          ))}
        </div>
      </div>
    </div>
  );
}
