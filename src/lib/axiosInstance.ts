// lib/axiosInstance.ts

import axios from "axios";

/** Base path for the application (e.g. "/webviewer" or "") */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const axiosInstance = axios.create({
  baseURL: `${basePath}/api`, // This baseURL will prepend /api to all requests made using this instance
});

/** Axios instance for fetching local public assets (e.g. /basemap/*.json, /config.json) with basePath */
export const publicAxiosInstance = axios.create({
  baseURL: basePath,
});

/**
 * Helper to prepend basePath to a URL for use with fetch().
 * Use this for internal API routes when not using axiosInstance.
 * @example apiUrl("/api/secure/arcgis/token") => "/webviewer/api/secure/arcgis/token"
 */
export const apiUrl = (path: string): string => `${basePath}${path}`;

/**
 * Get the appropriate axios client based on the URL
 * Uses axiosInstance for internal API routes (/api/*),
 * publicAxiosInstance for other local paths (e.g. /basemap/*),
 * and plain axios for external URLs.
 */
export const getAxiosClient = (url: string) => {
  if (url.startsWith("/api/")) return axiosInstance;
  if (url.startsWith("/") && !url.startsWith("//")) return publicAxiosInstance;
  return axios;
};

export default axiosInstance;
