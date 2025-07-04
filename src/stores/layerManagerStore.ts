import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Layer } from 'ol/layer'
import LayerOrderConfig from '../utils/openlayers/LayerOrderConfig.json'

// Layer category types
export type LayerCategory = 'BaseMap' | 'TOC' | 'MyMaps' | 'Tools' | 'Graphics' | 'Popup'

// Managed layer interface
export interface ManagedLayer {
  id: string
  name: string
  category: LayerCategory
  layer: Layer
  zIndex: number
  visible: boolean
  opacity: number
  metadata?: Record<string, unknown>
  addedAt: Date
}

// Layer manager state
interface LayerManagerState {
  // All managed layers organized by category
  layers: Record<LayerCategory, ManagedLayer[]>
  
  // Next available z-index for each category
  nextZIndex: Record<LayerCategory, number>
  
  // Actions
  addLayer: (
    layer: Layer, 
    category: LayerCategory, 
    name: string, 
    options?: {
      index?: number
      id?: string
      metadata?: Record<string, unknown>
    }
  ) => string
  
  removeLayer: (layerId: string) => boolean
  
  moveLayer: (layerId: string, newCategory: LayerCategory, newIndex?: number) => boolean
  
  updateLayerVisibility: (layerId: string, visible: boolean) => boolean
  
  updateLayerOpacity: (layerId: string, opacity: number) => boolean
  
  getLayer: (layerId: string) => ManagedLayer | null
  
  getLayersByCategory: (category: LayerCategory) => ManagedLayer[]
  
  getAllLayers: () => ManagedLayer[]
  
  reorderCategory: (category: LayerCategory) => void
  
  getNextZIndex: (category: LayerCategory, index?: number) => number
  
  // Debug helpers
  logLayerOrder: () => void
  
  // Cleanup
  clearCategory: (category: LayerCategory) => void
  clearAllLayers: () => void
}

// Helper function to generate unique layer ID
function generateLayerId(category: LayerCategory, name: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${category}_${name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}_${random}`
}

// Calculate z-index for a layer based on category and position
function calculateZIndex(category: LayerCategory, index: number): number {
  const categoryConfig = LayerOrderConfig.categories[category]
  if (!categoryConfig) {
    console.warn(`Unknown layer category: ${category}`)
    return 0
  }
  
  const zIndex = categoryConfig.zIndexRange.min + index
  
  // Ensure we don't exceed the max z-index for this category
  if (zIndex > categoryConfig.zIndexRange.max) {
    console.warn(`Z-index ${zIndex} exceeds maximum for category ${category} (${categoryConfig.zIndexRange.max})`)
    return categoryConfig.zIndexRange.max
  }
  
  return zIndex
}

export const useLayerManagerStore = create<LayerManagerState>()(
  immer((set, get) => ({
    // Initial state
    layers: {
      BaseMap: [],
      TOC: [],
      MyMaps: [],
      Tools: [],
      Graphics: [],
      Popup: []
    },
    
    nextZIndex: {
      BaseMap: LayerOrderConfig.categories.BaseMap.zIndexRange.min,
      TOC: LayerOrderConfig.categories.TOC.zIndexRange.min,
      MyMaps: LayerOrderConfig.categories.MyMaps.zIndexRange.min,
      Tools: LayerOrderConfig.categories.Tools.zIndexRange.min,
      Graphics: LayerOrderConfig.categories.Graphics.zIndexRange.min,
      Popup: LayerOrderConfig.categories.Popup.zIndexRange.min
    },
    
    // Add a layer to the specified category
    addLayer: (layer, category, name, options = {}) => {
      const state = get()
      const categoryLayers = state.layers[category]
      
      // Generate unique ID
      const id = options.id || generateLayerId(category, name)
      
      // Determine insertion index
      const insertIndex = options.index !== undefined 
        ? Math.min(options.index, categoryLayers.length)
        : categoryLayers.length
      
      // Calculate z-index
      const zIndex = calculateZIndex(category, insertIndex)
      
      // Create managed layer object
      const managedLayer: ManagedLayer = {
        id,
        name,
        category,
        layer,
        zIndex,
        visible: layer.getVisible(),
        opacity: layer.getOpacity(),
        metadata: options.metadata || {},
        addedAt: new Date()
      }
      
      // Set the z-index on the actual OpenLayers layer
      layer.setZIndex(zIndex)
      
      set((draft) => {
        // Insert layer at the specified index
        draft.layers[category].splice(insertIndex, 0, managedLayer)
        
        // Reorder all layers in this category to ensure proper z-indexing
        draft.layers[category].forEach((layer, idx) => {
          const newZIndex = calculateZIndex(category, idx)
          layer.zIndex = newZIndex
          layer.layer.setZIndex(newZIndex)
        })
        
        // Update next available z-index
        draft.nextZIndex[category] = calculateZIndex(category, draft.layers[category].length)
      })
      
      console.log(`🔧 Added layer "${name}" to category "${category}" with z-index ${zIndex}`)
      
      return id
    },
    
    // Remove a layer by ID
    removeLayer: (layerId) => {
      let found = false
      
      set((draft) => {
        // Find and remove the layer from its category
        Object.keys(draft.layers).forEach((category) => {
          const categoryKey = category as LayerCategory
          const index = draft.layers[categoryKey].findIndex(l => l.id === layerId)
          if (index !== -1) {
            draft.layers[categoryKey].splice(index, 1)
            found = true
            
            // Reorder remaining layers in this category
            draft.layers[categoryKey].forEach((layer, idx) => {
              const newZIndex = calculateZIndex(categoryKey, idx)
              layer.zIndex = newZIndex
              layer.layer.setZIndex(newZIndex)
            })
            
            // Update next available z-index
            draft.nextZIndex[categoryKey] = calculateZIndex(categoryKey, draft.layers[categoryKey].length)
          }
        })
      })
      
      if (found) {
        console.log(`🗑️ Removed layer ${layerId}`)
      }
      
      return found
    },
    
    // Move a layer to a different category or position
    moveLayer: (layerId, newCategory, newIndex) => {
      const state = get()
      let sourceCategory: LayerCategory | null = null
      let managedLayer: ManagedLayer | null = null
      
      // Find the layer
      Object.keys(state.layers).forEach((category) => {
        const categoryKey = category as LayerCategory
        const layer = state.layers[categoryKey].find(l => l.id === layerId)
        if (layer) {
          sourceCategory = categoryKey
          managedLayer = layer
        }
      })
      
      if (!managedLayer || !sourceCategory) {
        return false
      }
      
      set((draft) => {
        // Remove from source category
        const sourceIndex = draft.layers[sourceCategory!].findIndex(l => l.id === layerId)
        draft.layers[sourceCategory!].splice(sourceIndex, 1)
        
        // Update category
        managedLayer!.category = newCategory
        
        // Insert into new category
        const insertIndex = newIndex !== undefined 
          ? Math.min(newIndex, draft.layers[newCategory].length)
          : draft.layers[newCategory].length
        
        draft.layers[newCategory].splice(insertIndex, 0, managedLayer!)
        
        // Reorder both categories
        draft.layers[sourceCategory!].forEach((layer, idx) => {
          const newZIndex = calculateZIndex(sourceCategory!, idx)
          layer.zIndex = newZIndex
          layer.layer.setZIndex(newZIndex)
        })
        
        draft.layers[newCategory].forEach((layer, idx) => {
          const newZIndex = calculateZIndex(newCategory, idx)
          layer.zIndex = newZIndex
          layer.layer.setZIndex(newZIndex)
        })
        
        // Update next available z-index for both categories
        draft.nextZIndex[sourceCategory!] = calculateZIndex(sourceCategory!, draft.layers[sourceCategory!].length)
        draft.nextZIndex[newCategory] = calculateZIndex(newCategory, draft.layers[newCategory].length)
      })
      
      console.log(`📦 Moved layer ${layerId} from ${sourceCategory} to ${newCategory}`)
      return true
    },
    
    // Update layer visibility
    updateLayerVisibility: (layerId, visible) => {
      const state = get()
      const layer = state.getLayer(layerId)
      if (!layer) return false
      
      // Update the OpenLayers layer directly (outside of Immer)
      if (layer.layer) {
        layer.layer.setVisible(visible)
      }
      
      set((draft) => {
        // Find and update the layer in the appropriate category
        Object.keys(draft.layers).forEach((category) => {
          const categoryKey = category as LayerCategory
          const layerIndex = draft.layers[categoryKey].findIndex(l => l.id === layerId)
          if (layerIndex !== -1) {
            draft.layers[categoryKey][layerIndex].visible = visible
          }
        })
      })
      
      return true
    },
    
    // Update layer opacity
    updateLayerOpacity: (layerId, opacity) => {
      const state = get()
      const layer = state.getLayer(layerId)
      if (!layer) return false
      
      // Update the OpenLayers layer directly (outside of Immer)
      if (layer.layer) {
        layer.layer.setOpacity(opacity)
      }
      
      set((draft) => {
        // Find and update the layer in the appropriate category
        Object.keys(draft.layers).forEach((category) => {
          const categoryKey = category as LayerCategory
          const layerIndex = draft.layers[categoryKey].findIndex(l => l.id === layerId)
          if (layerIndex !== -1) {
            draft.layers[categoryKey][layerIndex].opacity = opacity
          }
        })
      })
      
      return true
    },
    
    // Get a specific layer by ID
    getLayer: (layerId) => {
      const state = get()
      for (const category of Object.keys(state.layers) as LayerCategory[]) {
        const layer = state.layers[category].find(l => l.id === layerId)
        if (layer) return layer
      }
      return null
    },
    
    // Get all layers in a specific category
    getLayersByCategory: (category) => {
      return get().layers[category]
    },
    
    // Get all layers across all categories
    getAllLayers: () => {
      const state = get()
      const allLayers: ManagedLayer[] = []
      Object.values(state.layers).forEach(categoryLayers => {
        allLayers.push(...categoryLayers)
      })
      return allLayers.sort((a, b) => a.zIndex - b.zIndex)
    },
    
    // Reorder all layers in a category
    reorderCategory: (category) => {
      set((draft) => {
        draft.layers[category].forEach((layer, idx) => {
          const newZIndex = calculateZIndex(category, idx)
          layer.zIndex = newZIndex
          layer.layer.setZIndex(newZIndex)
        })
        
        draft.nextZIndex[category] = calculateZIndex(category, draft.layers[category].length)
      })
    },
    
    // Get the next z-index for a category
    getNextZIndex: (category, index) => {
      const state = get()
      const categoryLayers = state.layers[category]
      const insertIndex = index !== undefined ? index : categoryLayers.length
      return calculateZIndex(category, insertIndex)
    },
    
    // Debug helper to log current layer order
    logLayerOrder: () => {
      const state = get()
      console.group('🗺️ Layer Order')
      
      Object.keys(state.layers).forEach((category) => {
        const categoryKey = category as LayerCategory
        const layers = state.layers[categoryKey]
        
        if (layers.length > 0) {
          console.group(`📁 ${category} (${layers.length} layers)`)
          layers.forEach((layer, index) => {
            console.log(`  ${index + 1}. ${layer.name} (z-index: ${layer.zIndex}, visible: ${layer.visible})`)
          })
          console.groupEnd()
        }
      })
      
      console.groupEnd()
    },
    
    // Clear all layers in a category
    clearCategory: (category) => {
      set((draft) => {
        draft.layers[category] = []
        draft.nextZIndex[category] = LayerOrderConfig.categories[category].zIndexRange.min
      })
      console.log(`🧹 Cleared all layers from category: ${category}`)
    },
    
    // Clear all layers
    clearAllLayers: () => {
      set((draft) => {
        Object.keys(draft.layers).forEach((category) => {
          const categoryKey = category as LayerCategory
          draft.layers[categoryKey] = []
          draft.nextZIndex[categoryKey] = LayerOrderConfig.categories[categoryKey].zIndexRange.min
        })
      })
      console.log('🧹 Cleared all layers from all categories')
    }
  }))
) 