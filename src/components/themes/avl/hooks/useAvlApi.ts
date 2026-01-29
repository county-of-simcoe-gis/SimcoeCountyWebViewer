"use client";

import { useCallback } from "react";
import axios, { AxiosError } from "axios";
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

// Custom error class for authentication errors
export class AuthenticationError extends Error {
  constructor(message: string = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

// Custom error class for authorization errors
export class AuthorizationError extends Error {
  constructor(message: string = "Insufficient permissions") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Hook for making AVL API calls through the local NextJS API.
 * 
 * Authentication is handled server-side via NextAuth session cookies.
 * The server API route uses getToken() to validate the session.
 * 
 * Throws AuthenticationError (401) or AuthorizationError (403) on auth failures.
 */
export function useAvlApi() {
  // Handle API errors and throw appropriate custom errors
  const handleApiError = useCallback((error: unknown): never => {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string }>;
      const status = axiosError.response?.status;
      const message = axiosError.response?.data?.error || axiosError.message;

      if (status === 401) {
        throw new AuthenticationError(message);
      }
      if (status === 403) {
        throw new AuthorizationError(message);
      }
    }
    throw error;
  }, []);

  /**
   * Fetch current vehicle locations for a group
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AuthorizationError} When user lacks required permissions
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
        const response = await axios.get<CurrentLocationResponse[]>(url);
        return response.data;
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError]
  );

  /**
   * Fetch current spreader vehicle locations for a group
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AuthorizationError} When user lacks required permissions
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
        const response = await axios.get<CurrentLocationResponse[]>(url);
        return response.data;
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError]
  );

  /**
   * Fetch all vehicles from the lookup table
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AuthorizationError} When user lacks required permissions
   */
  const fetchAllVehicles = useCallback(async (): Promise<AllVehiclesResponse[]> => {
    const url = `${AVL_BASE_PATH}/AllVehicles`;

    try {
      const response = await axios.get<AllVehiclesResponse[]>(url);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  }, [handleApiError]);

  /**
   * Fetch vehicle history
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AuthorizationError} When user lacks required permissions
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
        const response = await axios.get<HistoryResponse[]>(url);
        return response.data;
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError]
  );

  /**
   * Fetch spreader vehicle history
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AuthorizationError} When user lacks required permissions
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
        const response = await axios.get<HistoryResponse[]>(url);
        return response.data;
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError]
  );

  /**
   * Fetch GeoTab run list for trips
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AuthorizationError} When user lacks required permissions
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
        const response = await axios.get<GeoTabRunListItem[]>(url);
        return response.data;
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError]
  );

  /**
   * Fetch GeoTab session credentials
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AuthorizationError} When user lacks required permissions
   */
  const fetchGeoTabSessionId = useCallback(
    async (geoTabAPIKey: string): Promise<GeoTabSessionResponse | null> => {
      const url = `${AVL_BASE_PATH}/getGeoTabSessionId/${encodeURIComponent(
        geoTabAPIKey
      )}`;

      try {
        const response = await axios.get<GeoTabSessionResponse>(url);
        return response.data;
      } catch (error) {
        handleApiError(error);
      }
    },
    [handleApiError]
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
