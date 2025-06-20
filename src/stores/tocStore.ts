import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { loadLayerGroupsFromSources } from '../utils/tocHelpers'

// Layer interface based on the old app's layer structure
export interface TOCLayer {
  name: string
  displayName: string
  tocDisplayName: string
  styleUrl: string
  height: number
  drawIndex: number
  index: number
  showLegend: boolean
  legendHeight: number
  legendImage: string | null
  legendObj: unknown | null
  visible: boolean
  layer: unknown | null // OpenLayers layer object
  metadataUrl: string | null
  opacity: number
  minScale: number
  maxScale: number
  liveLayer: boolean
  groupName: string
  group: string
  userLayer: boolean
  secured?: boolean
  canDownload?: boolean
  hasAttachments?: boolean
  disclaimer?: string
}

// Layer group interface based on the old app's group structure
export interface TOCLayerGroup {
  value: string
  label: string
  defaultGroup: boolean
  url: string
  prefix: string
  visibleLayers: string[]
  wmsGroupUrl: string
  customRestUrl: string
  layers: TOCLayer[]
}

// Configuration for TOC sources from config.json
export interface TOCSource {
  group?: {
    name: string
    displayName: string
    visibleLayers: string[]
  }
  layerUrl: string
  secure: boolean
  primary: boolean
  urlType: string
  type: string
}

interface TOCState {
  // TOC Type (LIST or FOLDER)
  tocType: 'LIST' | 'FOLDER'
  
  // Layer groups for both views
  layerListGroups: TOCLayerGroup[]
  layerFolderGroups: TOCLayerGroup[]
  
  // All layers flattened for search/filtering
  allLayers: TOCLayer[]
  
  // Currently selected group
  selectedGroup: TOCLayerGroup | null
  defaultGroup: TOCLayerGroup | null
  
  // Search and filtering
  searchText: string
  sortAlpha: boolean
  
  // Global opacity
  globalOpacity: number
  
  // Loading state
  isLoading: boolean
  
  // Layer count
  layerCount: number
  
  // Configuration
  helpLink: string
  sources: TOCSource[]
  
  // Actions
  setTocType: (type: 'LIST' | 'FOLDER') => void
  setLayerGroups: (type: 'LIST' | 'FOLDER', groups: TOCLayerGroup[]) => void
  setSelectedGroup: (group: TOCLayerGroup | null) => void
  setDefaultGroup: (group: TOCLayerGroup | null) => void
  setSearchText: (text: string) => void
  setSortAlpha: (sort: boolean) => void
  setGlobalOpacity: (opacity: number) => void
  setIsLoading: (loading: boolean) => void
  setLayerCount: (count: number) => void
  setHelpLink: (link: string) => void
  setSources: (sources: TOCSource[]) => void
  
  // Layer manipulation
  updateLayerVisibility: (layerName: string, groupName: string, visible: boolean) => void
  updateLayerOpacity: (layerName: string, groupName: string, opacity: number) => void
  toggleLayerLegend: (layerName: string, groupName: string) => void
  moveLayer: (groupName: string, oldIndex: number, newIndex: number) => void
  
  // Group manipulation  
  addCustomLayer: (layer: TOCLayer, groupName: string) => void
  removeCustomLayer: (layerName: string, groupName: string) => void
  
  // Utility functions
  getLayerByName: (layerName: string, groupName?: string) => TOCLayer | null
  getGroupByName: (groupName: string) => TOCLayerGroup | null
  getAllVisibleLayers: () => TOCLayer[]
  getFilteredLayers: (groupName: string, searchText: string) => TOCLayer[]
  
  // Initialization
  initializeFromConfig: (config: { 
    toc: {
      tocType: string
      sources: TOCSource[]
      helpLink: string
      default_group: string
    }
  }) => void
  
  // Layer loading
  loadLayersFromSources: () => Promise<void>
  refreshTOC: (isReset?: boolean) => Promise<void>
  
  // Legend fetching
  fetchLayerLegend: (layer: TOCLayer, group: TOCLayerGroup) => Promise<void>
  fetchLayerLegendFromRest: (layer: TOCLayer, group: TOCLayerGroup) => Promise<void>
  
  // Auto-fetch all legends asynchronously after initial load
  autoFetchAllLegends: () => void

  // Utility function to check if a legend is blank/empty
  isLegendBlank: (layer: TOCLayer) => boolean
}

export const useTOCStore = create<TOCState>()(
  immer((set, get) => ({
    // Initial state
    tocType: 'LIST',
    layerListGroups: [],
    layerFolderGroups: [],
    allLayers: [],
    selectedGroup: null,
    defaultGroup: null,
    searchText: '',
    sortAlpha: false,
    globalOpacity: 1,
    isLoading: false,
    layerCount: 0,
    helpLink: '',
    sources: [],
    
    // Actions
    setTocType: (type) => {
      set((state) => {
        state.tocType = type
      })
    },
    
    setLayerGroups: (type, groups) => {
      set((state) => {
        if (type === 'LIST') {
          state.layerListGroups = groups
        } else {
          state.layerFolderGroups = groups
        }
        
        // Update all layers and layer count
        const allLayers: TOCLayer[] = []
        groups.forEach(group => {
          allLayers.push(...group.layers)
        })
        state.allLayers = allLayers
        state.layerCount = allLayers.length
      })
    },
    
    setSelectedGroup: (group) => {
      set((state) => {
        state.selectedGroup = group
      })
    },
    
    setDefaultGroup: (group) => {
      set((state) => {
        state.defaultGroup = group
        if (!state.selectedGroup && group) {
          state.selectedGroup = group
        }
      })
    },
    
    setSearchText: (text) => {
      set((state) => {
        state.searchText = text
      })
    },
    
    setSortAlpha: (sort) => {
      set((state) => {
        state.sortAlpha = sort
        
        // Re-sort layers in all groups
        const currentGroups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
        currentGroups.forEach(group => {
          if (sort) {
            group.layers.sort((a, b) => a.tocDisplayName.localeCompare(b.tocDisplayName))
          } else {
            group.layers.sort((a, b) => a.drawIndex - b.drawIndex)
          }
        })
      })
    },
    
    setGlobalOpacity: (opacity) => {
      set((state) => {
        state.globalOpacity = opacity
        
        // Apply opacity to all visible layers
        state.allLayers.forEach(layer => {
          if (layer.visible && layer.layer) {
            // Apply to OpenLayers layer when available
            // layer.layer.setOpacity(opacity * layer.opacity)
          }
        })
      })
    },
    
    setIsLoading: (loading) => {
      set((state) => {
        state.isLoading = loading
      })
    },
    
    setLayerCount: (count) => {
      set((state) => {
        state.layerCount = count
      })
    },
    
    setHelpLink: (link) => {
      set((state) => {
        state.helpLink = link
      })
    },
    
    setSources: (sources) => {
      set((state) => {
        state.sources = sources
      })
    },
    
    // Layer manipulation
    updateLayerVisibility: (layerName, groupName, visible) => {
      set((state) => {
        const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
        const group = groups.find(g => g.label === groupName || g.value === groupName)
        if (group) {
          const layer = group.layers.find(l => l.name === layerName)
          if (layer) {
            layer.visible = visible
            if (layer.layer) {
              // Apply to OpenLayers layer when available
              // layer.layer.setVisible(visible)
            }
          }
        }
      })
    },
    
    updateLayerOpacity: (layerName, groupName, opacity) => {
      set((state) => {
        const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
        const group = groups.find(g => g.label === groupName || g.value === groupName)
        if (group) {
          const layer = group.layers.find(l => l.name === layerName)
          if (layer) {
            layer.opacity = opacity
            if (layer.layer && layer.visible) {
              // Apply to OpenLayers layer when available
              // layer.layer.setOpacity(opacity * state.globalOpacity)
            }
          }
        }
      })
    },
    
    toggleLayerLegend: (layerName, groupName) => {
      const state = get()
      const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
      const group = groups.find(g => g.label === groupName || g.value === groupName)
      
      if (group) {
        const layer = group.layers.find(l => l.name === layerName)
        if (layer) {
          const shouldShow = !layer.showLegend
          
          // Update the showLegend state
          set((state) => {
            const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
            const currentGroup = groups.find(g => g.label === groupName || g.value === groupName)
            if (currentGroup) {
              const currentLayer = currentGroup.layers.find(l => l.name === layerName)
              if (currentLayer) {
                currentLayer.showLegend = shouldShow
                
                // ALSO update the allLayers array
                const allLayerItem = state.allLayers.find(l => l.name === layerName)
                if (allLayerItem) {
                  allLayerItem.showLegend = shouldShow
                }
              }
            }
          })
          
          // If showing legend and no legend data exists, fetch it (outside of set)
          if (shouldShow && !layer.legendImage && !layer.legendObj && layer.styleUrl) {
            state.fetchLayerLegend(layer, group)
          } else if (shouldShow && !layer.legendImage && !layer.legendObj && !layer.styleUrl) {
            state.fetchLayerLegendFromRest(layer, group)
          }
        }
      }
    },
    
    moveLayer: (groupName, oldIndex, newIndex) => {
      set((state) => {
        const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
        const group = groups.find(g => g.label === groupName || g.value === groupName)
        if (group && !state.sortAlpha) {
          const layers = group.layers
          const movedLayer = layers.splice(oldIndex, 1)[0]
          layers.splice(newIndex, 0, movedLayer)
          
          // Update draw indices
          layers.forEach((layer, index) => {
            layer.drawIndex = index
            layer.index = index
          })
        }
      })
    },
    
    addCustomLayer: (layer, groupName) => {
      set((state) => {
        const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
        let group = groups.find(g => g.label === groupName || g.value === groupName)
        
        if (!group) {
          // Create new group if it doesn't exist
          group = {
            value: groupName.toLowerCase().replace(/\s+/g, '_'),
            label: groupName,
            defaultGroup: false,
            url: '',
            prefix: '',
            visibleLayers: [],
            wmsGroupUrl: '',
            customRestUrl: '',
            layers: []
          }
          groups.push(group)
        }
        
        // Add layer to group
        layer.groupName = groupName
        layer.group = group.value
        layer.drawIndex = group.layers.length
        layer.index = group.layers.length
        group.layers.push(layer)
        
        // Update all layers
        const allLayers: TOCLayer[] = []
        groups.forEach(grp => {
          allLayers.push(...grp.layers)
        })
        state.allLayers = allLayers
        state.layerCount = allLayers.length
      })
    },
    
    removeCustomLayer: (layerName, groupName) => {
      set((state) => {
        const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
        const group = groups.find(g => g.label === groupName || g.value === groupName)
        if (group) {
          const layerIndex = group.layers.findIndex(l => l.name === layerName)
          if (layerIndex !== -1) {
            group.layers.splice(layerIndex, 1)
            
            // Update draw indices
            group.layers.forEach((layer, index) => {
              layer.drawIndex = index
              layer.index = index
            })
            
            // Update all layers
            const allLayers: TOCLayer[] = []
            groups.forEach(grp => {
              allLayers.push(...grp.layers)
            })
            state.allLayers = allLayers
            state.layerCount = allLayers.length
          }
        }
      })
    },
    
    // Utility functions
    getLayerByName: (layerName, groupName) => {
      const state = get()
      const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
      
      if (groupName) {
        const group = groups.find(g => g.label === groupName || g.value === groupName)
        return group?.layers.find(l => l.name === layerName) || null
      } else {
        for (const group of groups) {
          const layer = group.layers.find(l => l.name === layerName)
          if (layer) return layer
        }
        return null
      }
    },
    
    getGroupByName: (groupName) => {
      const state = get()
      const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
      return groups.find(g => g.label === groupName || g.value === groupName) || null
    },
    
    getAllVisibleLayers: () => {
      const state = get()
      return state.allLayers.filter(layer => layer.visible)
    },
    
    getFilteredLayers: (groupName, searchText) => {
      const state = get()
      const group = state.getGroupByName(groupName)
      if (!group) return []
      
      if (!searchText) return group.layers
      
      return group.layers.filter(layer => 
        layer.tocDisplayName.toLowerCase().includes(searchText.toLowerCase())
      )
    },
    
    // Initialization
    initializeFromConfig: (config) => {
      set((state) => {
        state.tocType = config.toc.tocType as 'LIST' | 'FOLDER' || 'LIST'
        state.sources = config.toc.sources || []
        state.helpLink = config.toc.helpLink || ''
      })
    },
    
    // Layer loading (now implemented with actual geoserver calls)
    loadLayersFromSources: async () => {
      const state = get()
      
      // Prevent multiple simultaneous calls
      if (state.isLoading) {
        return;
      }
      
      state.setIsLoading(true)
      
      try {
        // Get config from app store or window global
        const config = (globalThis as Record<string, unknown>).config as {
          toc: {
            keywords: Record<string, {
              keyword: string
              type: string
              value: unknown
              splitChar?: string
              checkValue?: string
              relatedKeys?: string[]
            }>
            default_group?: string
          }
          geoserverPath?: string
        } || {
          toc: {
            keywords: {
              "DEFAULT_GROUP": { keyword: "DEFAULT_GROUP", type: "string", value: "" },
              "LIVE_LAYER": { keyword: "LIVE_LAYER", type: "bool", value: false },
              "GROUP_PREFIX": { keyword: "GROUP_PREFIX", type: "string", value: "" },
              "DISPLAY_NAME": { keyword: "DISPLAY_NAME", type: "string", value: "" },
              "OPACITY": { keyword: "OPACITY", type: "float", value: 1 },
              "DOWNLOAD": { keyword: "DOWNLOAD", type: "bool", value: false },
              "VISIBLE_LAYERS": { keyword: "VISIBLE_LAYERS", type: "array", value: [], splitChar: ",", relatedKeys: ["All_VISIBLE_LAYERS"] },
              "All_VISIBLE_LAYERS": { keyword: "VISIBLE_LAYERS", type: "bool", value: false, checkValue: "ALL" },
              "DISCLAIMER_TITLE": { keyword: "DISCLAIMER_TITLE", type: "string", value: "" },
              "DISCLAIMER_URL": { keyword: "DISCLAIMER_URL", type: "string", value: "" },
              "WARNING": { keyword: "WARNING", type: "string", value: "" },
              "STATIC_IMAGE_LEGEND": { keyword: "STATIC_IMAGE_LEGEND", type: "bool", value: false }
            },
            default_group: 'All_Layers_Public'
          },
          geoserverPath: 'geoserver'
        }
        
        // Load from actual sources using TOC helpers
        const result = await loadLayerGroupsFromSources(state.sources, config)
                  // Set the layer groups for current TOC type
          state.setLayerGroups(state.tocType, result.groups)
        
        // Set default group if found
        if (result.groups.length > 0) {
          let defaultGroup = result.groups.find(g => g.defaultGroup)
          if (!defaultGroup) {
            // If no default group marked, use the primary source's first group
            const primarySource = state.sources.find(s => s.primary)
            if (primarySource) {
              defaultGroup = result.groups.find(g => g.url.includes(primarySource.layerUrl))
            }
            // If still no default, use first group
            if (!defaultGroup) {
              defaultGroup = result.groups[0]
            }
          }
          state.setDefaultGroup(defaultGroup)
        }
        
                  // After loading is complete, start fetching legends asynchronously
          state.autoFetchAllLegends();
        
      } catch (error) {
        console.error('Error loading layers:', error)
        
        // Fallback to mock data if loading fails
        const mockGroups: TOCLayerGroup[] = state.sources.map((source, index) => ({
          value: source.group?.name || `group_${index}`,
          label: source.group?.displayName || `Group ${index}`,
          defaultGroup: source.primary || false,
          url: source.layerUrl,
          prefix: '',
          visibleLayers: source.group?.visibleLayers || [],
          wmsGroupUrl: source.layerUrl,
          customRestUrl: '',
          layers: [] // Empty layers for mock data
        }))
        
        state.setLayerGroups(state.tocType, mockGroups)
        
        if (mockGroups.length > 0) {
          const defaultGroup = mockGroups.find(g => g.defaultGroup) || mockGroups[0]
          state.setDefaultGroup(defaultGroup)
        }
        
      } finally {
        state.setIsLoading(false)
      }
    },
    
    refreshTOC: async (isReset = false) => {
      const state = get()
      
      if (isReset) {
        // Clear existing data
        state.setLayerGroups('LIST', [])
        state.setLayerGroups('FOLDER', [])
        state.setSelectedGroup(null)
        state.setDefaultGroup(null)
      }
      
      await state.loadLayersFromSources()
    },
    
    // Add legend fetching function
    fetchLayerLegend: async (layer: TOCLayer, group: TOCLayerGroup) => {
      try {
        // If we have a style URL (WMS GetLegendGraphic), try to fetch it
        if (layer.styleUrl) {
          // Test if the image URL is accessible
          const img = new Image()
          img.onload = () => {
            // Image loaded successfully, update the layer
            set((state) => {
              const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
              const currentGroup = groups.find(g => g.label === group.label || g.value === group.value)
              if (currentGroup) {
                const currentLayer = currentGroup.layers.find(l => l.name === layer.name)
                if (currentLayer) {
                  currentLayer.legendImage = layer.styleUrl
                  currentLayer.legendHeight = img.height || 20
                  
                  // ALSO update the allLayers array
                  const allLayerItem = state.allLayers.find(l => l.name === layer.name)
                  if (allLayerItem) {
                    allLayerItem.legendImage = layer.styleUrl
                    allLayerItem.legendHeight = img.height || 20
                  }
                }
              }
            })
          }
          img.onerror = async () => {
            // Image failed to load, try to fetch legend info from geoserver REST
            await get().fetchLayerLegendFromRest(layer, group)
          }
          img.src = layer.styleUrl
        } else {
          // No style URL, try to fetch from REST API
          await get().fetchLayerLegendFromRest(layer, group)
        }
      } catch (error) {
        console.error('Error fetching layer legend:', error)
      }
    },

    // Fetch legend from GeoServer REST API
    fetchLayerLegendFromRest: async (layer: TOCLayer, group: TOCLayerGroup) => {
      try {
        if (layer.metadataUrl) {
          const response = await fetch(layer.metadataUrl)
          if (response.ok) {
            const metadata = await response.json()
            
            // Check if there's style information in the metadata
            if (metadata.defaultStyle && metadata.defaultStyle.href) {
              const styleResponse = await fetch(metadata.defaultStyle.href + '.json')
              if (styleResponse.ok) {
                const styleData = await styleResponse.json()
                
                // Update layer with legend object
                set((state) => {
                  const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
                  const currentGroup = groups.find(g => g.label === group.label || g.value === group.value)
                  if (currentGroup) {
                    const currentLayer = currentGroup.layers.find(l => l.name === layer.name)
                    if (currentLayer) {
                      currentLayer.legendObj = styleData
                      currentLayer.legendHeight = 100 // Default height for object legends
                      
                      // ALSO update the allLayers array
                      const allLayerItem = state.allLayers.find(l => l.name === layer.name)
                      if (allLayerItem) {
                        allLayerItem.legendObj = styleData
                        allLayerItem.legendHeight = 100
                      }
                    }
                  }
                })
                return
              }
            }
          }
        }
        
        // Fallback: create a simple text legend
        set((state) => {
          const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
          const currentGroup = groups.find(g => g.label === group.label || g.value === group.value)
          if (currentGroup) {
            const currentLayer = currentGroup.layers.find(l => l.name === layer.name)
            if (currentLayer) {
              currentLayer.legendObj = { 
                type: 'text', 
                content: `Legend for ${layer.tocDisplayName}` 
              }
              currentLayer.legendHeight = 30
              
              // ALSO update the allLayers array
              const allLayerItem = state.allLayers.find(l => l.name === layer.name)
              if (allLayerItem) {
                allLayerItem.legendObj = { 
                  type: 'text', 
                  content: `Legend for ${layer.tocDisplayName}` 
                }
                allLayerItem.legendHeight = 30
              }
            }
          }
        })
      } catch (error) {
        console.error('Error fetching legend from REST API:', error)
        
        // Fallback: create a simple text legend
        set((state) => {
          const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups
          const currentGroup = groups.find(g => g.label === group.label || g.value === group.value)
          if (currentGroup) {
            const currentLayer = currentGroup.layers.find(l => l.name === layer.name)
            if (currentLayer) {
              currentLayer.legendObj = { 
                type: 'text', 
                content: `Legend for ${layer.tocDisplayName}` 
              }
              currentLayer.legendHeight = 30
              
              // ALSO update the allLayers array
              const allLayerItem = state.allLayers.find(l => l.name === layer.name)
              if (allLayerItem) {
                allLayerItem.legendObj = { 
                  type: 'text', 
                  content: `Legend for ${layer.tocDisplayName}` 
                }
                allLayerItem.legendHeight = 30
              }
            }
          }
        })
      }
    },
    
    // Auto-fetch all legends asynchronously after initial load
    autoFetchAllLegends: async () => {
      const state = get();
      const groups = state.tocType === 'LIST' ? state.layerListGroups : state.layerFolderGroups;
      
      let totalLegendFetches = 0;
      
      // Iterate through all groups and layers
      for (const group of groups) {
        for (const layer of group.layers) {
          // Only fetch if layer has a styleUrl and doesn't already have legend data
          if (layer.styleUrl && !layer.legendImage && !layer.legendObj) {
            totalLegendFetches++;
            
            // Fetch legend asynchronously without waiting
            state.fetchLayerLegend(layer, group).catch(() => {
              // We can ignore individual fetch errors here as it's a background process
            });
            
            // Add small delay to prevent overwhelming the server
            if (totalLegendFetches % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
      }
      
    },

    // Utility function to check if a legend is blank/empty
    isLegendBlank: (layer: TOCLayer): boolean => {
      // Check if no legend data at all
      if (!layer.legendImage && !layer.legendObj) {
        return true;
      }

      // Check for blank/empty legend image
      if (layer.legendImage) {
        // Add specific checks for blank images when we get the sample data
        if (layer.legendImage === '' || layer.legendImage === null) {
          return true;
        }

        // Check for known blank legend patterns from GeoServer
        const url = layer.legendImage;
        
        // Check if it's a GetLegendGraphic request with small dimensions that often indicate blank legends
        if (url.includes('GetLegendGraphic')) {
          // Extract dimensions from URL if present
          const widthMatch = url.match(/[?&]width=(\d+)/);
          const heightMatch = url.match(/[?&]height=(\d+)/);
          
          if (widthMatch && heightMatch) {
            const width = parseInt(widthMatch[1]);
            const height = parseInt(heightMatch[1]);
            
            // Common blank legend dimensions (adjust based on your server's patterns)
            if ((width <= 63 && height <= 21) || // Sample case
                (width <= 20 && height <= 20) || // Very small legends
                (width <= 1 && height <= 1)) {   // 1x1 pixel blanks
              return true;
            }
          }
        }

        // Check for specific layer patterns that tend to have blank legends
        if (url.includes('Named_Place_Label') || 
            url.includes('Label') && url.includes('GetLegendGraphic')) {
          return true;
        }
      }

      // Check for blank legend object
      if (layer.legendObj) {
        // Handle different types of blank legend objects
        if (layer.legendObj === null) {
          return true;
        }
        
        if (typeof layer.legendObj === 'object') {
          const obj = layer.legendObj as Record<string, unknown>;
          
          // Check for empty object
          if (Object.keys(obj).length === 0) {
            return true;
          }
          
          // Check for text type with empty content
          if (obj.type === 'text' && (!obj.content || obj.content === '')) {
            return true;
          }
          
          // Check for fallback text legends (our generated ones)
          if (obj.type === 'text' && typeof obj.content === 'string' && 
              obj.content.startsWith('Legend for ')) {
            return true;
          }
        }
      }

      return false;
    },
  }))
) 
