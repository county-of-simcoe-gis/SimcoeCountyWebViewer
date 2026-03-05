import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { loadConfig, getConfig, updatePageMetadata, AuthenticationRequiredError, type AppConfig } from "@/utils/config";

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
  const [config, setConfig] = useState<AppConfig | null>(getConfig());
  const [loading, setLoading] = useState<boolean>(!config);
  const [error, setError] = useState<string | null>(null);

  const loadAppConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const loadedConfig = await loadConfig();
      setConfig(loadedConfig);

      // Update page metadata (title, favicon)
      updatePageMetadata(loadedConfig);
    } catch (err) {
      // Check if this is an authentication required error for a secured map
      if (err instanceof AuthenticationRequiredError) {
        console.log(`Secured map "${err.mapId}" requires login - redirecting to sign in`);
        // Redirect to sign in with current URL as callback
        const currentUrl = typeof window !== "undefined" ? window.location.href : undefined;
        signIn("azuread", { callbackUrl: currentUrl });
        return; // Don't set error - we're redirecting to login
      }

      const errorMessage = err instanceof Error ? err.message : "Failed to load configuration";
      setError(errorMessage);
      console.error("Error loading config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadConfig = async () => {
    await loadAppConfig();
  };

  useEffect(() => {
    if (!config) {
      loadAppConfig();
    }
  }, [config, loadAppConfig]);

  return {
    config,
    loading,
    error,
    reloadConfig,
  };
}
