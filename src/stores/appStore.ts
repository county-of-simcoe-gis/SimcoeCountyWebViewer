import { create } from 'zustand'
import type { AppConfig } from '@/utils/config'

interface AppState {
  // Loading states
  mapLoading: boolean
  sidebarLoading: boolean
  headerLoading: boolean
  configLoading: boolean
  
  // Configuration
  config: AppConfig | null
  configError: string | null
  
  // App info
  appInfo: {
    name: string
    version: string
    homepage: string
  }
  
  // Actions
  setMapLoading: (loading: boolean) => void
  setSidebarLoading: (loading: boolean) => void
  setHeaderLoading: (loading: boolean) => void
  setConfigLoading: (loading: boolean) => void
  setConfig: (config: AppConfig | null) => void
  setConfigError: (error: string | null) => void
  setAppInfo: (info: Partial<AppState['appInfo']>) => void
  
  // Computed
  isAnyLoading: () => boolean
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  mapLoading: true,
  sidebarLoading: true,
  headerLoading: true,
  configLoading: true,
  config: null,
  configError: null,
  appInfo: {
    name: 'Simcoe County Web Viewer',
    version: '1.0.0',
    homepage: ''
  },
  
  // Actions
  setMapLoading: (loading) => set({ mapLoading: loading }),
  setSidebarLoading: (loading) => set({ sidebarLoading: loading }),
  setHeaderLoading: (loading) => set({ headerLoading: loading }),
  setConfigLoading: (loading) => set({ configLoading: loading }),
  setConfig: (config) => set({ config, configError: null }),
  setConfigError: (error) => set({ configError: error }),
  setAppInfo: (info) => set((state) => ({ 
    appInfo: { ...state.appInfo, ...info } 
  })),
  
  // Computed
  isAnyLoading: () => {
    const state = get()
    return state.mapLoading || state.sidebarLoading || state.headerLoading || state.configLoading
  }
})) 