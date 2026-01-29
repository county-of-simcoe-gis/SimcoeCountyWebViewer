"use client";

import React, { useState, useEffect } from "react";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Icon, Circle as CircleStyle, Fill, Stroke } from "ol/style";
import { useMapStore } from "@/stores/mapStore";
import { useGeoTab } from "../hooks/useGeoTab";
import { toWebMercatorFromLatLong, getFriendlyDateString } from "../utils/avlHelpers";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import type { AvlTripsResultsProps, GeoTabCredentials, GeoTabDevice, AvlGroup } from "../types/avl.types";

// Image helper
const getImagePath = (imageName: string): string => `/images/avl/${imageName}`;

// Legend Tooltip Component
function LegendTooltip({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "150px",
        width: "280px",
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
        <h3
          style={{
            margin: "0 0 10px 0",
            fontSize: "14px",
            borderBottom: "1px solid #eee",
            paddingBottom: "5px",
          }}
        >
          Trip Legend
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { label: "Blasting", image: "blasting.png" },
            { label: "Plow Down Spreader On", image: "plow-down-spreader-on.png" },
            { label: "Plow Down Spreader Off", image: "plow-down-spreader-off.png" },
            { label: "Plow Up Spreader On", image: "plow-up-spreader-on.png" },
            { label: "Plow Up Spreader Off", image: "plow-up-spreader-off.png" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "12px" }}>{item.label}</span>
              <img src={getImagePath(item.image)} alt={item.label} style={{ height: "20px" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AvlTripsResults({
  results,
  selectedVehicleId,
  geoTabCredentials,
  geoTabDevices,
  selectedGroup,
  cleanDeviceNameForMatching,
  ensureGeoTabCredentialsAndDevices,
}: AvlTripsResultsProps) {
  const { map } = useMapStore();
  const { fetchLogRecords, fetchSpreaderData, isActiveAtTime, findClosestStatusValue, STATUS_DATA_CONFIG } = useGeoTab();

  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [tripLayerIds, setTripLayerIds] = useState<string[]>([]);

  // Format date for display
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
      return getFriendlyDateString(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  // Clear trip layers from map
  const clearTripLayers = () => {
    tripLayerIds.forEach((layerId) => {
      LayerManager.removeLayer(layerId);
    });
    setTripLayerIds([]);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTripLayers();
    };
  }, []);

  // Get style for a feature based on spreader data
  const getStyle = (record: { PlowActive?: boolean; SpreaderActive?: boolean; Blasting?: boolean; direction?: number }): Style => {
    let iconName = "plow-up-spreader-off.png";

    if (record.Blasting) {
      iconName = "blasting.png";
    } else if (record.PlowActive && record.SpreaderActive) {
      iconName = "plow-down-spreader-on.png";
    } else if (record.PlowActive && !record.SpreaderActive) {
      iconName = "plow-down-spreader-off.png";
    } else if (!record.PlowActive && record.SpreaderActive) {
      iconName = "plow-up-spreader-on.png";
    }

    return new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        scale: 0.6,
        src: getImagePath(iconName),
        rotation: ((record.direction || 0) * Math.PI) / 180,
      }),
    });
  };

  // Handle zoom to trip
  const handleZoomClick = async (trip: { run_id: string; start_date: string; end_date: string }) => {
    if (!map || !selectedGroup) return;

    setIsLoading(trip.run_id);
    clearTripLayers();

    try {
      // Ensure we have credentials and devices
      const { credentials, devices } = await ensureGeoTabCredentialsAndDevices(selectedGroup);

      // Find the matching device
      const matchingDevice = devices.find((device) => {
        const cleanedName = cleanDeviceNameForMatching(device.name, selectedGroup.name);
        return cleanedName === selectedVehicleId || (parseInt(cleanedName) && parseInt(selectedVehicleId) && parseInt(cleanedName) === parseInt(selectedVehicleId));
      });

      if (!matchingDevice) {
        console.error("No matching device found for vehicle:", selectedVehicleId);
        setIsLoading(null);
        return;
      }

      // Fetch log records
      const startDate = new Date(trip.start_date);
      const endDate = new Date(trip.end_date);
      const logRecordsResponse = await fetchLogRecords([matchingDevice.id], startDate, endDate, credentials);

      if (!logRecordsResponse || logRecordsResponse.length === 0) {
        console.log("No log records found for trip");
        setIsLoading(null);
        return;
      }

      const logRecords = logRecordsResponse[0]?.records || [];

      // Fetch spreader data
      const spreaderData = await fetchSpreaderData([matchingDevice.id], startDate, endDate, credentials);

      // Create vector layer for the trip
      const source = new VectorSource();
      const layer = new VectorLayer({
        source,
        zIndex: 10000,
      });

      // Enrich log records with spreader data
      logRecords.forEach((record) => {
        const enrichedRecord = {
          ...record,
          PlowActive: isActiveAtTime(matchingDevice.id, record.dateTime, spreaderData.plowActiveEvents),
          SpreaderActive: isActiveAtTime(matchingDevice.id, record.dateTime, spreaderData.spreaderActiveEvents),
          SpreaderRate: findClosestStatusValue(matchingDevice.id, record.dateTime, spreaderData.spreaderRateData, STATUS_DATA_CONFIG.spreaderRate.matchWindowMinutes * 60 * 1000)?.value,
        };

        const coords = toWebMercatorFromLatLong([record.longitude, Math.abs(record.latitude)]);
        const feature = new Feature(new Point(coords));
        feature.setStyle(getStyle(enrichedRecord));
        feature.set("tripData", enrichedRecord);
        source.addFeature(feature);
      });

      // Use LayerManager with "Overlay" category for highest z-index
      const layerId = LayerManager.addLayer(layer, "Overlay", `AVL Trip ${result.vehicle_name}`, {
        userAdded: true,
      });
      setTripLayerIds((prev) => [...prev, layerId]);

      // Zoom to extent
      if (source.getFeatures().length > 0) {
        map.getView().fit(source.getExtent(), { padding: [50, 50, 50, 50] });
      }
    } catch (error) {
      console.error("Error loading trip:", error);
    } finally {
      setIsLoading(null);
    }
  };

  if (!results || results.length === 0) {
    return (
      <div className="sc-container" style={{ marginTop: "10px" }}>
        <div className="sc-description">No trip results to display.</div>
      </div>
    );
  }

  return (
    <div className="sc-container" style={{ marginTop: "10px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <label className="sc-title" style={{ marginBottom: "0" }}>
          Trip Results ({results.length})
        </label>
        <div style={{ display: "flex", gap: "5px" }}>
          <button className="sc-button" onClick={() => setShowLegend(!showLegend)}>
            Legend
          </button>
          <button className="sc-button" onClick={clearTripLayers}>
            Clear Map
          </button>
        </div>
      </div>

      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {results.map((trip, index) => {
          const typedTrip = trip as { run_id: string; start_date: string; end_date: string; vehicle_name?: string };
          return (
            <div
              key={`trip-${index}`}
              className="sc-theme-avl-history-vehicle-container"
              style={{
                padding: "8px",
                marginBottom: "5px",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "bold" }}>{typedTrip.vehicle_name || selectedVehicleId}</div>
                  <div style={{ fontSize: "10pt", color: "#666" }}>
                    {formatDate(typedTrip.start_date)} - {formatDate(typedTrip.end_date)}
                  </div>
                </div>
                <button className="sc-button" onClick={() => handleZoomClick(typedTrip)} disabled={isLoading === typedTrip.run_id} style={{ minWidth: "80px" }}>
                  {isLoading === typedTrip.run_id ? "Loading..." : "Zoom To"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showLegend && <LegendTooltip onClose={() => setShowLegend(false)} />}
    </div>
  );
}
