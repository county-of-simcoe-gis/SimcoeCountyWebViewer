"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { useAvlApi } from "./hooks/useAvlApi";
import { useGeoTab } from "./hooks/useGeoTab";
import AvlLiveGroup from "./components/AvlLiveGroup";
import AvlLiveVehicle from "./components/AvlLiveVehicle";
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
import type {
  AvlLiveProps,
  AvlVehicle,
  AvlGroup,
  AvlSubGroup,
  SortOption,
  GeoTabDevice,
} from "./types/avl.types";
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
  config,
  securityGroups,
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
  const { fetchCurrentLocations } = useAvlApi();
  const {
    authenticateGeoTab,
    fetchGeoTabDevices,
    fetchDeviceStatusInfo,
  } = useGeoTab();

  // Local refs
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const mapClickEventRef = useRef<EventsKey | null>(null);
  const fetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const geoTabIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize component
  useEffect(() => {
    if (!map) return;

    initLayers();
    if (useStorage) {
      loadFromStorage();
    }
    fetchCurrentLocationsForAllGroups();

    // Set up fetch interval
    fetchIntervalRef.current = setInterval(() => {
      fetchCurrentLocationsForAllGroups();
    }, FETCH_INTERVAL);

    // Set up GeoTab interval if we have GeoTab devices
    const hasGeoTabDevices = configGroups.some(
      (group) => allowedGroups.includes(group.name) && group.isGeoTabDevice
    );
    if (hasGeoTabDevices) {
      geoTabIntervalRef.current = setInterval(() => {
        getGeoTabCurrentLocations();
      }, GEOTAB_FETCH_INTERVAL);
    }

    // Set up map click handler
    mapClickEventRef.current = map.on("singleclick", handleMapClick);

    return () => {
      // Cleanup
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
      }
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
  }, [map, allowedGroups]);

  // Update layer visibility when mapVehiclesVisible changes
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setVisible(mapVehiclesVisible);
    }
  }, [mapVehiclesVisible]);

  // Initialize map layers
  const initLayers = useCallback(() => {
    if (!map || layerRef.current) return;

    const layer = new VectorLayer({
      source: new VectorSource({ features: [] }),
      zIndex: 1000000000000000000000,
    });
    layer.setProperties({ disableParcelClick: true, name: "avlLive" });
    layer.setZIndex(1000000000000000000000);
    map.addLayer(layer);
    layerRef.current = layer;
  }, [map]);

  // Handle map click
  const handleMapClick = useCallback(
    (evt: { pixel: number[] }) => {
      if (!map || !layerRef.current) return;

      map.forEachFeatureAtPixel(
        evt.pixel,
        (feature) => {
          if (feature instanceof Feature) {
            const vehicleInfo = (feature as Feature & { vehicleInfo?: AvlVehicle }).vehicleInfo;
            if (vehicleInfo) {
              console.log("Show popup for vehicle:", vehicleInfo.vehicle_name);
            }
          }
        },
        {
          layerFilter: (layer) => {
            return (
              layer.get("name") === "avlLive" &&
              layer.getVisible() &&
              layer instanceof VectorLayer
            );
          },
        }
      );
    },
    [map]
  );

  // Fetch current locations for all allowed groups
  const fetchCurrentLocationsForAllGroups = useCallback(async () => {
    const sortOrder = sortAscendingChecked ? "ASC" : "DESC";
    const updatedGroups = [...configGroups];

    for (const group of updatedGroups) {
      if (!allowedGroups.includes(group.name)) continue;

      // For GeoTab devices, only fetch initial data to set up device matching
      if (group.isGeoTabDevice) {
        if (!geoTabDevices[group.name] || geoTabDevices[group.name].length === 0) {
          try {
            const result = await fetchCurrentLocations(
              group.name,
              selectedSortOption.value,
              sortOrder
            );
            if (Array.isArray(result)) {
              const groupIndex = updatedGroups.findIndex((g) => g.name === group.name);
              if (groupIndex !== -1) {
                updatedGroups[groupIndex] = { ...updatedGroups[groupIndex], data: result };
              }
              // Authenticate and get devices
              authenticateAndGetDevices(group, result);
            }
          } catch (error) {
            console.error(`Error fetching data for group ${group.name}:`, error);
          }
        }
        continue;
      }

      // For non-GeoTab devices, fetch normally
      try {
        const result = await fetchCurrentLocations(
          group.name,
          selectedSortOption.value,
          sortOrder
        );
        if (Array.isArray(result)) {
          const groupIndex = updatedGroups.findIndex((g) => g.name === group.name);
          if (groupIndex !== -1) {
            updatedGroups[groupIndex] = { ...updatedGroups[groupIndex], data: result };
          }
        }
      } catch (error) {
        console.error(`Error fetching data for group ${group.name}:`, error);
      }
    }

    setConfigGroups(updatedGroups);
    sortVehicles(updatedGroups);
  }, [
    allowedGroups,
    configGroups,
    fetchCurrentLocations,
    geoTabDevices,
    selectedSortOption,
    sortAscendingChecked,
    setConfigGroups,
  ]);

  // Authenticate with GeoTab and get devices
  const authenticateAndGetDevices = useCallback(
    async (group: AvlGroup, vehicles: AvlVehicle[]) => {
      const credentials = await authenticateGeoTab(group);
      if (credentials) {
        await fetchGeoTabDevices(group, credentials, vehicles);
      }
    },
    [authenticateGeoTab, fetchGeoTabDevices]
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
          updateVehiclesFromGeoTab(groupName, statusInfo);
        }
      } catch (error) {
        console.error(`GeoTab API error for group ${groupName}:`, error);
      }
    }
  }, [
    allowedGroups,
    configGroups,
    geoTabDevices,
    geoTabCredentials,
    fetchDeviceStatusInfo,
  ]);

  // Update vehicles from GeoTab status info
  const updateVehiclesFromGeoTab = useCallback(
    (groupName: string, statusInfo: Array<{ latitude: number; longitude: number; speed?: number; bearing?: number; dateTime: string; device: { id: string }; exceptionEvents?: Array<{ rule?: { id: string }; diagnostic?: { id: string } }> }>) => {
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
            return (
              vehicle.vehicle_name === cleanedName ||
              (parseInt(cleanedName) &&
                parseInt(vehicle.vehicle_name) &&
                parseInt(cleanedName) === parseInt(vehicle.vehicle_name))
            );
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
    [configGroups, geoTabDevices, setConfigGroups]
  );

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
        sortedVehicles = sortAscendingChecked
          ? sortedVehicles.sort(sortByVehicleIdAsc)
          : sortedVehicles.sort(sortByVehicleIdDesc);
      } else if (selectedSortOption.value === "velocity") {
        sortedVehicles = sortAscendingChecked
          ? sortedVehicles.sort(sortBySpeedAsc)
          : sortedVehicles.sort(sortBySpeedDesc);
      } else if (selectedSortOption.value === "date") {
        sortedVehicles = sortAscendingChecked
          ? sortedVehicles.sort(sortByDateAsc)
          : sortedVehicles.sort(sortByDateDesc);
      }

      setVehicles(sortedVehicles);
      updateMap(sortedVehicles);

      // Update trips tab visibility
      const hasShowTripsTab = groups.some(
        (g) => g.visible === true && g.showTripsTab === true
      );
      onPlowVehiclesUpdate?.(hasShowTripsTab);

      // Update plow groups for trips
      const groupsWithVehicles = groups
        .filter((g) => g.visible === true && g.showTripsTab === true)
        .map((g) => ({
          ...g,
          vehicles: Array.isArray(g.data)
            ? g.data.filter((v) => v.subgrouping === "Plow")
            : [],
        }));
      onPlowGroupsUpdate?.(groupsWithVehicles);
    },
    [
      configGroups,
      selectedSortOption,
      sortAscendingChecked,
      setVehicles,
      onPlowVehiclesUpdate,
      onPlowGroupsUpdate,
    ]
  );

  // Update map with vehicles
  const updateMap = useCallback(
    (vehicleList: AvlVehicle[]) => {
      if (!layerRef.current) return;

      const source = layerRef.current.getSource();
      if (!source) return;

      // Hide features that are no longer visible
      source.getFeatures().forEach((feature) => {
        const featInfo = (feature as Feature & { vehicleInfo?: AvlVehicle }).vehicleInfo;
        if (!featInfo) return;

        const found = vehicleList.find(
          (v) =>
            v.vehicle_name === featInfo.vehicle_name && v.grouping === featInfo.grouping
        );
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
          const newFeature = new Feature(new Point(coords)) as Feature & { vehicleInfo: AvlVehicle };
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
    },
    []
  );

  // Get feature for a vehicle
  const getFeatureForVehicle = useCallback(
    (vehicle: AvlVehicle): (Feature & { vehicleInfo: AvlVehicle }) | null => {
      if (!layerRef.current) return null;
      const source = layerRef.current.getSource();
      if (!source) return null;

      let found: (Feature & { vehicleInfo: AvlVehicle }) | null = null;
      source.getFeatures().forEach((feature) => {
        const featInfo = (feature as Feature & { vehicleInfo?: AvlVehicle }).vehicleInfo;
        if (
          featInfo?.vehicle_name === vehicle.vehicle_name &&
          featInfo?.grouping === vehicle.grouping
        ) {
          found = feature as Feature & { vehicleInfo: AvlVehicle };
        }
      });
      return found;
    },
    []
  );

  // Animate feature movement
  const animateFeature = useCallback(
    (
      feature: Feature & { vehicleInfo: AvlVehicle; isAnimating?: boolean },
      newVehicle: AvlVehicle,
      newCoords: [number, number]
    ) => {
      const oldCoords = (feature.getGeometry() as Point)?.getCoordinates();
      if (!oldCoords || feature.isAnimating) return;

      // Check if position changed
      if (
        feature.vehicleInfo.latitude === newVehicle.latitude &&
        feature.vehicleInfo.longitude === newVehicle.longitude
      ) {
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
      if (
        followingVehicle?.name === newVehicle.vehicle_name &&
        followingVehicle?.grouping === newVehicle.grouping
      ) {
        map?.getView().animate({ center: newCoords, zoom: 17 });
      }
    },
    [followingVehicle, map]
  );

  // Set feature style
  const setFeatureStyle = useCallback(
    (feature: Feature & { vehicleInfo: AvlVehicle }) => {
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
    },
    [showLabels]
  );

  // Handle sort dropdown change
  const handleSortDropDownChange = (option: SortOption | null) => {
    if (option) {
      setSelectedSortOption(option);
      sortVehicles();
    }
  };

  // Handle sort checkbox change
  const handleSortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSortAscendingChecked(e.target.checked);
    sortVehicles();
  };

  // Handle labels checkbox change
  const handleLabelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowLabels(e.target.checked);
    sortVehicles();
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
      }
    }
  };

  // Handle group visibility change
  const handleGroupChange = (group: AvlGroup, checked: boolean) => {
    setGroupVisibility(group.name, checked);
    sortVehicles();
  };

  // Handle subgroup visibility change
  const handleSubGroupChange = (
    subGroup: AvlSubGroup,
    group: AvlGroup,
    checked: boolean
  ) => {
    setSubGroupVisibility(group.name, subGroup.name, checked);
    sortVehicles();
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
  const filteredVehicles = searchText
    ? vehicles.filter((v) =>
        v.vehicle_name.toUpperCase().includes(searchText.toUpperCase())
      )
    : vehicles;

  return (
    <div className={showVehicleList ? "sc-avl-live-container" : "sc-avl-live-container-no-list"}>
      {/* Following message */}
      <div className={followingVehicle ? "sc-avl-live-following-msg" : "sc-hidden"}>
        <label className="sc-avl-live-following-msg-label">
          {"Following: " + (followingVehicle?.name || "")}
        </label>
        <button
          className="sc-button"
          style={{ width: "60px" }}
          onClick={() => handleFollowClick(null)}
        >
          Stop
        </button>
      </div>

      {/* Groups */}
      <div className="sc-avl-live-groups">
        {configGroups.map((group) => (
          <AvlLiveGroup
            key={group.name}
            info={group}
            onInputChangeSubGroup={handleSubGroupChange}
            onInputChangeGroup={handleGroupChange}
            onPanelOpen={handlePanelOpen}
          />
        ))}
      </div>

      {/* Vehicle list */}
      <div className={showVehicleList ? "sc-avl-live-vehicles" : "sc-hidden"}>
        <div className="sc-title sc-border-bottom" style={{ fontSize: "12pt" }}>
          Avl Vehicles
        </div>
        <div className="sc-avl-live-vehicles-container sc-container">
          <div className="sc-avl-live-controls">
            {/* Search */}
            <div className="sc-avl-live-controls-search">
              <label>Search:</label>
              <input
                className="sc-avl-live-controls-search-input"
                type="text"
                placeholder=" Enter Vehicle Name..."
                onChange={handleSearchChange}
                value={searchText}
              />
              <button className="sc-button" onClick={() => setSearchText("")}>
                Clear
              </button>
            </div>

            {/* Sort */}
            <div className="sc-avl-live-controls-sort">
              <label style={{ width: "106px" }}>Sort By:</label>
              <Select
                styles={avlLiveDropDownStyles}
                isSearchable={false}
                onChange={handleSortDropDownChange}
                options={SORT_OPTIONS}
                value={selectedSortOption}
              />
              <div style={{ fontSize: "11pt" }}>
                <label>
                  <input
                    type="checkbox"
                    onChange={handleSortChange}
                    checked={sortAscendingChecked}
                  />
                  Sort Ascending
                </label>
                <label>
                  <input
                    type="checkbox"
                    onChange={handleLabelsChange}
                    checked={showLabels}
                  />
                  Show Labels
                </label>
              </div>
            </div>
          </div>

          {/* Vehicle list items */}
          {filteredVehicles.map((vehicle) => (
            <AvlLiveVehicle
              key={`${vehicle.grouping}-${vehicle.subgrouping}-${vehicle.vehicle_name}`}
              info={vehicle}
              onVechileClick={handleVehicleListItemClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
