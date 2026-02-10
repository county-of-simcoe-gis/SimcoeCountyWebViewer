/**
 * Mock data for TogglerTool tests
 */

import type { TogglerLayer } from "@/stores/useTogglerStore";

/**
 * Mock toggler layers matching config.json structure
 */
export const mockTogglerLayers: TogglerLayer[] = [
  {
    label: "Unit Counts - Multi Residential",
    value: "Unit Counts - Multi Residential",
    serverUrl: "https://opengis2.simcoe.ca/geoserver",
    layerName: "Toggler_-_Multi_Residential",
    sourceTable: "TABULAR.dbo.tbl_toggle_waste_units_multi_res",
    wfsSource:
      "https://opengis.simcoe.ca/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=simcoe:Assessment%20Parcel&outputFormat=application/json",
    keyField: "arn",
    zIndex: 500,
    security_keywords: ["toggler_solid_waste"],
  },
  {
    label: "Unit Counts - Condo",
    value: "Unit Counts - Condo",
    serverUrl: "https://opengis2.simcoe.ca/geoserver",
    layerName: "Toggler_-_Condo",
    sourceTable: "TABULAR.dbo.tbl_toggle_waste_units_condo",
    wfsSource:
      "https://opengis.simcoe.ca/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=simcoe:Assessment%20Parcel&outputFormat=application/json",
    keyField: "arn",
    zIndex: 500,
    security_keywords: ["toggler_solid_waste"],
  },
  {
    label: "Customer Service - Road Segments",
    value: "Customer Service - Road Segments",
    serverUrl: "https://opengis2.simcoe.ca/geoserver",
    layerName: "Toggler_-_Customer_Service",
    sourceTable: "TABULAR.dbo.tbl_toggle_customer_service",
    wfsSource:
      "https://opengis.simcoe.ca/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=simcoe:Street%20Segments&outputFormat=application/json",
    keyField: "street_id",
    zIndex: 500,
    security_keywords: ["toggler_customer_service"],
  },
];

/**
 * Mock WFS feature collection response
 */
export const mockWfsFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "Assessment_Parcel.123",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-8859000, 5590000],
            [-8858900, 5590000],
            [-8858900, 5590100],
            [-8859000, 5590100],
            [-8859000, 5590000],
          ],
        ],
      },
      properties: {
        arn: "123456789012345",
        full_address: "123 Main St, Barrie",
        municipality: "Barrie",
      },
    },
  ],
};

/**
 * Mock WMS GetFeatureInfo response
 */
export const mockWmsFeatureInfo = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "Toggler_-_Multi_Residential.1",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-8859000, 5590000],
            [-8858900, 5590000],
            [-8858900, 5590100],
            [-8859000, 5590100],
            [-8859000, 5590000],
          ],
        ],
      },
      properties: {
        arn: "123456789012345",
        toggle_value: 1,
        last_updated: "2026-02-10T12:00:00Z",
        updated_by: "testuser",
      },
    },
  ],
};

/**
 * Mock WFS record count response (XML format)
 */
export const mockWfsRecordCountXml = `<?xml version="1.0" encoding="UTF-8"?>
<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0" 
                       numberOfFeatures="42"
                       timeStamp="2026-02-10T12:00:00.000Z">
</wfs:FeatureCollection>`;

/**
 * Mock toggler API success response
 */
export const mockTogglerApiSuccess = {
  status: "SUCCESS",
};

/**
 * Mock session with toggler permissions
 */
export const mockSessionWithTogglerAccess = {
  user: {
    name: "Test User",
    email: "testuser@simcoe.ca",
  },
  accessToken: "mock-access-token",
  roles: ["toggler_solid_waste"],
  expires: "2026-12-31",
};

/**
 * Mock session without toggler permissions
 */
export const mockSessionNoAccess = {
  user: {
    name: "Test User",
    email: "testuser@simcoe.ca",
  },
  accessToken: "mock-access-token",
  roles: ["public_user"],
  expires: "2026-12-31",
};
