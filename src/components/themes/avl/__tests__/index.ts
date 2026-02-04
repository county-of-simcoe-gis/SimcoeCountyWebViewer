/**
 * AVL Theme Tests - Index file
 *
 * This file exports test utilities for use in AVL theme tests.
 * Import mock data, handlers, and utilities from this central location.
 *
 * Environment Detection:
 * - Uses TF_BUILD (Azure DevOps) and CI env vars
 * - Allows conditional test execution based on environment
 *
 * Example usage:
 * ```typescript
 * import { mockVehicles, avlHandlers, isCI } from './__tests__';
 *
 * // Skip tests in CI that require external services
 * describe.skipIf(isCI)('External Service Tests', () => { ... });
 * ```
 */

// Re-export mock data
export {
  mockVehicle,
  mockVehicles,
  mockGroups,
  mockGeoTabCredentials,
  mockGeoTabDevices,
  mockTrips,
  mockHistoryVehicle,
  mockHistoryVehicles,
  mockAuthStates,
  createMockAvlStoreState,
} from "./mockData";

// Re-export handlers
export {
  avlHandlers,
  geoTabHandlers,
  avlErrorHandlers,
  geoTabErrorHandlers,
  allAvlHandlers,
} from "./handlers";

// Re-export environment detection
export { isCI, isAzureDevOps, isGitHubActions, isLocalDev, testEnv } from "@/test/env";
