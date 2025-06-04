import { useState, useEffect } from 'react';
import { loadConfig, getConfig, updatePageMetadata, type AppConfig } from '@/utils/config';

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

  const loadAppConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const loadedConfig = await loadConfig();
      setConfig(loadedConfig);
      
      // Update page metadata (title, favicon)
      updatePageMetadata(loadedConfig);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration';
      setError(errorMessage);
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  };

  const reloadConfig = async () => {
    await loadAppConfig();
  };

  useEffect(() => {
    if (!config) {
      loadAppConfig();
    }
  }, []);

  return {
    config,
    loading,
    error,
    reloadConfig,
  };
} 