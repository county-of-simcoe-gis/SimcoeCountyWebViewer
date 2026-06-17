import { useEffect, useCallback } from "react";
import { signIn, getSession } from "next-auth/react";
import { loadConfig, updatePageMetadata, AuthenticationRequiredError, type AppConfig } from "@/utils/config";
import { useToastStore } from "@/hooks/useToast";
import { useAppStore } from "@/stores/appStore";

interface UseConfigReturn {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  reloadConfig: () => Promise<void>;
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
      // Check if this is an authentication required error for a secured map
      if (err instanceof AuthenticationRequiredError) {
        // Check if the user is already authenticated. If so, a 404 means they don't have
        // access to this specific map — redirecting to sign in again would cause an endless
        // loop. Instead, show a warning toast and fall back to the default config.
        const session = await getSession();
        if (session) {
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
        console.log(`Secured map "${err.mapId}" requires login - redirecting to sign in`);
        // Redirect to sign in with current URL as callback
        const currentUrl = typeof window !== "undefined" ? window.location.href : undefined;
        signIn("azuread", { callbackUrl: currentUrl });
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
    console.log("Config updated:", config);
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
