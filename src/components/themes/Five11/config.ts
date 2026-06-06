/**
 * 511 Live Feeds Layer Configuration
 */

import type { Five11Config } from "./types";

export const five11Config: Five11Config = {
  wazeToggleLayers: [
    {
      apiUrl: "/api/public/map/theme/511/waze/alerts/ACCIDENT",
      layerName: "511-waze-accident",
      displayName: "Accidents",
      imageName: "waze_accident.png",
      clickable: true,
      visible: true,
      zIndex: 2209,
      geometryType: "Point",
    },
    {
      apiUrl: "/api/public/map/theme/511/waze/alerts/HAZARD",
      layerName: "511-waze-hazard",
      displayName: "Hazards",
      imageName: "waze_hazard.png",
      clickable: true,
      visible: false,
      zIndex: 2210,
      geometryType: "Point",
    },
    {
      apiUrl: "/api/public/map/theme/511/waze/alerts/CONSTRUCTION",
      layerName: "511-waze-construction",
      displayName: "Construction",
      imageName: "waze_construction.png",
      clickable: true,
      visible: false,
      zIndex: 2211,
      geometryType: "Point",
    },
    {
      apiUrl: "/api/public/map/theme/511/waze/alerts/ROAD_CLOSED",
      layerName: "511-waze-road-closed",
      displayName: "Road Closed",
      imageName: "waze_road_closed.png",
      clickable: true,
      visible: true,
      zIndex: 2212,
      geometryType: "Point",
    },
    {
      apiUrl: "/api/public/map/theme/511/waze/jams",
      layerName: "511-waze-jam-lines",
      displayName: "Traffic Jam (Lines)",
      imageName: "waze_traffic_jam_line.png",
      clickable: true,
      visible: true,
      zIndex: 2213,
      geometryType: "LineString",
    },
    {
      apiUrl: "/api/public/map/theme/511/waze/irregularities",
      layerName: "511-waze-irregularity-lines",
      displayName: "Irregularities (Lines)",
      imageName: "waze_irregularity_line.png",
      clickable: true,
      visible: false,
      zIndex: 2214,
      geometryType: "LineString",
    },
  ],
  mtoToggleLayers: [
    {
      apiUrl: "/api/public/map/theme/511/mto/CAMERAS",
      layerName: "511-mto-cameras",
      displayName: "Cameras",
      imageName: "mto_camera.png",
      clickable: true,
      visible: true,
      zIndex: 2216,
      geometryType: "Point",
    },
    {
      apiUrl: "/api/public/map/theme/511/mto/EVENTS",
      layerName: "511-mto-traffic-event",
      displayName: "Traffic Event",
      imageName: "mto_traffic_event.png",
      clickable: true,
      visible: false,
      zIndex: 2217,
      geometryType: "Point",
    },
    {
      apiUrl: "/api/public/map/theme/511/mto/CONSTRUCTION",
      layerName: "511-mto-construction",
      displayName: "Construction",
      imageName: "mto_construction.png",
      clickable: true,
      visible: false,
      zIndex: 2218,
      geometryType: "Point",
    },
  ],
};

// Fields to display in Waze popups
export const wazePopupFields = ["type", "subtype", "reportDescription", "date", "street"];

// Fields to display in MTO popups
export const mtoPopupFields = ["DirectionOfTravel", "Description", "LanesAffected", "EventType", "IsFullClosure", "Comment"];
