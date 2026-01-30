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
        console.log(`[useGeoTab] postToGeoTab method: ${method}`);
        
        const response = await axios.post<GeoTabApiResponse<T>>(GEOTAB_API_URL, {
          method,
          params,
        });

        if (response.data.error) {
          console.error("GeoTab API error:", response.data.error);
          return null;
        }

        console.log(`[useGeoTab] postToGeoTab ${method} response received`);
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
      console.log(`[useGeoTab] fetchExceptionEvents for ${ruleId}`);
      console.log(`[useGeoTab]   fromDate: ${fromDate.toISOString()}`);
      console.log(`[useGeoTab]   toDate: ${toDate.toISOString()}`);

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

      console.log(`[useGeoTab] fetchExceptionEvents ${ruleId} raw result:`, result ? `${result.length} device arrays` : "null");

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

      console.log(`[useGeoTab] fetchExceptionEvents ${ruleId} parsed events:`, events.length);
      if (events.length > 0) {
        console.log(`[useGeoTab] First event:`, events[0]);
      }

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
      console.log(`[useGeoTab] fetchStatusData for ${diagnosticId}`);
      console.log(`[useGeoTab]   fromDate: ${fromDate.toISOString()}`);
      console.log(`[useGeoTab]   toDate: ${toDate.toISOString()}`);

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

      console.log(`[useGeoTab] fetchStatusData ${diagnosticId} raw result:`, result ? `${result.length} device arrays` : "null");

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

      console.log(`[useGeoTab] fetchStatusData ${diagnosticId} parsed records:`, statusData.length);
      if (statusData.length > 0) {
        console.log(`[useGeoTab] First record:`, statusData[0]);
      }

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
      console.log("[useGeoTab] fetchSpreaderData called");
      console.log("[useGeoTab] deviceIds:", deviceIds.length, deviceIds.slice(0, 3));
      console.log("[useGeoTab] fromDate:", fromDate.toISOString());
      console.log("[useGeoTab] toDate:", toDate.toISOString());

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

      console.log("[useGeoTab] fetchSpreaderData results:");
      console.log("[useGeoTab]   plowActiveEvents:", plowActiveEvents.length);
      console.log("[useGeoTab]   spreaderActiveEvents:", spreaderActiveEvents.length);
      console.log("[useGeoTab]   spreaderRateData:", spreaderRateData.length);
      console.log("[useGeoTab]   wingData:", wingData.length);
      console.log("[useGeoTab]   airTempData:", airTempData.length);
      console.log("[useGeoTab]   surfaceTempData:", surfaceTempData.length);
      console.log("[useGeoTab]   materialTypeData:", materialTypeData.length);

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

      // TypeScript type guard - we know closestBefore is not null here
      const matchedData: GeoTabStatusData = closestBefore;
      return {
        value: matchedData.value,
        matchedDateTime: matchedData.dateTime.toISOString(),
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
      // Handle special case: "Roads (Spreader)" maps to "Roads" config group
      const configGroupName = groupName === "Roads (Spreader)" ? "Roads" : groupName;
      const configGroup = configGroups.find((g) => g.name === configGroupName);
      return configGroup?.hasGeoTabSpreaderData === true;
    },
    [configGroups]
  );

  /**
   * Diagnostic data result from fetchGeoTabDiagnostics
   */
  interface GeoTabDiagnosticData {
    SpreaderRate: number | string;
    SpreaderRateReportedOn: string | null;
    AirTemperature: number | string;
    AirTemperatureReportedOn: string | null;
    SurfaceTemperature: number | string;
    SurfaceTemperatureReportedOn: string | null;
    MaterialType: string;
    MaterialTypeReportedOn: string | null;
    Blasting: boolean;
  }

  /**
   * Fetch GeoTab diagnostic data for a vehicle (Spreader Rate, Air Temp, Surface Temp, Material Type)
   * This is called when a vehicle is clicked to show detailed snow operations data
   */
  const fetchGeoTabDiagnostics = useCallback(
    async (vehicleInfo: AvlVehicle): Promise<GeoTabDiagnosticData | null> => {
      // Get fresh state from the store to avoid stale closure issues
      const storeState = useAvlStore.getState();
      const currentConfigGroups = storeState.configGroups;
      const currentGeoTabCredentials = storeState.geoTabCredentials;
      const currentGeoTabDevices = storeState.geoTabDevices;
      
      // Find the matching group config
      const groupFromConfig = currentConfigGroups.find((g) => g.name === vehicleInfo.grouping);
      if (!groupFromConfig || !groupFromConfig.isGeoTabDevice) {
        return null;
      }

      // Check for credentials
      const credentials = currentGeoTabCredentials[vehicleInfo.grouping];
      if (!credentials) {
        console.warn(`[GEOTAB DIAG] No credentials for group: ${vehicleInfo.grouping}`);
        return null;
      }

      // Find the matching device
      const devices = currentGeoTabDevices[vehicleInfo.grouping];
      if (!devices) {
        console.warn(`[GEOTAB DIAG] No devices for group: ${vehicleInfo.grouping}`);
        return null;
      }

      const matchingDevice = devices.find((device) => {
        const cleanedName = cleanDeviceNameForMatching(device.name, vehicleInfo.grouping);
        return cleanedName === vehicleInfo.vehicle_name ||
          (isPurelyNumeric(cleanedName) &&
            isPurelyNumeric(vehicleInfo.vehicle_name) &&
            parseInt(cleanedName) === parseInt(vehicleInfo.vehicle_name));
      });

      if (!matchingDevice) {
        console.warn(`[GEOTAB DIAG] No matching device for vehicle: ${vehicleInfo.vehicle_name}`);
        return null;
      }

      // Helper function to get the most recent record from an array of StatusData
      const getMostRecent = (
        records: Array<{ dateTime: string; data: number }> | null
      ): { dateTime: string; data: number } | null => {
        if (!records || records.length === 0) return null;
        // Sort by dateTime descending and return the first (most recent) record
        return records.sort(
          (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
        )[0];
      };

      // Helper function to format UTC date to friendly EST/EDT format for "Reported on" display
      const formatReportedOnDate = (utcDateString: string): string | null => {
        if (!utcDateString) return null;
        const date = new Date(utcDateString);

        // Use Intl.DateTimeFormat with explicit timezone for proper UTC to EST/EDT conversion
        const options: Intl.DateTimeFormatOptions = {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        };

        const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(date);
        const year = parts.find((p) => p.type === "year")?.value;
        const month = parts.find((p) => p.type === "month")?.value;
        const day = parts.find((p) => p.type === "day")?.value;
        const hour = parts.find((p) => p.type === "hour")?.value;
        const minute = parts.find((p) => p.type === "minute")?.value;
        const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value;

        return `${year}-${month}-${day} ${hour}:${minute} ${dayPeriod}`;
      };

      // Search for data from the last day to get recent records
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 1);

      try {
        // Make ExecuteMultiCall for 4 diagnostics in one API call
        interface StatusDataResult {
          dateTime: string;
          data: number;
        }

        const result = await postToGeoTab<StatusDataResult[][]>("ExecuteMultiCall", {
          calls: [
            {
              method: "Get",
              params: {
                typeName: "StatusData",
                search: {
                  deviceSearch: { id: matchingDevice.id },
                  diagnosticSearch: { id: "DiagnosticSolidMaterialRateId" },
                  fromDate: fromDate.toISOString(),
                },
              },
            },
            {
              method: "Get",
              params: {
                typeName: "StatusData",
                search: {
                  deviceSearch: { id: matchingDevice.id },
                  diagnosticSearch: { id: "DiagnosticOutsideTemperatureId" },
                  fromDate: fromDate.toISOString(),
                },
              },
            },
            {
              method: "Get",
              params: {
                typeName: "StatusData",
                search: {
                  deviceSearch: { id: matchingDevice.id },
                  diagnosticSearch: { id: "IoxWrksRoadTemperature" },
                  fromDate: fromDate.toISOString(),
                },
              },
            },
            {
              method: "Get",
              params: {
                typeName: "StatusData",
                search: {
                  deviceSearch: { id: matchingDevice.id },
                  diagnosticSearch: { id: "DiagnosticSolidMaterialTypeId" },
                  fromDate: fromDate.toISOString(),
                },
              },
            },
          ],
          credentials: {
            database: credentials.database,
            sessionId: credentials.sessionId,
            userName: credentials.userName,
          },
        });

        if (result) {
          // Get the most recent record from each result set
          const spreaderRecord = getMostRecent(result[0]);
          const airTempRecord = getMostRecent(result[1]);
          const surfaceTempRecord = getMostRecent(result[2]);
          const materialTypeRecord = getMostRecent(result[3]);

          // Convert material type numeric value to readable string (37=SALT, 38=SAND)
          let materialTypeValue = "No Data Found";
          if (materialTypeRecord?.data !== undefined) {
            if (materialTypeRecord.data === 37) {
              materialTypeValue = "SALT";
            } else if (materialTypeRecord.data === 38) {
              materialTypeValue = "SAND";
            } else {
              materialTypeValue = `Unknown (${materialTypeRecord.data})`;
            }
          }

          // Calculate Blasting flag based on material type and spreader rate
          // SALT with rate > 175 = Blasting
          // SAND with rate > 600 = Blasting
          let isBlasting = false;
          const spreaderRate = spreaderRecord?.data;
          if (typeof spreaderRate === "number") {
            if (materialTypeValue === "SALT" && spreaderRate > 175) {
              isBlasting = true;
            } else if (materialTypeValue === "SAND" && spreaderRate > 600) {
              isBlasting = true;
            }
          }

          const diagnosticData: GeoTabDiagnosticData = {
            SpreaderRate: spreaderRecord?.data ?? "No Data Found",
            SpreaderRateReportedOn: spreaderRecord
              ? formatReportedOnDate(spreaderRecord.dateTime)
              : null,
            AirTemperature: airTempRecord?.data ?? "No Data Found",
            AirTemperatureReportedOn: airTempRecord
              ? formatReportedOnDate(airTempRecord.dateTime)
              : null,
            SurfaceTemperature: surfaceTempRecord?.data ?? "No Data Found",
            SurfaceTemperatureReportedOn: surfaceTempRecord
              ? formatReportedOnDate(surfaceTempRecord.dateTime)
              : null,
            MaterialType: materialTypeValue,
            MaterialTypeReportedOn: materialTypeRecord
              ? formatReportedOnDate(materialTypeRecord.dateTime)
              : null,
            Blasting: isBlasting,
          };

          return diagnosticData;
        }
        return null;
      } catch (error) {
        console.error("GeoTab diagnostics API error:", error);
        return null;
      }
    },
    [postToGeoTab]
  );

  return {
    authenticateGeoTab,
    fetchGeoTabDevices,
    fetchDeviceStatusInfo,
    fetchExceptionEvents,
    fetchStatusData,
    fetchSpreaderData,
    fetchLogRecords,
    fetchGeoTabDiagnostics,
    isActiveAtTime,
    findClosestStatusValue,
    getDeviceIdForVehicle,
    groupHasGeoTabSpreaderData,
    cleanDeviceNameForMatching,
    STATUS_DATA_CONFIG,
  };
}
