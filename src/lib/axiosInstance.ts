// lib/axiosInstance.ts

import axios from "axios";

const axiosInstance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BASE_PATH}/api`, // This baseURL will prepend /api to all requests made using this instance
});

/**
 * Get the appropriate axios client based on the URL
 * Uses axiosInstance for internal API routes (/api/*), regular axios for external URLs
 */
export const getAxiosClient = (url: string) => {
  return url.startsWith("/api/") ? axiosInstance : axios;
};

export default axiosInstance;
