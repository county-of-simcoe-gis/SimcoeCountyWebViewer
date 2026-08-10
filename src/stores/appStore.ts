import { create } from "zustand";
import type { AppConfig } from "@/utils/config";

interface AppState {
  // Loading states
  mapLoading: boolean;
  sidebarLoading: boolean;
  headerLoading: boolean;
  configLoading: boolean;

  // Configuration
  config: AppConfig | null;
  configError: string | null;

  // App info
  appInfo: {
    name: string;
    version: string;
    homepage: string;
  };

  // Authenticated user
  userName: string | null;

  // URL parameters
  urlParameters: Record<string, string>;
  urlParametersLoaded: boolean;

  // Actions
  setMapLoading: (loading: boolean) => void;
  setSidebarLoading: (loading: boolean) => void;
  setHeaderLoading: (loading: boolean) => void;
  setConfigLoading: (loading: boolean) => void;
  setConfig: (config: AppConfig | null) => void;
  setConfigError: (error: string | null) => void;
  setAppInfo: (info: Partial<AppState["appInfo"]>) => void;
  setUserName: (userName: string | null) => void;
  setUrlParameters: (params: Record<string, string>) => void;
  setUrlParametersLoaded: (loaded: boolean) => void;

  // Permissions
  permissions: Record<string, "granted" | "prompt" | "denied" | "unknown">;
  setPermissionState: (api: string, state: "granted" | "prompt" | "denied" | "unknown") => void;

  // Computed
  isAnyLoading: () => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  mapLoading: true,
  sidebarLoading: true,
  headerLoading: true,
  configLoading: false,
  config: null,
  configError: null,
  appInfo: {
    name: "",
    version: "",
    homepage: "",
  },
  userName: null,
  urlParameters: {},
  urlParametersLoaded: false,
  permissions: {},

  // Actions
  setMapLoading: (loading) => set({ mapLoading: loading }),
  setSidebarLoading: (loading) => set({ sidebarLoading: loading }),
  setHeaderLoading: (loading) => set({ headerLoading: loading }),
  setConfigLoading: (loading) => set({ configLoading: loading }),
  setConfig: (config) => set({ config, configError: null }),
  setConfigError: (error) => set({ configError: error }),
  setAppInfo: (info) =>
    set((state) => ({
      appInfo: { ...state.appInfo, ...info },
    })),
  setUserName: (userName) => set({ userName }),
  setUrlParameters: (params) => set({ urlParameters: params, urlParametersLoaded: true }),
  setUrlParametersLoaded: (loaded) => set({ urlParametersLoaded: loaded }),

  // Permissions
  setPermissionState: (api, permState) =>
    set((state) => ({ permissions: { ...state.permissions, [api]: permState } })),

  // Computed
  isAnyLoading: () => {
    const state = get();
    return state.mapLoading || state.sidebarLoading || state.headerLoading || state.configLoading;
  },
}));
