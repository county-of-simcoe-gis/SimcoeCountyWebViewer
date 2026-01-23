"use client";

import { useCallback } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import type {
  CurrentLocationResponse,
  AllVehiclesResponse,
  HistoryResponse,
  GeoTabSessionResponse,
  GeoTabRunListItem,
} from "../types/avl.types";
import { getSqlDateString } from "../utils/avlHelpers";

// AVL API base path - uses local NextJS API routes
const AVL_BASE_PATH = "/api/secure/avl";

/**
 * Hook for making AVL API calls through the local NextJS API
 */
export function useAvlApi() {
  const { data: session } = useSession();

  // Get authorization headers
  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add bearer token if available from session
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }

    return headers;
  }, [session?.accessToken]);

  /**
   * Fetch current vehicle locations for a group
   */
  const fetchCurrentLocations = useCallback(
    async (
      grouping: string,
      sortField: string = "date",
      sortOrder: string = "ASC"
    ): Promise<CurrentLocationResponse[]> => {
      const url = `${AVL_BASE_PATH}/CurrentLocations/${encodeURIComponent(
        grouping
      )}/${sortField}/${sortOrder}`;

      try {
        const response = await axios.get<CurrentLocationResponse[]>(url, {
          headers: getHeaders(),
        });
        return response.data;
      } catch (error) {
        console.error("Error fetching current locations:", error);
        return [];
      }
    },
    [getHeaders]
  );

  /**
   * Fetch current spreader vehicle locations for a group
   */
  const fetchCurrentLocationsSpreader = useCallback(
    async (
      grouping: string,
      sortField: string = "date",
      sortOrder: string = "ASC"
    ): Promise<CurrentLocationResponse[]> => {
      const url = `${AVL_BASE_PATH}/CurrentLocationsSpreader/${encodeURIComponent(
        grouping
      )}/${sortField}/${sortOrder}`;

      try {
        const response = await axios.get<CurrentLocationResponse[]>(url, {
          headers: getHeaders(),
        });
        return response.data;
      } catch (error) {
        console.error("Error fetching current locations spreader:", error);
        return [];
      }
    },
    [getHeaders]
  );

  /**
   * Fetch all vehicles from the lookup table
   */
  const fetchAllVehicles = useCallback(async (): Promise<AllVehiclesResponse[]> => {
    const url = `${AVL_BASE_PATH}/AllVehicles`;

    try {
      const response = await axios.get<AllVehiclesResponse[]>(url, {
        headers: getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching all vehicles:", error);
      return [];
    }
  }, [getHeaders]);

  /**
   * Fetch vehicle history
   */
  const fetchHistory = useCallback(
    async (params: {
      fromDate: Date;
      toDate: Date;
      group: string;
      vehicleId: string;
      speedOperator: string;
      speed: number;
      simplifyFactor: number;
      extent?: string;
    }): Promise<HistoryResponse[]> => {
      const fromDateStr = getSqlDateString(params.fromDate);
      const toDateStr = getSqlDateString(params.toDate);

      let url = `${AVL_BASE_PATH}/History/${fromDateStr}/${toDateStr}/${encodeURIComponent(
        params.group
      )}/${encodeURIComponent(params.vehicleId)}/${encodeURIComponent(
        params.speedOperator
      )}/${params.speed}/${params.simplifyFactor}`;

      if (params.extent) {
        url += `/${encodeURIComponent(params.extent)}`;
      }

      try {
        const response = await axios.get<HistoryResponse[]>(url, {
          headers: getHeaders(),
        });
        return response.data;
      } catch (error) {
        console.error("Error fetching history:", error);
        return [];
      }
    },
    [getHeaders]
  );

  /**
   * Fetch spreader vehicle history
   */
  const fetchHistorySpreader = useCallback(
    async (params: {
      fromDate: Date;
      toDate: Date;
      group: string;
      vehicleId: string;
      speedOperator: string;
      speed: number;
      simplifyFactor: number;
      extent?: string;
    }): Promise<HistoryResponse[]> => {
      const fromDateStr = getSqlDateString(params.fromDate);
      const toDateStr = getSqlDateString(params.toDate);

      let url = `${AVL_BASE_PATH}/HistorySpreader/${fromDateStr}/${toDateStr}/${encodeURIComponent(
        params.group
      )}/${encodeURIComponent(params.vehicleId)}/${encodeURIComponent(
        params.speedOperator
      )}/${params.speed}/${params.simplifyFactor}`;

      if (params.extent) {
        url += `/${encodeURIComponent(params.extent)}`;
      }

      try {
        const response = await axios.get<HistoryResponse[]>(url, {
          headers: getHeaders(),
        });
        return response.data;
      } catch (error) {
        console.error("Error fetching history spreader:", error);
        return [];
      }
    },
    [getHeaders]
  );

  /**
   * Fetch GeoTab run list for trips
   */
  const fetchGeoTabRunList = useCallback(
    async (
      startDate: Date,
      endDate: Date,
      vehicleName?: string
    ): Promise<GeoTabRunListItem[]> => {
      const startDateStr = getSqlDateString(startDate);
      const endDateStr = getSqlDateString(endDate);

      let url = `${AVL_BASE_PATH}/HistorySpreaderGeoTabRunList/${startDateStr}/${endDateStr}`;

      if (vehicleName) {
        url += `/${encodeURIComponent(vehicleName)}`;
      }

      try {
        const response = await axios.get<GeoTabRunListItem[]>(url, {
          headers: getHeaders(),
        });
        return response.data;
      } catch (error) {
        console.error("Error fetching GeoTab run list:", error);
        return [];
      }
    },
    [getHeaders]
  );

  /**
   * Fetch GeoTab session credentials
   */
  const fetchGeoTabSessionId = useCallback(
    async (geoTabAPIKey: string): Promise<GeoTabSessionResponse | null> => {
      const url = `${AVL_BASE_PATH}/getGeoTabSessionId/${encodeURIComponent(
        geoTabAPIKey
      )}`;

      try {
        const response = await axios.get<GeoTabSessionResponse>(url, {
          headers: getHeaders(),
        });
        return response.data;
      } catch (error) {
        console.error("Error fetching GeoTab session:", error);
        return null;
      }
    },
    [getHeaders]
  );

  return {
    fetchCurrentLocations,
    fetchCurrentLocationsSpreader,
    fetchAllVehicles,
    fetchHistory,
    fetchHistorySpreader,
    fetchGeoTabRunList,
    fetchGeoTabSessionId,
  };
}
