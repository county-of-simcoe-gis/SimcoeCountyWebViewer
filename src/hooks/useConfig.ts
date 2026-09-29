import { useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { loadConfig, updatePageMetadata, AuthenticationRequiredError, MapAccessDeniedError, MapNotFoundError, type AppConfig } from "@/utils/config";
import { useToastStore } from "@/hooks/useToast";
import { useAppStore } from "@/stores/appStore";

interface UseConfigReturn {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  reloadConfig: () => Promise<void>;
}

/**
 * Build the post-login callback URL: the app root that preserves the originally
 * requested MAP_ID/MAP_VERSION, but with any /signin or /signout path removed.
 * Keeping MAP_ID lets a legitimate login return to the requested secured map;
 * dropping the auth path prevents a post-logout auto-login from bouncing back to
 * /signout (which would immediately sign the user out again → loop).
 */
function getSignInCallbackUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  // window.location.origin may be undefined in test environments that stub
  // window.location; fall back to parsing href.
  const origin = window.location.origin ?? new URL(window.location.href).origin;
  const params = new URLSearchParams(window.location.search);
  const kept = new URLSearchParams();
  const mapId = params.get("MAP_ID");
  const mapVersion = params.get("MAP_VERSION");
  if (mapId) kept.set("MAP_ID", mapId);
  if (mapVersion) kept.set("MAP_VERSION", mapVersion);
  const query = kept.toString();
  return `${origin}${basePath}/${query ? `?${query}` : ""}`;
}

/**
 * React hook for loading and managing application configuration
 */
export function useConfig(): UseConfigReturn {
  const config = useAppStore((state) => state.config);
  const loading = useAppStore((state) => state.configLoading);
  const error = useAppStore((state) => state.configError);
  const setConfig = useAppStore((state) => state.setConfig);
  const setConfigLoading = useAppStore((state) => state.setConfigLoading);
  const setConfigError = useAppStore((state) => state.setConfigError);

  const loadAppConfig = useCallback(async () => {
    const currentState = useAppStore.getState();

    if (currentState.config || currentState.configLoading) {
      return;
    }

    try {
      setConfigLoading(true);
      setConfigError(null);

      const loadedConfig = await loadConfig();
      setConfig(loadedConfig);
    } catch (err) {
      // Authenticated but no access to this map (403) — redirecting to sign in
      // again would cause an endless loop. Show a warning and fall back to the
      // default config instead.
      if (err instanceof MapAccessDeniedError) {
        console.warn(`Authenticated user does not have access to map "${err.mapId}" - falling back to default config`);
        useToastStore.getState().addToast(`You don't have access to the map "${err.mapId}". Loading the default map instead.`, "warning", 8000);
        // Remove MAP_ID from URL so the fallback load doesn't retry the same map
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("MAP_ID");
          window.history.replaceState({}, "", url.toString());
        }
        // Reload config without MAP_ID (loadConfig reads window.location at call time)
        try {
          const defaultConfig = await loadConfig();
          setConfig(defaultConfig);
        } catch (fallbackErr) {
          const errorMessage = fallbackErr instanceof Error ? fallbackErr.message : "Failed to load configuration";
          setConfigError(errorMessage);
          console.error("Error loading fallback config:", fallbackErr);
        }
        return;
      }

      // The requested map does not exist (404) — show an error, don't redirect.
      // Exception: if the missing map is the app's OWN default (no MAP_ID in the
      // URL), surface a clearer message instead of an endless retry.
      if (err instanceof MapNotFoundError) {
        setConfigError(`The map "${err.mapId}" could not be found.`);
        return;
      }

      // Check if this is an authentication required error for a secured map
      if (err instanceof AuthenticationRequiredError) {
        // Redirect to sign in. The callback URL keeps the requested MAP_ID so the
        // user returns to that map after a legitimate login, but strips any
        // /signin|/signout path so a post-logout auto-login can't loop back.
        signIn("azuread", { callbackUrl: getSignInCallbackUrl() });
        return; // Don't set error - we're redirecting to login
      }

      const errorMessage = err instanceof Error ? err.message : "Failed to load configuration";
      setConfigError(errorMessage);
      console.error("Error loading config:", err);
    } finally {
      setConfigLoading(false);
    }
  }, [setConfig, setConfigLoading, setConfigError]);

  const reloadConfig = async () => {
    setConfig(null);
    setConfigError(null);
    await loadAppConfig();
  };

  useEffect(() => {
    if (!config) {
      loadAppConfig();
    }
  }, [config, loadAppConfig]);

  useEffect(() => {
    if (config) {
      updatePageMetadata(config);
    }
  }, [config]);

  return {
    config,
    loading,
    error,
    reloadConfig,
  };
}
