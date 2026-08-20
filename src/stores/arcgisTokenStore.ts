/**
 * ArcGIS Token Store (Zustand + Immer)
 *
 * Manages the ArcGIS user token lifecycle using @arcgis/core's IdentityManager:
 *  - Stores the current token in state and sessionStorage
 *  - Schedules token refresh before the renewal date (mirrors old app's forceAppRefresh)
 *  - Provides getValidToken() for on-demand fresh-token access
 *  - After refresh, updates all secured ArcGIS OL layer sources in-place
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { type ArcGISTokenData, saveTokenToStorage, loadTokenFromStorage, clearTokenFromStorage, login, processCredential, processEsriJSAPIOAuth } from "@/utils/arcgisAuth";
import ImageArcGISRest from "ol/source/ImageArcGISRest";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Refresh the token 5 minutes before the renewal date. */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

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
  /** Hydrate state from sessionStorage / esriJSAPIOAuth (call once on app init). */
  hydrate: () => Promise<void>;
  /** Trigger a re-login via IdentityManager and update all secured layers. */
  refreshToken: () => Promise<boolean>;
  /** Update TOKEN param on all secured ArcGIS OL sources. */
  updateLayerTokens: (newToken: string) => void;
}

type ArcGISTokenStore = ArcGISTokenState & ArcGISTokenActions;

// ─── Internal helpers ────────────────────────────────────────────────────────

let refreshTimerId: ReturnType<typeof setTimeout> | null = null;

function clearRefreshTimer() {
  if (refreshTimerId !== null) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
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

      // Persist (fire-and-forget — encrypted write)
      void saveTokenToStorage(data);

      // Schedule refresh before renewal date
      clearRefreshTimer();
      const msUntilRefresh = data.renewalDate - Date.now() - REFRESH_BUFFER_MS;
      if (msUntilRefresh > 0) {
        refreshTimerId = setTimeout(() => {
          console.warn("ArcGIS: Token approaching renewal date, refreshing...");
          get().refreshToken();
        }, msUntilRefresh);
      }
    },

    clearToken: () => {
      clearRefreshTimer();
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
        return;
      }

      // Then check sessionStorage for a cached (encrypted) token
      const stored = await loadTokenFromStorage();
      if (stored) {
        get().setToken(stored);
      }
    },

    refreshToken: async (): Promise<boolean> => {
      // Prevent concurrent refreshes
      if (get().isLoading) return false;

      set((state) => {
        state.isLoading = true;
      });

      try {
        // Use IdentityManager's login flow which handles SAML automatically
        const cred = await login();
        const tokenData = processCredential(cred);

        get().setToken(tokenData);
        // Update all secured ArcGIS layer sources with the new token
        get().updateLayerTokens(tokenData.accessToken);
        return true;
      } catch (err) {
        console.error("ArcGIS token refresh error:", err);
        set((state) => {
          state.isLoading = false;
          state.error = err instanceof Error ? err.message : "Token refresh failed";
        });
        return false;
      }
    },

    updateLayerTokens: (newToken: string) => {
      try {
        // Import dynamically to avoid circular dependencies at module-load time
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useLayerManagerStore } = require("@/stores/layerManagerStore");
        const allLayers = useLayerManagerStore.getState().getAllLayers();

        for (const managed of allLayers) {
          const layer = managed.layer;
          const isSecured = layer.get?.("secured");
          const isArcGIS = layer.get?.("isArcGIS");

          if (!isSecured || !isArcGIS) continue;

          // Update the OL source TOKEN param (triggers re-render)
          const source = (layer as { getSource?: () => unknown }).getSource?.();
          if (source instanceof ImageArcGISRest) {
            const params = source.getParams();
            source.updateParams({ ...params, TOKEN: newToken });
          }

          // Update wfsUrl and attachmentUrl with the new token
          const wfsUrl = layer.get?.("wfsUrl") as string | undefined;
          if (wfsUrl) {
            const updatedWfsUrl = replaceTokenInUrl(wfsUrl, newToken);
            layer.setProperties?.({ wfsUrl: updatedWfsUrl });
          }

          const attachmentUrl = layer.get?.("attachmentUrl") as string | undefined;
          if (attachmentUrl) {
            const updatedAttachmentUrl = replaceTokenInUrl(attachmentUrl, newToken);
            layer.setProperties?.({ attachmentUrl: updatedAttachmentUrl });
          }
        }
      } catch (err) {
        console.warn("ArcGIS: Failed to update layer tokens after refresh:", err);
      }
    },
  })),
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Replace or append a `token=...` query parameter in a URL string.
 */
function replaceTokenInUrl(url: string, newToken: string): string {
  if (/[?&]token=[^&]*/i.test(url)) {
    return url.replace(/([?&])token=[^&]*/i, `$1token=${newToken}`);
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${newToken}`;
}
