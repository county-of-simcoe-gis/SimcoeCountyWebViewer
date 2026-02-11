"use client";

import React, { useState, useEffect, useRef } from "react";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Icon, Style } from "ol/style";
import { transform } from "ol/proj";
import { unByKey } from "ol/Observable";
import CustomerServiceVectorLayerToggler from "./CustomerServiceVectorLayerToggler";
import { useMapStore } from "@/stores/mapStore";
import type { TicketInfo, TicketFeature } from "./types/customerservice.types";
import "./styles/CustomerServiceLayers.css";

const getImagePath = (imageName: string): string => `/images/customerservice/${imageName}`;

interface CustomerServiceLayersProps {
  visible: boolean;
}

interface TicketPopupContentProps {
  feature: TicketFeature;
}

/**
 * Set icon style on a feature based on its ticket status
 */
function setFeatureStyle(feature: Feature) {
  const ticketInfo = (feature as unknown as { ticketInfo: TicketInfo }).ticketInfo;
  if (!ticketInfo) return;

  let statusIcon = "logged.png";
  const status = ticketInfo.Status.toLowerCase();

  switch (status) {
    case "active":
    case "in progress":
    case "waiting":
    case "under review":
    case "needs rework":
    case "scheduled for precon meeting":
    case "approved":
    case "incomplete":
    case "in work order":
      statusIcon = "active.png";
      break;
    case "closed":
      statusIcon = "closed.png";
      break;
    case "information":
      statusIcon = "information.png";
      break;
    case "resolved":
    case "complete":
    case "merged":
    case "survey complete":
      statusIcon = "resolved.png";
      break;
    case "cancelled":
    case "rejected":
    case "junk":
      statusIcon = "cancelled.png";
      break;
    case "new":
    case "pending":
    default:
      statusIcon = "logged.png";
      break;
  }

  feature.setStyle(
    new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        src: getImagePath(statusIcon),
      }),
    }),
  );
}

/**
 * Fetch tickets from the NextJS API route and populate the vector layer
 */
async function fetchAndPopulateTickets(layer: VectorLayer<VectorSource>) {
  try {
    // Call our own API route — auth is handled via NextAuth session cookies
    const response = await fetch("/api/secure/customerservice/SFTickets");

    if (!response.ok) {
      console.error("Failed to fetch tickets:", response.statusText);
      return;
    }

    const result: TicketInfo[] = await response.json();

    layer.getSource()?.clear();

    if (result.length === 0) return;

    result.forEach((ticket) => {
      const x = parseFloat(ticket.X as unknown as string);
      const y = parseFloat(ticket.Y as unknown as string);
      // If coordinates look like WGS84 (lon/lat), reproject to Web Mercator
      const coords = x > -180 && x < 180 ? transform([x, y], "EPSG:4326", "EPSG:3857") : [x, y];

      const newFeature = new Feature(new Point(coords));
      (newFeature as unknown as { ticketInfo: TicketInfo }).ticketInfo = ticket;
      setFeatureStyle(newFeature);
      layer.getSource()?.addFeature(newFeature);
    });
  } catch (error) {
    console.error("Error updating tickets:", error);
  }
}

export default function CustomerServiceLayers({ visible }: CustomerServiceLayersProps) {
  const map = useMapStore((state) => state.map);
  const [ticketsLayer, setTicketsLayer] = useState<VectorLayer<VectorSource> | null>(null);
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const ticketsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  // Single initialization effect — runs once when map is available
  useEffect(() => {
    if (!map || initializedRef.current) return;
    initializedRef.current = true;

    // Create vector layer
    const layer = new VectorLayer({
      source: new VectorSource({ features: [] }),
      zIndex: 1000,
    });
    layer.setProperties({ disableParcelClick: true, name: "csTickets" });
    map.addLayer(layer);
    layerRef.current = layer;
    setTicketsLayer(layer);

    // Register map click handler
    const clickKey = map.on("click", (evt) => {
      // @ts-expect-error - window.isDrawingOrEditing is added by map tools
      if (window.isDrawingOrEditing) return;

      const feature = map.forEachFeatureAtPixel(
        evt.pixel,
        (feat) => {
          if ((feat as unknown as { ticketInfo?: TicketInfo }).ticketInfo !== undefined) return feat;
          return undefined;
        },
        {
          layerFilter: (l) => l.get("name") === "csTickets" && l.getVisible() && l instanceof VectorLayer,
        },
      );

      if (!feature) return;

      const popupContent = <TicketPopupContent feature={feature as unknown as TicketFeature} />;
      // @ts-expect-error - window.popup is added by map initialization
      window.popup?.show(evt.coordinate, popupContent, "Ticket Info");
    });

    // Initial fetch
    fetchAndPopulateTickets(layer);

    // Refresh every 30 seconds
    ticketsTimerRef.current = setInterval(() => {
      if (layerRef.current) fetchAndPopulateTickets(layerRef.current);
    }, 30000);

    // Cleanup
    return () => {
      if (ticketsTimerRef.current) clearInterval(ticketsTimerRef.current);
      unByKey(clickKey);
      map.removeLayer(layer);
      layerRef.current = null;
      initializedRef.current = false;
    };
  }, [map]);

  // Update visibility when visible prop changes
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setVisible(visible);
    }
  }, [visible]);

  if (!ticketsLayer) return null;

  return (
    <div className="sc-customer-service-tickets-main-container">
      <CustomerServiceVectorLayerToggler layer={ticketsLayer} displayName="Recent Tickets (2 weeks)" legendImage={getImagePath("ticketsLegend.png")} />
    </div>
  );
}

// Ticket Popup Content Component
function TicketPopupContent({ feature }: TicketPopupContentProps) {
  const ticketInfo = feature.ticketInfo;

  const handleOpenCase = () => {
    window.open(ticketInfo.Hyperlink, "_blank");
  };

  const handleClose = () => {
    // @ts-expect-error - window.popup is added by map initialization
    window.popup?.hide();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
        <div className="font-semibold">Created:</div>
        <div>{formatDate(ticketInfo.CreatedDateTime)}</div>

        <div className="font-semibold">Status:</div>
        <div>{ticketInfo.Status}</div>

        <div className="font-semibold">Subject:</div>
        <div>{ticketInfo.SubCategory}</div>

        <div className="font-semibold">Address:</div>
        <div>{ticketInfo.Location}</div>

        <div className="font-semibold">Category:</div>
        <div>{ticketInfo.Category}</div>

        <div className="font-semibold">Created By:</div>
        <div>{ticketInfo.CreatedBy}</div>

        <div className="font-semibold">Case Number:</div>
        <div>{ticketInfo.IncidentNumber}</div>
      </div>

      <div className="flex gap-2 pt-2">
        <button className="btn btn-primary btn-sm flex-1" onClick={handleOpenCase}>
          View Case
        </button>
        <button className="btn btn-ghost btn-sm flex-1" onClick={handleClose}>
          Close
        </button>
      </div>
    </div>
  );
}
