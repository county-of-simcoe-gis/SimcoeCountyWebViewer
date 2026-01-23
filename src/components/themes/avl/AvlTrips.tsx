"use client";

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAvlStore } from "@/stores/avlStore";
import { useAvlApi } from "./hooks/useAvlApi";
import { useGeoTab } from "./hooks/useGeoTab";
import AvlTripsResults from "./components/AvlTripsResults";
import type { AvlTripsProps, AvlGroup, GeoTabCredentials, GeoTabDevice } from "./types/avl.types";
import "./styles/Avl.css";

export default function AvlTrips({ groups }: AvlTripsProps) {
  const filteredGroups = groups.filter((group) => group.showTripsTab === true);

  const { geoTabCredentials, geoTabDevices } = useAvlStore();
  const { fetchGeoTabRunList } = useAvlApi();
  const { authenticateGeoTab, fetchGeoTabDevices, cleanDeviceNameForMatching } = useGeoTab();

  const [selectedGroup, setSelectedGroup] = useState<string>(filteredGroups[0]?.name || "");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<unknown[]>([]);
  const [localCredentials, setLocalCredentials] = useState<Record<string, GeoTabCredentials>>({});
  const [localDevices, setLocalDevices] = useState<Record<string, GeoTabDevice[]>>({});

  const selectedGroupObject = filteredGroups.find((g) => g.name === selectedGroup);

  const vehicles = (
    filteredGroups.find((g) => g.name === selectedGroup)?.vehicles || []
  )
    .slice()
    .sort((a, b) => a.vehicle_name.localeCompare(b.vehicle_name));

  const ensureGeoTabCredentialsAndDevices = async (
    groupOption: AvlGroup
  ): Promise<{ credentials: GeoTabCredentials; devices: GeoTabDevice[] }> => {
    const existingCreds = geoTabCredentials[groupOption.name] || localCredentials[groupOption.name];
    const existingDevices = geoTabDevices[groupOption.name] || localDevices[groupOption.name];

    if (existingCreds && existingDevices) {
      return { credentials: existingCreds, devices: existingDevices };
    }

    const credentials = await authenticateGeoTab(groupOption);
    if (!credentials) {
      throw new Error(`Failed to authenticate for group ${groupOption.name}`);
    }

    const vehiclesToMatch = groupOption.vehicles || [];
    const devices = await fetchGeoTabDevices(groupOption, credentials, vehiclesToMatch);

    setLocalCredentials((prev) => ({ ...prev, [groupOption.name]: credentials }));
    setLocalDevices((prev) => ({ ...prev, [groupOption.name]: devices }));

    return { credentials, devices };
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const result = await fetchGeoTabRunList(startDate, endDate, selectedVehicleId || undefined);
      setSearchResults(result || []);
    } catch (error) {
      console.error("Error fetching trip data:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedGroup(filteredGroups[0]?.name || "");
    setSelectedVehicleId("");
    setStartDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    setEndDate(new Date());
    setSearchResults([]);
  };

  return (
    <div className="sc-avl-live-container">
      <div className="sc-description">View vehicle trip information for a specific date range.</div>
      <div className="sc-container">
        <div className="sc-theme-avl-history-control-row">
          <label className="sc-theme-avl-history-label">Group:</label>
          <select
            className="sc-input"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="">Select a group...</option>
            {filteredGroups.map((group, index) => (
              <option key={`group-${index}`} value={group.name}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sc-theme-avl-history-control-row">
          <label className="sc-theme-avl-history-label">Vehicle ID:</label>
          <select
            className="sc-input"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            disabled={!selectedGroup}
          >
            <option value="">Select a vehicle...</option>
            {vehicles.map((vehicle, index) => (
              <option key={`vehicle-${index}`} value={vehicle.vehicle_name}>
                {vehicle.vehicle_name}
              </option>
            ))}
          </select>
        </div>

        <div className="sc-theme-avl-history-control-row">
          <label className="sc-theme-avl-history-label">From:</label>
          <DatePicker
            className="sc-input sc-theme-avl-history-date-picker"
            selected={startDate}
            onChange={(date) => date && setStartDate(date)}
            showTimeSelect
            dateFormat="MMMM d, yyyy h:mm aa"
          />
        </div>

        <div className="sc-theme-avl-history-control-row">
          <label className="sc-theme-avl-history-label">To:</label>
          <DatePicker
            className="sc-input sc-theme-avl-history-date-picker"
            selected={endDate}
            onChange={(date) => date && setEndDate(date)}
            showTimeSelect
            dateFormat="MMMM d, yyyy h:mm aa"
          />
        </div>

        <div className="sc-theme-avl-history-control-row" style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
          <button
            className="sc-button"
            onClick={handleSearch}
            disabled={isLoading}
            style={{ width: "100px" }}
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
          <button className="sc-button" onClick={handleReset} style={{ width: "100px" }}>
            Reset
          </button>
        </div>
      </div>

      <AvlTripsResults
        results={searchResults}
        selectedVehicleId={selectedVehicleId}
        geoTabCredentials={{ ...geoTabCredentials, ...localCredentials }}
        geoTabDevices={{ ...geoTabDevices, ...localDevices }}
        selectedGroup={selectedGroupObject}
        cleanDeviceNameForMatching={cleanDeviceNameForMatching}
        ensureGeoTabCredentialsAndDevices={ensureGeoTabCredentialsAndDevices}
      />
    </div>
  );
}
