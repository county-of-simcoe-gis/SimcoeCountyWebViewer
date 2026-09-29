/**
 * ArcGIS Token Store (Zustand + Immer)
 *
 * Manages the ArcGIS user token lifecycle using @arcgis/core's IdentityManager:
 *  - Stores the current token in state and localStorage
 *  - Schedules token refresh before the renewal date (mirrors old app's forceAppRefresh)
 *  - Provides getValidToken() for on-demand fresh-token access
 *  - After refresh, updates all secured ArcGIS OL layer sources in-place
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { type ArcGISTokenData, saveTokenToStorage, loadTokenFromStorage, clearTokenFromStorage, login, processCredential, processEsriJSAPIOAuth } from "@/utils/arcgisAuth";
import ImageArcGISRest from "ol/source/ImageArcGISRest";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Refresh the token 5 minute before the renewal date. */
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
  /** Hydrate state from localStorage / esriJSAPIOAuth (call once on app init). */
  hydrate: () => Promise<void>;
  /** Trigger a re-login via IdentityManager and update all secured layers. */
  refreshToken: () => Promise<boolean>;
  /** Update TOKEN param on all secured ArcGIS OL sources. */
  updateLayerTokens: (newToken: string) => void;
}

type ArcGISTokenStore = ArcGISTokenState & ArcGISTokenActions;

// ─── Internal helpers ────────────────────────────────────────────────────────

let refreshTimerId: ReturnType<typeof setTimeout> | null = null;
let refreshPromise: Promise<boolean> | null = null;
/** True once a consumer has requested a token; gates the background refresh timer. */
let refreshSchedulingEnabled = false;

function clearRefreshTimer() {
  if (refreshTimerId !== null) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

function scheduleRefreshTimer(getState: () => ArcGISTokenStore) {
  if (!refreshSchedulingEnabled) return;

  clearRefreshTimer();
  const { expiresAt, renewalDate } = getState();
  const hardLimit = expiresAt > 0 ? Math.min(renewalDate, expiresAt) : renewalDate;
  const refreshPoint = hardLimit - REFRESH_BUFFER_MS;
  const msUntilRefresh = refreshPoint - Date.now();
  if (msUntilRefresh > 0) {
    refreshTimerId = setTimeout(() => {
      console.warn("ArcGIS: Token approaching renewal date, refreshing...");
      getState().refreshToken();
    }, msUntilRefresh);
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

      // Persist (fire-and-forget — localStorage)
      void saveTokenToStorage(data);

      // Only arm the background refresh timer once a consumer has actually
      // requested a token. Maps that never call getValidToken() won't waste
      // cycles (or trigger ArcGIS auth flows) in the background.
      scheduleRefreshTimer(get);
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
      const { token, expiresAt, renewalDate, refreshToken } = get();
      // expiresAt may be 0 when state was set directly without a real token data
      // object (e.g. tests), so fall back to renewalDate only in that case.
      const hardLimit = expiresAt > 0 ? Math.min(renewalDate, expiresAt) : renewalDate;

      // Lazily enable background refresh scheduling the first time any
      // consumer actually needs an ArcGIS token.
      if (!refreshSchedulingEnabled) {
        refreshSchedulingEnabled = true;
        scheduleRefreshTimer(get);
      }

      // Token is still valid and well before its refresh point
      if (token && Date.now() < hardLimit - REFRESH_BUFFER_MS) {
        return token;
      }

      // Token exists but nearing its refresh point or expiry — try refresh
      if (token && Date.now() < hardLimit) {
        const ok = await refreshToken();
        return ok ? get().token : token; // Return old token if refresh fails (still technically valid)
      }

      // Token past its refresh point/expiry or missing — need fresh login
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
          // Pass force=true so IdentityManager fetches a new token instead of
          // returning the cached credential, which would still carry the old expiry.
          const cred = await login(undefined, undefined, true);
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
      })();

      try {
        return await refreshPromise;
      } finally {
        refreshPromise = null;
      }
    },

    updateLayerTokens: (newToken: string) => {
      try {
        // Import dynamically to avoid circular dependencies at module-load time
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
