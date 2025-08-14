import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useConfig } from '@/hooks/useConfig'
import type { AppConfig } from '@/utils/config'

const mockConfig = {
  useMapConfigApi: false,
  mapId: 'default',
  headerLogoImageName: 'logo.png',
  title: 'Simcoe County Web Viewer',
  favicon: 'favicon.ico',
  originUrl: '',
  feedbackUrl: '',
  geoserverUrl: '',
  publicUrl: '',
  geoserverPath: 'geoserver',
  printUrl: '',
  apiUrl: '',
  apiUrlDev: '',
  includeAppStats: false,
  htmlIdentify: false,
  leftClickIdentify: true,
  excludeIdentifyTitleName: false,
  allowIdentifyExport: false,
  showFeedbackMessageOnStartup: false,
  showWhatsNewOnStartup: false,
  showWhatsNewPopupOnStartup: false,
  showTermsOnStartup: false,
  termsUrl: '',
  reportUrl: '',
  openLicenseUrl: '',
  whatsNewUrl: '',
  helpUrl: '',
  ieWarningUrl: '',
  propertyReportUrl: '',
  weatherRadarApiUrl: '',
  googleAnalyticsID: '',
  appStatsUrl: '',
  centerCoords: [0, 0],
  defaultZoom: 5,
  maxZoom: 20,
  controls: {
    rotate: true,
    fullScreen: true,
    zoomInOut: true,
    currentLocation: false,
    zoomExtent: true,
    scale: true,
    scaleLine: true,
    basemap: true,
    gitHubButton: false,
    scaleSelector: false,
  },
  storageKeys: {
    SearchHistory: 'SearchHistory',
    Draw: 'Draw',
    URLDontShowAgain: 'URLDontShowAgain',
  },
  mapTheme: 'light',
  showFloatingMenuHeader: false,
  showLoadingScreens: false,
  onlyStandardCursor: true,
  restrictOriginForUrlWindow: false,
  rightClickMenuVisibility: {},
  drawingOptionsToolsMenuVisibility: {},
  toc: {
    tocType: 'LIST',
    geoserverLayerGroupsUrl: '',
    geoserverLayerGroupsUrlType: 'root',
    esriServiceUrl: '',
    default_group: '',
    sources: [],
    helpLink: '',
    layerInfoURL: '',
    keywords: {},
  },
  sidebarToolComponents: [],
  sidebarThemeComponents: [],
} as AppConfig

describe('useConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockConfig,
    } as Response)
  })

  it('loads config and updates metadata', async () => {
    const { result } = renderHook(() => useConfig())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.config?.title).toBe('Simcoe County Web Viewer')
  })
})


