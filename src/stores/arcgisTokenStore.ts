/**
 * ArcGIS Token Store (Zustand + Immer)
 *
 * Manages the ArcGIS user token lifecycle using @arcgis/core's IdentityManager:
 *  - Stores the current token in state and localStorage
 *  - Provides getValidToken() for on-demand fresh-token access (interactive requests)
 *  - Schedules a forced page reload at the token's renewal date (mirrors old app's
 *    esriHelpers.js forceAppRefresh) instead of silently swapping tokens into live
 *    layer sources in place — a full reload re-runs TOC/layer init with a fresh
 *    token instead of requiring every layer type to be patched individually.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { type ArcGISTokenData, saveTokenToStorage, loadTokenFromStorage, clearTokenFromStorage, login, processCredential, processEsriJSAPIOAuth } from "@/utils/arcgisAuth";
import { showMessage } from "@/utils/helpersUI";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Refresh the token 5 minutes before the renewal date. */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/** Delay between the expiry warning toast and the page reload (matches old app). */
const FORCE_REFRESH_WARNING_DELAY_MS = 5000;

/** Shorter delay used when a freshly-acquired token is already past its own renewal date. */
const FORCE_REFRESH_IMMEDIATE_DELAY_MS = 2500;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ArcGISTokenState {
  /** The current access token string (null when unauthenticated). */
  token: string | null;
  /** Epoch ms when the token expires. */
  expiresAt: number;
  /** Epoch ms after which the app should refresh. */
  renewalDate: number;
  /** ArcGIS Portal username. */
  username: string;
  /** Whether the user is authenticated with ArcGIS. */
  isAuthenticated: boolean;
  /** Whether an auth operation (login / refresh) is in progress. */
  isLoading: boolean;
  /** Error message from the last failed operation. */
  error: string | null;
}

interface ArcGISTokenActions {
  /** Store a new token and start the refresh timer. */
  setToken: (data: ArcGISTokenData) => void;
  /** Clear the token (logout). */
  clearToken: () => void;
  /**
   * Get a valid token string. Returns the current token if still valid,
   * triggers a refresh if nearing expiry, or returns null if unavailable.
   */
  getValidToken: () => Promise<string | null>;
  /** Hydrate state from localStorage / esriJSAPIOAuth (call once on app init). */
  hydrate: () => Promise<void>;
  /** Trigger a re-login via IdentityManager. */
  refreshToken: () => Promise<boolean>;
}

type ArcGISTokenStore = ArcGISTokenState & ArcGISTokenActions;

// ─── Internal helpers ────────────────────────────────────────────────────────

let forceRefreshTimerId: ReturnType<typeof setTimeout> | null = null;
let refreshPromise: Promise<boolean> | null = null;

function clearForceRefreshTimer() {
  if (forceRefreshTimerId !== null) {
    clearTimeout(forceRefreshTimerId);
    forceRefreshTimerId = null;
  }
}

/** Warn the user then reload the page so every layer/request picks up a fresh token. */
function forceAppRefresh(title: string, message: string, delay: number) {
  showMessage(title, message, "error", delay);
  console.warn("ArcGIS Token expired. Page will automatically refresh.");
  setTimeout(() => {
    window.location.reload();
  }, delay);
}

/** Schedule (or immediately trigger, if already due) the forced reload at the renewal date. */
function scheduleForceRefresh(renewalDate: number) {
  clearForceRefreshTimer();
  const msUntilRenewal = renewalDate - Date.now();
  if (msUntilRenewal <= 0) {
    forceAppRefresh("Acquiring ArcGIS Token", "Acquiring ArcGIS Token, refreshing page...", FORCE_REFRESH_IMMEDIATE_DELAY_MS);
    return;
  }
  forceRefreshTimerId = setTimeout(() => {
    forceAppRefresh("ArcGIS Token expired!", "ArcGIS Token expired, refreshing page...", FORCE_REFRESH_WARNING_DELAY_MS);
  }, msUntilRenewal);
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useArcGISTokenStore = create<ArcGISTokenStore>()(
  immer((set, get) => ({
    // ── State ──
    token: null,
    expiresAt: 0,
    renewalDate: 0,
    username: "",
    isAuthenticated: false,
    isLoading: false,
    error: null,

    // ── Actions ──

    setToken: (data: ArcGISTokenData) => {
      set((state) => {
        state.token = data.accessToken;
        state.expiresAt = data.expiresAt;
        state.renewalDate = data.renewalDate;
        state.username = data.username;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      });

      // Persist (fire-and-forget — localStorage)
      void saveTokenToStorage(data);

      // Schedule a forced page reload at the renewal date instead of silently
      // refreshing in place (mirrors old app's forceAppRefresh).
      scheduleForceRefresh(data.renewalDate);
    },

    clearToken: () => {
      clearForceRefreshTimer();
      clearTokenFromStorage();
      set((state) => {
        state.token = null;
        state.expiresAt = 0;
        state.renewalDate = 0;
        state.username = "";
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      });
    },

    getValidToken: async (): Promise<string | null> => {
      const { token, renewalDate, refreshToken } = get();

      // Token is still valid and well before renewal
      if (token && Date.now() < renewalDate - REFRESH_BUFFER_MS) {
        return token;
      }

      // Token exists but nearing renewal — try refresh
      if (token && Date.now() < renewalDate) {
        const ok = await refreshToken();
        return ok ? get().token : token; // Return old token if refresh fails (still technically valid)
      }

      // Token past renewal date or missing — need fresh login
      const ok = await refreshToken();
      return ok ? get().token : null;
    },

    hydrate: async () => {
      // First check for esriJSAPIOAuth (redirect callback from IdentityManager)
      const redirectToken = processEsriJSAPIOAuth();
      if (redirectToken && Date.now() < redirectToken.renewalDate) {
        get().setToken(redirectToken);
        // If the refresh point was already passed, refresh immediately in the
        // background so the user doesn't use a stale token until the next request.
        if (Date.now() >= redirectToken.renewalDate - REFRESH_BUFFER_MS) {
          void get().refreshToken();
        }
        return;
      }

      // Then check localStorage for a cached token
      const stored = await loadTokenFromStorage();
      if (stored) {
        get().setToken(stored);
        // If the refresh point was already passed, refresh immediately in the
        // background so the user doesn't use a stale token until the next request.
        if (Date.now() >= stored.renewalDate - REFRESH_BUFFER_MS) {
          void get().refreshToken();
        }
      }
    },

    refreshToken: async (): Promise<boolean> => {
      // If a refresh is already in flight, await the same promise so every
      // concurrent caller resolves to the same token (or failure). Without this,
      // the second caller would get `false`, proceed with no token, and fail
      // on its first authenticated ArcGIS request (e.g. Road Closures layers).
      if (refreshPromise) {
        return refreshPromise;
      }

      refreshPromise = (async (): Promise<boolean> => {
        set((state) => {
          state.isLoading = true;
        });

        try {
          // Use IdentityManager's login flow which handles SAML automatically
          const cred = await login();
          const tokenData = processCredential(cred);

          get().setToken(tokenData);
          return true;
        } catch (err) {
          console.error("ArcGIS token refresh error:", err);
          set((state) => {
            state.isLoading = false;
            state.error = err instanceof Error ? err.message : "Token refresh failed";
          });
          return false;
        }
      })();

      try {
        return await refreshPromise;
      } finally {
        refreshPromise = null;
      }
    },
  })),
);
