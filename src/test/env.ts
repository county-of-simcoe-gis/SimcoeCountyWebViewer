/**
 * Environment detection utilities for conditional test execution.
 *
 * Use these flags to skip integration tests in CI/CD pipelines
 * where network access may be restricted (e.g., Azure DevOps).
 *
 * Azure DevOps automatically sets TF_BUILD=True during pipeline runs.
 * Many CI systems also use CI=true as a standard environment variable.
 *
 * @example
 * import { isCI, isLocalDev } from '@/test/env';
 *
 * describe.skipIf(isCI)('Integration Tests', () => {
 *   // These tests only run locally
 * });
 */

/**
 * True when running in any CI environment (Azure DevOps, GitHub Actions, etc.)
 * Checks both standard CI variable and Azure-specific TF_BUILD
 */
export const isCI = !!process.env.CI || process.env.TF_BUILD === "True";

/**
 * True when running in Azure DevOps pipeline specifically
 * Azure DevOps automatically sets TF_BUILD=True during builds
 */
export const isAzureDevOps = process.env.TF_BUILD === "True";

/**
 * True when running in GitHub Actions
 */
export const isGitHubActions = !!process.env.GITHUB_ACTIONS;

/**
 * True when running locally (not in any CI environment)
 * Use this for tests that require real network access
 */
export const isLocalDev = !isCI;

/**
 * Detailed environment information object
 * Useful for debugging or conditional logic beyond simple flags
 */
export const testEnv = {
  isCI,
  isAzureDevOps,
  isGitHubActions,
  isLocalDev,
  // Azure DevOps specific info
  buildId: process.env.BUILD_BUILDID,
  buildReason: process.env.BUILD_REASON,
  agentName: process.env.AGENT_NAME,
  // General CI info
  nodeEnv: process.env.NODE_ENV,
};
