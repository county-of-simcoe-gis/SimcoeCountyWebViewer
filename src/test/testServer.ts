import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

// Mock configuration object for tests
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
  apiUrl: 'https://api.example.com/',
  apiUrlDev: 'https://api-dev.example.com/',
  includeAppStats: false,
  htmlIdentify: false,
  leftClickIdentify: true,
  excludeIdentifyTitleName: false,
  allowIdentifyExport: true,
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
  centerCoords: [-8878504.68, 5543492.45],
  defaultZoom: 10,
  maxZoom: 20,
  controls: {
    rotate: true,
    fullScreen: false,
    zoomInOut: true,
    currentLocation: false,
    zoomExtent: true,
    scale: true,
    scaleLine: true,
    basemap: false,
    gitHubButton: false,
    scaleSelector: false,
  },
  storageKeys: {
    SearchHistory: 'SCWV_SearchHistory',
    Draw: 'SCWV_Draw',
    URLDontShowAgain: 'SCWV_URLDontShowAgain',
  },
  mapTheme: 'light',
  showFloatingMenuHeader: false,
  showLoadingScreens: true,
  onlyStandardCursor: true,
  restrictOriginForUrlWindow: false,
  rightClickMenuVisibility: {},
  drawingOptionsToolsMenuVisibility: {},
  toc: {
    tocType: 'LIST',
    geoserverLayerGroupsUrl: 'http://example.com/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities',
    geoserverLayerGroupsUrlType: 'wms',
    esriServiceUrl: '',
    default_group: 'All_Layers_Public',
    sources: [],
    helpLink: '',
    layerInfoURL: '',
    keywords: {},
    loaderType: 'DEFAULT',
  },
  sidebarToolComponents: [
    { id: 1, name: 'Measure', componentName: 'Measure', description: 'Measure', imageName: 'measure.png', enabled: true },
    { id: 2, name: 'Print', componentName: 'Print', description: 'Print', imageName: 'print.png', enabled: true },
    { id: 3, name: 'Coordinates', componentName: 'Coordinates', description: 'Coordinates', imageName: 'coordinates.png', enabled: true },
  ],
  sidebarThemeComponents: [
    { id: 1, name: 'Forestry', componentName: 'Forestry', description: 'Forestry', imageName: 'forestry.png', enabled: true },
  ],
}

// Default handlers for MSW - individual tests can override with server.use(...)
export const handlers = [
  // Config endpoint
  http.get('/config.json', () => HttpResponse.json(mockConfig)),
  http.get('**/config.json', () => HttpResponse.json(mockConfig)),

  // Search API endpoints
  http.get('**/public/search/types', () => 
    HttpResponse.json(['Address', 'Parcel', 'Property', 'Road'])
  ),
  
  http.get('**/public/search', ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q') || ''
    const type = url.searchParams.get('type') || 'All'
    
    if (q.length < 2) return HttpResponse.json([])
    
    const mockResults = [
      {
        name: `${q} Main St`,
        type: 'Address',
        municipality: 'Test Town',
        location_id: 'addr_1',
        x: -8878504.68,
        y: 5543492.45,
      },
      {
        name: `${q} Secondary Result`,
        type: 'Parcel',
        municipality: 'Test Township',
        location_id: 'parcel_1',
        x: -8878600.0,
        y: 5543600.0,
      }
    ]
    
    return HttpResponse.json(
      type === 'All' ? mockResults : mockResults.filter(r => r.type === type)
    )
  }),
  
  http.get('**/public/search/:locationId', () => {
    return HttpResponse.json({
      name: 'Detailed Location',
      type: 'Address',
      geojson: JSON.stringify({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-8878504.68, 5543492.45] },
        properties: { name: 'Test Location' }
      }),
      x: -8878504.68,
      y: 5543492.45,
    })
  }),
]

export const server = setupServer(...handlers)


