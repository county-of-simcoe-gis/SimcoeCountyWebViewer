import { WMSCapabilities } from 'ol/format.js'
import { TOCLayerGroup, TOCLayer, TOCSource } from '../stores/tocStore'

// Types for WMS Capabilities parsing
interface WMSLayer {
  Name: string
  Title: string
  Layer?: WMSLayer[]
  KeywordList?: string[]
  MinScaleDenominator?: number
  MaxScaleDenominator?: number
  queryable?: boolean
  opaque?: boolean
  Style?: Array<{
    LegendURL: Array<{
      OnlineResource: string
      size?: [number, number]
    }>
  }>
}

interface WMSCapabilitiesResponse {
  Capability: {
    Layer: {
      Layer: Array<{
        Name: string
        Title: string
        Layer?: WMSLayer[]
        KeywordList?: string[]
      }>
    }
  }
}

// Configuration types
interface ConfigKeyword {
  keyword: string
  type: string
  value: unknown
  splitChar?: string
  checkValue?: string
  relatedKeys?: string[]
}

interface Config {
  toc: {
    keywords: Record<string, ConfigKeyword>
    default_group?: string
  }
  geoserverPath?: string
}

// Layer index starting point
const LAYER_INDEX_START = 100

/**
 * Parse GeoServer keywords into structured metadata
 */
export function parseGeoServerKeywords(keywords: string[], config: Config): Record<string, unknown> {
  const parseKeywords = Object.assign({}, config.toc.keywords)
  const returnKeywords: Record<string, unknown> = {}
  
  // Initialize with default values
  const keys = Object.keys(parseKeywords)
  keys.forEach((key) => (returnKeywords[key] = parseKeywords[key].value))

  const parseValue = (keywordObj: ConfigKeyword, value: string | undefined): unknown => {
    switch (keywordObj.type) {
      case 'string':
        if (value === undefined) return keywordObj.value
        if (keywordObj.splitChar) return value.split(keywordObj.splitChar).join('')
        else return value
      case 'bool':
        // For boolean keywords:
        // - If no value (just keyword present), return true
        // - If checkValue is specified, check if value matches
        // - Otherwise parse as boolean
        if (value === undefined) return true
        if (keywordObj.checkValue) return value === keywordObj.checkValue
        else return value === 'true'
      case 'int':
        return value ? parseInt(value) : keywordObj.value
      case 'float':
        return value ? parseFloat(value) : keywordObj.value
      case 'array':
        if (!value) return keywordObj.value
        if (keywordObj.splitChar) return value.split(keywordObj.splitChar)
        else return [value]
      default:
        return keywordObj.value
    }
  }

  keywords.forEach((keyword) => {
    const splitKeyword = keyword.split('=')
    const key = splitKeyword[0]
    splitKeyword.shift()
    const value = splitKeyword.length >= 1 ? splitKeyword.join('=') : undefined
    
    // Process keyword if it exists in our configuration
    if (parseKeywords[key]) {
      returnKeywords[key] = parseValue(parseKeywords[key], value)
      if (parseKeywords[key].relatedKeys) {
        parseKeywords[key].relatedKeys.forEach((relation: string) => {
          returnKeywords[relation] = parseValue(parseKeywords[relation], value)
        })
      }
    }
  })

  return returnKeywords
}

/**
 * Create a layer object from WMS layer data
 */
export function buildLayerFromWMS(
  group: Partial<TOCLayerGroup> & { secure?: boolean; primary?: boolean },
  wmsLayer: WMSLayer,
  layerIndex: number,
  config: Config
): TOCLayer {
  const layerNameOnly = wmsLayer.Name
  let layerTitle = wmsLayer.Title
  
  if (layerTitle === undefined) layerTitle = layerNameOnly

  // Parse keywords for metadata
  const keywords = wmsLayer.KeywordList || []
  const allKeywords = parseGeoServerKeywords(keywords, config)

  // Build style URL for legend
  let styleUrl = ''
  if (wmsLayer.Style && wmsLayer.Style[0] && wmsLayer.Style[0].LegendURL && wmsLayer.Style[0].LegendURL[0]) {
    styleUrl = wmsLayer.Style[0].LegendURL[0].OnlineResource.replace('http:', 'https:')
    
    // Handle static image legend size override
    const legendSizeOverride = allKeywords['STATIC_IMAGE_LEGEND']
    if (legendSizeOverride && styleUrl !== '') {
      const legendSize = wmsLayer.Style[0].LegendURL[0].size || [20, 20]
      styleUrl = styleUrl
        .replace('width=20', `width=${legendSize[0]}`)
        .replace('height=20', `height=${legendSize[1]}`)
    }
  }

  // Extract metadata from keywords
  const liveLayer = allKeywords['LIVE_LAYER'] || false
  const canDownload = allKeywords['DOWNLOAD'] || false
  let displayName = (allKeywords['DISPLAY_NAME'] as string) || layerTitle
  const opacity = (allKeywords['OPACITY'] as number) || 1
  const disclaimerTitle = (allKeywords['DISCLAIMER_TITLE'] as string) || ''
  const disclaimerUrl = (allKeywords['DISCLAIMER_URL'] as string) || ''
  const warningMsg = (allKeywords['WARNING'] as string) || ''

  // Add group prefix if configured
  if (group.prefix) {
    displayName = group.prefix !== '' ? `${group.prefix} - ${displayName}` : displayName
  }

  // Build disclaimer object
  let disclaimer: string | undefined
  if (disclaimerUrl !== '' || disclaimerTitle !== '' || warningMsg !== '') {
    disclaimer = JSON.stringify({ title: disclaimerTitle, url: disclaimerUrl, warning: warningMsg })
  }

  // Scale denominators
  const minScale = wmsLayer.MinScaleDenominator || 0
  const maxScale = wmsLayer.MaxScaleDenominator || 100000000000

  // Check if layer should be visible
  const visibleLayers = group.visibleLayers || []
  const layerVisible = visibleLayers.includes(layerNameOnly)

  // Build server URLs
  const geoserverPath = config.geoserverPath || 'geoserver'
  const serverUrl = group.wmsGroupUrl?.split(`/${geoserverPath}/`)[0] + `/${geoserverPath}` || ''
  const metadataUrl = `${serverUrl}/rest/layers/${layerNameOnly.split(' ').join('%20')}.json`

  return {
    name: layerNameOnly,
    displayName,
    tocDisplayName: layerTitle,
    styleUrl,
    height: 30,
    drawIndex: layerIndex,
    index: layerIndex,
    showLegend: false,
    legendHeight: -1,
    legendImage: null,
    legendObj: null,
    visible: layerVisible,
    layer: null, // Will be populated when map integration is added
    metadataUrl,
    opacity: typeof opacity === 'number' ? opacity : 1,
    minScale,
    maxScale,
    liveLayer: Boolean(liveLayer) || false,
    groupName: group.label || '',
    group: group.value || '',
    userLayer: false,
    secured: group.secure || false,
    canDownload: Boolean(canDownload) || false,
    hasAttachments: false, // GeoServer layers don't typically have attachments
    disclaimer
  }
}

/**
 * Fetch and parse WMS GetCapabilities
 */
export async function fetchWMSCapabilities(url: string, secured: boolean = false): Promise<WMSCapabilitiesResponse> {
  const params: RequestInit = {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/text'
    }
  }

  if (secured) {
    // Add bearer token handling if needed
    // params.headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, params)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const text = await response.text()
    const parser = new WMSCapabilities()
    return parser.read(text) as WMSCapabilitiesResponse
  } catch (error) {
    console.error('Error fetching WMS capabilities:', error)
    throw error
  }
}

/**
 * Build layer groups from GeoServer WMS capabilities
 */
export async function getGroupsFromGeoServer(
  source: TOCSource,
  config: Config
): Promise<TOCLayerGroup[]> {
  try {
    const resultObj = await fetchWMSCapabilities(source.layerUrl, source.secure)
    
    const urlType = source.urlType || 'root'
    const groupLayerList = urlType === 'root' 
      ? [resultObj.Capability.Layer.Layer[0]]
      : urlType === 'group' 
        ? resultObj.Capability.Layer.Layer[0].Layer || []
        : [resultObj.Capability.Layer.Layer[0]]

    const parentGroup = urlType === 'root' 
      ? resultObj.Capability.Layer.Layer[0]
      : urlType === 'group' 
        ? resultObj.Capability.Layer.Layer[0] 
        : resultObj.Capability.Layer.Layer[0]

    // Parse parent keywords for global settings
    const parentKeywords = parentGroup.KeywordList || []
    const allParentKeywords = parseGeoServerKeywords(parentKeywords, config)
    
    // Extract default settings
    const defaultGroupName = (allParentKeywords['DEFAULT_GROUP'] as string) || ''

    const geoserverPath = config.geoserverPath || 'geoserver'
    const groups: TOCLayerGroup[] = []

    // Remove underscore helper
    const removeUnderscore = (name: string) => name.replace(/_/g, ' ')

    // Process each group
    for (const layerInfo of groupLayerList) {
      if (layerInfo.Layer !== undefined) {
        const groupName = layerInfo.Name
        const isDefault = groupName.toUpperCase() === defaultGroupName.toUpperCase()
        const groupDisplayName = layerInfo.Title
        const groupUrl = source.layerUrl.split(`/${geoserverPath}/`)[0] + 
          `/${geoserverPath}/` + groupName.replace(':', '/') + 
          '/ows?service=wms&version=1.3.0&request=GetCapabilities'

        // Parse group keywords
        const keywords = layerInfo.KeywordList || []
        const allGroupKeywords = parseGeoServerKeywords(keywords, config)
        
        let visibleLayers: string[] = []
        const groupPrefix = (allGroupKeywords['GROUP_PREFIX'] as string) || ''
        const allLayersVisible = allGroupKeywords['All_VISIBLE_LAYERS'] || false
        
        if (allLayersVisible) {
          visibleLayers = layerInfo.Layer.map((item: WMSLayer) => item.Name)
        } else {
          visibleLayers = (allGroupKeywords['VISIBLE_LAYERS'] as string[]) || []
        }

        // Override with source configuration
        if (source.group?.visibleLayers) {
          visibleLayers = source.group.visibleLayers
        }

        // Build layers
        const layerList: TOCLayer[] = []
        let layerIndex = layerInfo.Layer.length + LAYER_INDEX_START

        const tmpGroupObj: Partial<TOCLayerGroup> & { secure?: boolean; primary?: boolean } = {
          value: source.group?.name || groupName,
          label: source.group?.displayName || removeUnderscore(groupDisplayName),
          url: groupUrl,
          secure: source.secure,
          primary: source.primary,
          prefix: groupPrefix,
          defaultGroup: isDefault,
          visibleLayers,
          wmsGroupUrl: groupUrl
        }

        // Process layers recursively
        const buildLayers = (layers: WMSLayer[]) => {
          layers.forEach((currentLayer) => {
            if (!isDuplicate(layerList, currentLayer.Name)) {
              if (currentLayer.Layer === undefined) {
                // This is an actual layer (not a group)
                const layer = buildLayerFromWMS(tmpGroupObj, currentLayer, layerIndex, config)
                layerList.push(layer)
                layerIndex--
              } else {
                // This is a nested group, process its layers
                buildLayers(currentLayer.Layer)
              }
            }
          })
        }

        buildLayers(layerInfo.Layer)

        // Create the final group object
        const groupObj: TOCLayerGroup = {
          value: source.group?.name || groupName,
          label: source.group?.displayName || removeUnderscore(groupDisplayName),
          url: groupUrl,
          prefix: groupPrefix,
          defaultGroup: isDefault,
          visibleLayers,
          wmsGroupUrl: groupUrl,
          customRestUrl: '',
          layers: layerList
        }

        if (groupObj.layers.length >= 1) {
          groups.push(groupObj)
        }
      }
    }

    return groups
  } catch (error) {
    console.error('Error loading GeoServer groups:', error)
    throw error
  }
}

/**
 * Check if layer name already exists in the list
 */
function isDuplicate(layerList: TOCLayer[], newLayerName: string): boolean {
  return layerList.some(layer => layer.name === newLayerName)
}

/**
 * Fetch and parse ArcGIS REST service
 */
export async function fetchArcGISService(url: string, secured: boolean = false): Promise<Record<string, unknown>> {
  const serviceUrl = url.endsWith('?f=json') ? url : `${url}?f=json`
  
  const params: RequestInit = {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  if (secured) {
    // Add token handling if needed
    // params.headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(serviceUrl, params)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching ArcGIS service:', error)
    throw error
  }
}

/**
 * Build layer groups from ArcGIS REST service
 */
export async function getGroupsFromArcGIS(
  source: TOCSource
): Promise<TOCLayerGroup[]> {
  try {
    const serviceInfo = await fetchArcGISService(source.layerUrl, source.secure)
    
    // For now, create a basic group structure
    // This would need to be expanded based on the actual ArcGIS service structure
    const groupName = source.group?.name || 'ArcGIS_Group'
    const groupDisplayName = source.group?.displayName || (serviceInfo.mapName as string) || 'ArcGIS Layers'
    
    const group: TOCLayerGroup = {
      value: groupName,
      label: groupDisplayName,
      url: source.layerUrl,
      prefix: '',
      defaultGroup: source.primary || false,
      visibleLayers: source.group?.visibleLayers || [],
      wmsGroupUrl: source.layerUrl,
      customRestUrl: source.layerUrl,
      layers: [] // Would need to parse service.layers and build TOCLayer objects
    }

    return [group]
  } catch (error) {
    console.error('Error loading ArcGIS groups:', error)
    throw error
  }
}

/**
 * Main function to load layer groups from all sources
 */
export async function loadLayerGroupsFromSources(
  sources: TOCSource[],
  config: Config
): Promise<{ groups: TOCLayerGroup[]; defaultGroupName: string }> {
  const allGroups: TOCLayerGroup[] = []
  let defaultGroupName = config.toc.default_group || ''

  for (const source of sources) {
    try {
      let groups: TOCLayerGroup[] = []
      
      switch (source.type.toLowerCase()) {
        case 'geoserver':
          groups = await getGroupsFromGeoServer(source, config)
          break
        case 'arcgis':
          groups = await getGroupsFromArcGIS(source)
          break
        default:
          console.warn(`Unknown source type: ${source.type}`)
          continue
      }

      // Find default group
      if (source.primary && !defaultGroupName) {
        const defaultGroup = groups.find(g => g.defaultGroup)
        if (defaultGroup) {
          defaultGroupName = defaultGroup.label
        }
      }

      allGroups.push(...groups)
    } catch (error) {
      console.error(`Error loading source ${source.layerUrl}:`, error)
      // Continue with other sources even if one fails
    }
  }

  return {
    groups: allGroups,
    defaultGroupName
  }
} 