"use client";

import { useCallback } from "react";
import axios from "axios";
import { useAvlStore } from "@/stores/avlStore";
import { useAvlApi } from "./useAvlApi";
import type {
  GeoTabCredentials,
  GeoTabDevice,
  GeoTabExceptionEvent,
  GeoTabStatusData,
  GeoTabSpreaderData,
  AvlGroup,
  AvlVehicle,
} from "../types/avl.types";
import { cleanDeviceNameForMatching, isPurelyNumeric } from "../utils/avlHelpers";

const GEOTAB_API_URL = "https://my.geotab.com/apiv1";

// Status data configuration for fetching and matching
const STATUS_DATA_CONFIG = {
  spreaderRate: {
    diagnosticId: "DiagnosticSolidMaterialRateId",
    fetchBufferHours: 1,
    matchWindowMinutes: 60,
  },
  wing: {
    diagnosticId: "DiagnosticThirdPartyAux7Id",
    fetchBufferHours: 1,
    matchWindowMinutes: 15,
  },
  airTemperature: {
    diagnosticId: "DiagnosticOutsideTemperatureId",
    fetchBufferHours: 6,
    matchWindowMinutes: 360,
  },
  surfaceTemperature: {
    diagnosticId: "IoxWrksRoadTemperature",
    fetchBufferHours: 6,
    matchWindowMinutes: 360,
  },
  materialType: {
    diagnosticId: "DiagnosticSolidMaterialTypeId",
    fetchBufferHours: 12,
    matchWindowMinutes: 720,
  },
};

interface GeoTabApiResponse<T> {
  result?: T;
  error?: {
    message?: string;
  };
}

/**
 * Hook for making GeoTab API calls
 */
export function useGeoTab() {
  const { fetchGeoTabSessionId } = useAvlApi();
  const {
    geoTabCredentials,
    geoTabDevices,
    configGroups,
    setGeoTabCredentials,
    setGeoTabDevices,
  } = useAvlStore();

  /**
   * Make a POST request to the GeoTab API
   */
  const postToGeoTab = useCallback(
    async <T>(method: string, params: Record<string, unknown>): Promise<T | null> => {
      try {
        const response = await axios.post<GeoTabApiResponse<T>>(GEOTAB_API_URL, {
          method,
          params,
        });

        if (response.data.error) {
          console.error("GeoTab API error:", response.data.error);
          return null;
        }

        return response.data.result ?? null;
      } catch (error) {
        console.error("GeoTab API request failed:", error);
        return null;
      }
    },
    []
  );

  /**
   * Authenticate with GeoTab and get credentials
   */
  const authenticateGeoTab = useCallback(
    async (group: AvlGroup): Promise<GeoTabCredentials | null> => {
      // Check if credentials already exist
      if (geoTabCredentials[group.name]) {
        return geoTabCredentials[group.name];
      }

      // Check if geoTabAPIKey exists for this group
      if (!group.geoTabAPIKey) {
        console.error(`No geoTabAPIKey configured for group ${group.name}`);
        return null;
      }

      // Fetch credentials from our backend
      const result = await fetchGeoTabSessionId(group.geoTabAPIKey);

      if (!result || result.error) {
        console.error(`Failed to get GeoTab credentials for group ${group.name}:`, result?.error);
        return null;
      }

      const credentials: GeoTabCredentials = {
        sessionId: result.sessionId,
        database: result.database,
        userName: result.userName,
      };

      // Store credentials in state
      setGeoTabCredentials(group.name, credentials);

      return credentials;
    },
    [geoTabCredentials, fetchGeoTabSessionId, setGeoTabCredentials]
  );

  /**
   * Fetch devices from GeoTab API for a group
   */
  const fetchGeoTabDevices = useCallback(
    async (
      group: AvlGroup,
      credentials: GeoTabCredentials,
      vehiclesToMatch: AvlVehicle[]
    ): Promise<GeoTabDevice[]> => {
      // Fetch all devices
      const devices = await postToGeoTab<GeoTabDevice[]>("Get", {
        typeName: "Device",
        credentials: {
          database: credentials.database,
          sessionId: credentials.sessionId,
          userName: credentials.userName,
          date: new Date().toISOString(),
        },
      });

      if (!devices) {
        return [];
      }

      // Filter devices that match our vehicles
      const matchingDevices = devices.filter((device) => {
        const cleanedName = cleanDeviceNameForMatching(device.name, group.name).trim();
        const cleanedIsPurelyNumeric = isPurelyNumeric(cleanedName);

        return vehiclesToMatch.some((vehicle) => {
          const vehicleName = vehicle.vehicle_name?.trim();

          // Exact match
          if (cleanedName === vehicleName) return true;

          // Numeric match only if BOTH are purely numeric
          if (cleanedIsPurelyNumeric && isPurelyNumeric(vehicleName)) {
            const cleanedNum = parseInt(cleanedName);
            const vehicleNum = parseInt(vehicleName);
            return cleanedNum && vehicleNum && cleanedNum === vehicleNum;
          }

          return false;
        });
      });

      // Store devices in state
      setGeoTabDevices(group.name, matchingDevices);

      return matchingDevices;
    },
    [postToGeoTab, setGeoTabDevices]
  );

  /**
   * Fetch current device status info from GeoTab
   */
  const fetchDeviceStatusInfo = useCallback(
    async (
      deviceIds: string[],
      credentials: GeoTabCredentials
    ): Promise<Array<{ latitude: number; longitude: number; speed?: number; bearing?: number; dateTime: string; device: { id: string }; exceptionEvents?: Array<{ rule?: { id: string }; diagnostic?: { id: string } }> }>> => {
      const result = await postToGeoTab<Array<{ latitude: number; longitude: number; speed?: number; bearing?: number; dateTime: string; device: { id: string }; exceptionEvents?: Array<{ rule?: { id: string }; diagnostic?: { id: string } }> }>>("Get", {
        typeName: "DeviceStatusInfo",
        credentials: {
          database: credentials.database,
          sessionId: credentials.sessionId,
          userName: credentials.userName,
          date: new Date().toISOString(),
        },
        search: {
          deviceIds,
        },
      });

      return result || [];
    },
    [postToGeoTab]
  );

  /**
   * Fetch exception events from GeoTab (PlowActive, SpreaderActive)
   */
  const fetchExceptionEvents = useCallback(
    async (
      deviceIds: string[],
      fromDate: Date,
      toDate: Date,
      credentials: GeoTabCredentials,
      ruleId: string
    ): Promise<GeoTabExceptionEvent[]> => {
      // Build calls for each device
      const calls = deviceIds.map((deviceId) => ({
        method: "Get",
        params: {
          typeName: "ExceptionEvent",
          resultsLimit: 10000,
          search: {
            deviceSearch: { id: deviceId },
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString(),
            ruleSearch: { id: ruleId },
          },
        },
      }));

      interface ExceptionEventRaw {
        activeFrom: string;
        activeTo: string;
      }

      const result = await postToGeoTab<ExceptionEventRaw[][]>("ExecuteMultiCall", {
        calls,
        credentials: {
          database: credentials.database,
          sessionId: credentials.sessionId,
          userName: credentials.userName,
        },
      });

      if (!result) return [];

      // Flatten and transform results
      const events: GeoTabExceptionEvent[] = [];
      result.forEach((deviceEvents, index) => {
        if (deviceEvents && Array.isArray(deviceEvents)) {
          deviceEvents.forEach((event) => {
            events.push({
              deviceId: deviceIds[index],
              activeFrom: new Date(event.activeFrom),
              activeTo: new Date(event.activeTo),
            });
          });
        }
      });

      return events;
    },
    [postToGeoTab]
  );

  /**
   * Fetch status data from GeoTab (spreader rate, temperatures, etc.)
   */
  const fetchStatusData = useCallback(
    async (
      deviceIds: string[],
      fromDate: Date,
      toDate: Date,
      credentials: GeoTabCredentials,
      diagnosticId: string
    ): Promise<GeoTabStatusData[]> => {
      // Build calls for each device
      const calls = deviceIds.map((deviceId) => ({
        method: "Get",
        params: {
          typeName: "StatusData",
          resultsLimit: 10000,
          search: {
            deviceSearch: { id: deviceId },
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString(),
            diagnosticSearch: { id: diagnosticId },
          },
        },
      }));

      interface StatusDataRaw {
        dateTime: string;
        data: number;
      }

      const result = await postToGeoTab<StatusDataRaw[][]>("ExecuteMultiCall", {
        calls,
        credentials: {
          database: credentials.database,
          sessionId: credentials.sessionId,
          userName: credentials.userName,
        },
      });

      if (!result) return [];

      // Flatten and transform results
      const statusData: GeoTabStatusData[] = [];
      result.forEach((deviceData, index) => {
        if (deviceData && Array.isArray(deviceData)) {
          deviceData.forEach((data) => {
            statusData.push({
              deviceId: deviceIds[index],
              dateTime: new Date(data.dateTime),
              value: data.data,
            });
          });
        }
      });

      return statusData;
    },
    [postToGeoTab]
  );

  /**
   * Fetch all spreader-related data for history enrichment
   */
  const fetchSpreaderData = useCallback(
    async (
      deviceIds: string[],
      fromDate: Date,
      toDate: Date,
      credentials: GeoTabCredentials
    ): Promise<GeoTabSpreaderData> => {
      // Helper to calculate buffered fromDate
      const getBufferedFromDate = (bufferHours: number) => {
        const bufferMs = bufferHours * 60 * 60 * 1000;
        return new Date(fromDate.getTime() - bufferMs);
      };

      // Fetch all data in parallel
      const [
        plowActiveEvents,
        spreaderActiveEvents,
        spreaderRateData,
        wingData,
        airTempData,
        surfaceTempData,
        materialTypeData,
      ] = await Promise.all([
        fetchExceptionEvents(
          deviceIds,
          fromDate,
          toDate,
          credentials,
          "RuleMaterialManagementPlowActiveId"
        ),
        fetchExceptionEvents(
          deviceIds,
          fromDate,
          toDate,
          credentials,
          "RuleMaterialManagementSolidApplicationId"
        ),
        fetchStatusData(
          deviceIds,
          getBufferedFromDate(STATUS_DATA_CONFIG.spreaderRate.fetchBufferHours),
          toDate,
          credentials,
          STATUS_DATA_CONFIG.spreaderRate.diagnosticId
        ),
        fetchStatusData(
          deviceIds,
          getBufferedFromDate(STATUS_DATA_CONFIG.wing.fetchBufferHours),
          toDate,
          credentials,
          STATUS_DATA_CONFIG.wing.diagnosticId
        ),
        fetchStatusData(
          deviceIds,
          getBufferedFromDate(STATUS_DATA_CONFIG.airTemperature.fetchBufferHours),
          toDate,
          credentials,
          STATUS_DATA_CONFIG.airTemperature.diagnosticId
        ),
        fetchStatusData(
          deviceIds,
          getBufferedFromDate(STATUS_DATA_CONFIG.surfaceTemperature.fetchBufferHours),
          toDate,
          credentials,
          STATUS_DATA_CONFIG.surfaceTemperature.diagnosticId
        ),
        fetchStatusData(
          deviceIds,
          getBufferedFromDate(STATUS_DATA_CONFIG.materialType.fetchBufferHours),
          toDate,
          credentials,
          STATUS_DATA_CONFIG.materialType.diagnosticId
        ),
      ]);

      return {
        plowActiveEvents,
        spreaderActiveEvents,
        spreaderRateData,
        wingData,
        airTempData,
        surfaceTempData,
        materialTypeData,
      };
    },
    [fetchExceptionEvents, fetchStatusData]
  );

  /**
   * Fetch GeoTab log records (GPS history)
   */
  const fetchLogRecords = useCallback(
    async (
      deviceIds: string[],
      fromDate: Date,
      toDate: Date,
      credentials: GeoTabCredentials
    ): Promise<
      Array<{
        deviceId: string;
        records: Array<{
          dateTime: string;
          latitude: number;
          longitude: number;
          speed: number;
        }>;
      }>
    > => {
      // Build calls for each device
      const calls = deviceIds.map((deviceId) => ({
        method: "Get",
        params: {
          typeName: "LogRecord",
          resultsLimit: 10000,
          search: {
            deviceSearch: { id: deviceId },
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString(),
          },
        },
      }));

      interface LogRecordRaw {
        dateTime: string;
        latitude: number;
        longitude: number;
        speed?: number;
      }

      const result = await postToGeoTab<LogRecordRaw[][]>("ExecuteMultiCall", {
        calls,
        credentials: {
          database: credentials.database,
          sessionId: credentials.sessionId,
          userName: credentials.userName,
        },
      });

      if (!result) return [];

      return result.map((records, index) => ({
        deviceId: deviceIds[index],
        records: (records || []).map((r) => ({
          dateTime: r.dateTime,
          latitude: r.latitude,
          longitude: r.longitude,
          speed: r.speed || 0,
        })),
      }));
    },
    [postToGeoTab]
  );

  /**
   * Check if a record's date falls within any exception event for that device
   */
  const isActiveAtTime = useCallback(
    (deviceId: string, recordDate: string, events: GeoTabExceptionEvent[]): boolean => {
      const recordTime = new Date(recordDate).getTime();
      return events.some((event) => {
        if (event.deviceId !== deviceId) return false;
        return recordTime >= event.activeFrom.getTime() && recordTime <= event.activeTo.getTime();
      });
    },
    []
  );

  /**
   * Find the closest status data value for a given device and time
   */
  const findClosestStatusValue = useCallback(
    (
      deviceId: string,
      recordDateUTC: string,
      statusData: GeoTabStatusData[],
      maxTimeDiffMs: number = 300000
    ): { value: number; matchedDateTime: string } | null => {
      const recordTime = new Date(recordDateUTC).getTime();

      // Find all data for this device
      const deviceData = statusData.filter((data) => data.deviceId === deviceId);

      if (deviceData.length === 0) {
        return null;
      }

      // Find closest data point that is AT or BEFORE the GPS record time
      const futureTolerance = 1000; // 1 second tolerance
      let closestBefore: GeoTabStatusData | null = null;
      let timeDiffBefore = Infinity;

      deviceData.forEach((data) => {
        const dataTime = data.dateTime.getTime();
        const timeDiff = dataTime - recordTime;

        if (timeDiff <= futureTolerance) {
          const absDiff = Math.abs(timeDiff);
          if (absDiff < timeDiffBefore) {
            timeDiffBefore = absDiff;
            closestBefore = data;
          }
        }
      });

      if (closestBefore === null || timeDiffBefore > maxTimeDiffMs) {
        return null;
      }

      return {
        value: closestBefore.value,
        matchedDateTime: closestBefore.dateTime.toISOString(),
      };
    },
    []
  );

  /**
   * Get device ID for a vehicle name
   */
  const getDeviceIdForVehicle = useCallback(
    (vehicleName: string, groupName: string): string | null => {
      const devices = geoTabDevices[groupName];
      if (!devices) return null;

      const trimmedVehicleId = vehicleName?.trim();

      const matchingDevice = devices.find((device) => {
        const cleanedName = cleanDeviceNameForMatching(device.name, groupName).trim();

        // Try exact match first
        if (cleanedName === trimmedVehicleId) {
          return true;
        }

        // Numeric match
        const cleanedIsPurelyNumeric = isPurelyNumeric(cleanedName);
        const vehicleIdIsPurelyNumeric = isPurelyNumeric(trimmedVehicleId);

        if (cleanedIsPurelyNumeric && vehicleIdIsPurelyNumeric) {
          const cleanedNum = parseInt(cleanedName);
          const vehicleNum = parseInt(trimmedVehicleId);
          if (cleanedNum && vehicleNum && cleanedNum === vehicleNum) {
            return true;
          }
        }

        return false;
      });

      return matchingDevice ? matchingDevice.id : null;
    },
    [geoTabDevices]
  );

  /**
   * Check if a group has GeoTab spreader data enabled
   */
  const groupHasGeoTabSpreaderData = useCallback(
    (groupName: string): boolean => {
      const configGroup = configGroups.find((g) => g.name === groupName);
      return configGroup?.hasGeoTabSpreaderData === true;
    },
    [configGroups]
  );

  return {
    authenticateGeoTab,
    fetchGeoTabDevices,
    fetchDeviceStatusInfo,
    fetchExceptionEvents,
    fetchStatusData,
    fetchSpreaderData,
    fetchLogRecords,
    isActiveAtTime,
    findClosestStatusValue,
    getDeviceIdForVehicle,
    groupHasGeoTabSpreaderData,
    cleanDeviceNameForMatching,
    STATUS_DATA_CONFIG,
  };
}
