"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaExclamationCircle } from "react-icons/fa";
import PanelComponent from "@/components/PanelComponent";
import { useMapStore } from "@/stores/mapStore";
import { useAppStore } from "@/stores/appStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { getAxiosClient } from "@/lib/axiosInstance";
import { getUID } from "@/utils/helpersCore";
import { unByKey } from "ol/Observable";
import type { EventsKey } from "ol/events";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Icon, Style } from "ol/style";
import { Point } from "ol/geom";
import { getPublicPath } from "@/utils/getPublicPath";
import AppImage from "@/components/shared/AppImage";
import { Feature } from "ol";
import GeoJSON from "ol/format/GeoJSON";
import { transform } from "ol/proj";
import config from "./config.json";

interface ExternalServicesToolProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
}

interface ServiceLink {
  name: string;
  url: string;
  requiresPropertyInfo: boolean;
}

interface ServiceGroup {
  groupName: string;
  icon: string;
  links: ServiceLink[];
}

interface ConfigType {
  groups: ServiceGroup[];
}

const typedConfig = config as ConfigType;

// Parcel URL template for WFS queries
const parcelURLTemplate = (mainURL: string, x: number, y: number) => `${mainURL}&cql_filter=INTERSECTS(geom,%20POINT%20(${x}%20${y}))`;

export default function ExternalServicesTool({ name = "External Services", helpLink, hideHeader = false, onClose, onSidebarVisibility }: ExternalServicesToolProps) {
  const { map } = useMapStore();
  const appConfig = useAppStore((state) => state.config);

  const [coords, setCoords] = useState<[number, number]>([0, 0]);
  const [address, setAddress] = useState<string>("");
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [markerLayerId, setMarkerLayerId] = useState<string | null>(null);

  // Convert Web Mercator coordinates to Lat/Long
  const toLatLongFromWebMercator = useCallback((coords: number[]): [number, number] => {
    const transformed = transform(coords, "EPSG:3857", "EPSG:4326");
    return [transformed[0], transformed[1]]; // [longitude, latitude]
  }, []);

  // Fetch address from parcel data
  const fetchAddress = useCallback(
    async (coords: number[]) => {
      const parcelLayerUrl = (appConfig as Record<string, unknown>)?.parcelLayer as { url?: string; rollNumberFieldName?: string } | undefined;
      const propertyReportUrl = (appConfig as Record<string, unknown>)?.propertyReportUrl as string | undefined;

      if (!parcelLayerUrl?.url || !propertyReportUrl) {
        console.warn("Parcel configuration not available");
        return;
      }

      setHasSearched(true);
      setIsLoadingAddress(true);
      setAddress("");

      const queryUrl = parcelURLTemplate(parcelLayerUrl.url, coords[0], coords[1]);

      try {
        const axiosClient = getAxiosClient(queryUrl);
        const response = await axiosClient.get(queryUrl);

        if (response.data.features.length === 0) {
          setIsLoadingAddress(false);
          return;
        }

        const geoJSON = new GeoJSON().readFeatures(response.data);
        const feature = geoJSON[0];

        if (feature) {
          const rollNumberField = parcelLayerUrl.rollNumberFieldName ?? "ARN";
          const properties = feature.getProperties();
          const arnKey = Object.keys(properties).find((k) => k.toLowerCase() === rollNumberField.toLowerCase());
          const arn = arnKey ? feature.get(arnKey) : undefined;
          if (!arn) {
            setIsLoadingAddress(false);
            return;
          }
          const infoURL = `${getPublicPath(propertyReportUrl)}${arn}`;
          const infoResponse = await axiosClient.get(infoURL);

          if (infoResponse.data.Address) {
            setAddress(infoResponse.data.Address);
          }
        }
      } catch (error) {
        console.error("Error fetching address:", error);
      } finally {
        setIsLoadingAddress(false);
      }
    },
    [appConfig],
  );

  // Update marker position and fetch address
  const updateMarker = useCallback(
    (coordinate: number[]) => {
      if (!markerLayerId) return;

      const managedLayer = LayerManager.getLayer(markerLayerId);
      if (managedLayer?.layer) {
        const source = (managedLayer.layer as VectorLayer<VectorSource>).getSource();
        const feature = new Feature(new Point(coordinate));
        source?.clear();
        source?.addFeature(feature);

        // Update coordinates
        const latLong = toLatLongFromWebMercator(coordinate);
        setCoords([latLong[0], latLong[1]]);

        // Fetch address for this location
        fetchAddress(coordinate);
      }
    },
    [markerLayerId, toLatLongFromWebMercator, fetchAddress],
  );

  // Initialize marker layer
  useEffect(() => {
    if (!map) return;

    const iconStyle = new Style({
      image: new Icon({
        src: getPublicPath("/images/tools/externalservices/marker.png"),
        anchor: [0.5, 1], // Bottom center of icon
      }),
    });

    const center = map.getView().getCenter();
    if (!center) return;

    const feature = new Feature(new Point(center));
    const vectorLayer = new VectorLayer({
      source: new VectorSource({ features: [feature] }),
      style: iconStyle,
    });

    const layerId = LayerManager.addLayer(vectorLayer, "Tools", "External Services Marker", {
      visible: true,
      suppressParcelClickAlways: true,
      suppressRightClick: true,
    });

    if (layerId) {
      setMarkerLayerId(layerId);

      // Initialize coordinates
      const latLong = toLatLongFromWebMercator(center);
      setCoords([latLong[0], latLong[1]]);

      // Fetch initial address
      fetchAddress(center);
    }

    return () => {
      if (layerId) {
        LayerManager.removeLayer(layerId);
        setMarkerLayerId(null);
      }
    };
  }, [map, toLatLongFromWebMercator, fetchAddress]);

  // Setup map click listener
  useEffect(() => {
    if (!map || !markerLayerId) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMapClick = (evt: any) => {
      updateMarker(evt.coordinate);
    };

    const clickKey = map.on("singleclick", handleMapClick) as EventsKey;

    return () => {
      unByKey(clickKey);
    };
  }, [map, markerLayerId, updateMarker]);

  // Handle close
  const handleClose = useCallback(() => {
    if (markerLayerId) {
      LayerManager.removeLayer(markerLayerId);
      setMarkerLayerId(null);
    }
    onClose();
  }, [markerLayerId, onClose]);

  return (
    <PanelComponent name={name} helpLink={helpLink} hideHeader={hideHeader} onClose={handleClose} onSidebarVisibility={onSidebarVisibility}>
      <div className="p-3 space-y-3 text-sm">
        <div className="text-base-content">
          Explore a selected location using a variety of external service providers (i.e. Google Maps, Bing Maps, and Open Street Map). Simply click on a location and select the desired link that
          appears.
        </div>

        {isLoadingAddress && (
          <div className="flex items-center gap-2 text-primary">
            <span className="loading loading-spinner loading-sm"></span>
            <span>Looking up address...</span>
          </div>
        )}

        {!isLoadingAddress && address && (
          <div className="alert alert-info py-2 px-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.003 3.5-4.697 3.5-8.327a8 8 0 10-16 0c0 3.63 1.556 6.324 3.5 8.327a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-medium">{address}</span>
          </div>
        )}

        {!isLoadingAddress && hasSearched && !address && (
          <div className="alert alert-warning py-2 px-3">
            <FaExclamationCircle className="h-4 w-4 shrink-0" />
            <span className="text-xs">No parcel found — search links will use coordinates instead</span>
          </div>
        )}

        <div className="space-y-3">
          {typedConfig.groups.map((group) => (
            <ServiceGroupComponent key={getUID()} group={group} coords={coords} address={address} isLoadingAddress={isLoadingAddress} />
          ))}
        </div>
      </div>
    </PanelComponent>
  );
}

// Service Group Component
interface ServiceGroupComponentProps {
  group: ServiceGroup;
  coords: [number, number];
  address: string;
  isLoadingAddress: boolean;
}

function ServiceGroupComponent({ group, coords, address, isLoadingAddress }: ServiceGroupComponentProps) {
  const buildUrl = useCallback(
    (link: ServiceLink): string => {
      const addressValue = link.requiresPropertyInfo && !address ? `${coords[1].toFixed(6)},${coords[0].toFixed(6)}` : address;
      return link.url
        .replace(/\$\{x\}/g, String(coords[0]))
        .replace(/\$\{y\}/g, String(coords[1]))
        .replace(/\$\{address\}/g, encodeURIComponent(addressValue));
    },
    [coords, address],
  );

  return (
    <div className="border border-base-300 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 p-3 bg-gradient-to-b from-base-100 to-base-200 border-b border-base-300">
        {}
        <AppImage src={`/images/tools/externalservices/${group.icon}`} alt={group.groupName} className="w-6 h-6 object-contain" />
        <span className="font-semibold text-base">{group.groupName}</span>
      </div>
      <div className="p-2 space-y-1">
        {group.links.map((link) => {
          const url = buildUrl(link);
          const isDisabled = isLoadingAddress;

          return (
            <a
              key={getUID()}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`bg-[url('/images/tools/externalservices/arrow_curve.gif')] bg-no-repeat bg-[position:10px_center] bg-[length:14px] no-underline text-inherit hover:underline block pl-8 py-1.5 text-sm hover:text-primary transition-colors ${
                isDisabled ? "opacity-50 pointer-events-none cursor-not-allowed" : ""
              }`}
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                }
              }}
            >
              {link.name}
            </a>
          );
        })}
      </div>
    </div>
  );
}
