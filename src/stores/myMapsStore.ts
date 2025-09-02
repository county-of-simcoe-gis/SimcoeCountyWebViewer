import { create } from 'zustand'
import { Style } from 'ol/style'
import type { Feature } from 'ol'
import type { Geometry } from 'ol/geom'
import { styleToJSON } from '@/utils/myMapsHelpers'

// OpenLayers style JSON representation
export interface StyleJSON {
  fill?: {
    color: string | number[]
  }
  stroke?: {
    color: string | number[]
    width?: number
    lineDash?: number[]
  }
  image?: {
    type: 'circle' | 'icon' | 'regularShape'
    radius?: number
    fill?: { color: string | number[] }
    stroke?: { color: string | number[]; width?: number; lineDash?: number[] }
    src?: string
    scale?: number
    // RegularShape specific properties
    points?: number
    radius2?: number
    angle?: number
    rotation?: number
  }
  text?: {
    text: string
    font?: string
    fill?: { color: string | number[] }
    stroke?: { color: string | number[]; width?: number }
    offsetX?: number
    offsetY?: number
    rotation?: number
  }
}

// Types for MyMaps functionality
export type DrawType = 
  | 'Cancel' 
  | 'Point' 
  | 'LineString' 
  | 'Polygon' 
  | 'Circle' 
  | 'Rectangle' 
  | 'Arrow' 
  | 'Text' 
  | 'Bearing' 
  | 'Measure' 
  | 'Eraser'
  | 'Buffer'

export type GeometryType = 
  | 'Point' 
  | 'LineString' 
  | 'Polygon'
  | 'MultiPoint'
  | 'MultiLineString'
  | 'MultiPolygon' 
  | 'Circle'

export type EditMode = 'vertices' | 'translate' | null

export interface MyMapsItem {
  id: string
  label: string
  labelVisible: boolean
  labelRotation: number
  labelStyle?: Style | null
  featureGeoJSON: string // Serialized GeoJSON
  style: Style | StyleJSON // OpenLayers style object (new approach) or JSON representation (legacy)
  visible: boolean
  drawType: DrawType
  geometryType: GeometryType
  isParcel?: boolean // For property features
  pointType?: string // For point styling
  strokeType?: string // For line styling
  fillAlpha?: number // For style opacity slider persistence
  strokeAlpha?: number // For outline opacity slider persistence
  hasChanged?: boolean // For tracking modifications
}

export interface MyMapsConfig {
  showBearingButton: boolean
  showMeasureButton: boolean
  nonPointCursorSize: number
}

export interface MyMapsState {
  // Drawing state
  drawType: DrawType
  drawColor: string
  drawOpacity: number
  drawStyle: Style | null
  
  // Items management
  items: MyMapsItem[]
  drawingCounter: number  // Counter for auto-naming drawings
  
  // Edit state
  isEditing: boolean
  editMode: EditMode
  
  // UI state
  toolTipClass: string
  toolTipId: string
  showAdvanced: boolean
  
  // Import/Export
  importText: string
  lastSavedId: string | null
  
  // Configuration
  config: MyMapsConfig
  
  // Actions - Drawing
  setDrawType: (drawType: DrawType) => void
  setDrawColor: (color: string) => void
  setDrawOpacity: (opacity: number) => void
  setDrawStyle: (style: Style | null) => void
  
  // Actions - Items
  addItem: (item: MyMapsItem) => void
  removeItem: (id: string) => void
  updateItem: (id: string, updates: Partial<MyMapsItem>) => void
  toggleItemVisibility: (id: string) => void
  updateItemLabel: (id: string, label: string) => void
  updateItemLabelVisibility: (id: string, visible: boolean) => void
  updateItemLabelRotation: (id: string, rotation: number) => void
  updateItemStyle: (id: string, style: StyleJSON, pointType?: string, strokeType?: string) => void
  clearAllItems: () => void
  
  // Actions - Counter
  getNextDrawingNumber: () => number
  resetDrawingCounter: () => void
  
  // Actions - Bulk operations
  toggleAllVisibility: (visible: boolean) => void
  deleteSelected: (selected: boolean) => void
  showByType: (geometryType: GeometryType | 'all') => void
  zoomToSelected: () => void
  
  // Actions - Edit mode
  setEditMode: (isEditing: boolean, mode?: EditMode) => void
  
  // Actions - Import/Export
  setImportText: (text: string) => void
  exportItems: () => string
  importItems: (jsonData: string) => boolean
  saveToStorage: () => void
  loadFromStorage: () => void
  
  // Actions - UI
  setToolTipClass: (className: string) => void
  toggleAdvanced: () => void
  
  // Getters
  getVisibleItems: () => MyMapsItem[]
  getItemById: (id: string) => MyMapsItem | undefined
  getItemsByType: (geometryType: GeometryType) => MyMapsItem[]
  hasItems: () => boolean
  hasVisibleItems: () => boolean
}

// Default configuration
const DEFAULT_CONFIG: MyMapsConfig = {
  showBearingButton: true,
  showMeasureButton: false,
  nonPointCursorSize: 1
}

// Storage key for persistence
const STORAGE_KEY = 'simcoe-mymaps-data'

// Generate unique ID
const generateId = (): string => {
  return 'mymaps_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

export const useMyMapsStore = create<MyMapsState>((set, get) => ({
  // Initial state
  drawType: 'Cancel',
  drawColor: '#e809e5',
  drawOpacity: 0.8,
  drawStyle: null,
  items: [],
  drawingCounter: 1,
  isEditing: false,
  editMode: null,
  toolTipClass: 'sc-hidden',
  toolTipId: generateId(),
  showAdvanced: false,
  importText: '',
  lastSavedId: null,
  config: DEFAULT_CONFIG,

  // Drawing actions
  setDrawType: (drawType) => set({ drawType }),
  
  setDrawColor: (color) => {
    set({ drawColor: color })
    // Auto-save when color changes
    setTimeout(() => get().saveToStorage(), 100)
  },
  
  setDrawOpacity: (opacity) => set({ drawOpacity: opacity }),
  
  setDrawStyle: (style) => set({ drawStyle: style }),

  // Items actions
  addItem: (item) => {
    set((state) => ({
      items: [item, ...state.items], // Add to beginning like original
      drawType: 'Cancel' // Reset draw type after adding
    }))
    get().saveToStorage()
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter(item => item.id !== id)
    }))
    get().saveToStorage()
  },

  updateItem: (id, updates) => {
    set((state) => ({
      items: state.items.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    }))
    get().saveToStorage()
  },

  toggleItemVisibility: (id) => {
    const item = get().getItemById(id)
    if (item) {
      get().updateItem(id, { visible: !item.visible })
    }
  },

  updateItemLabel: (id, label) => {
    get().updateItem(id, { label })
  },

  updateItemLabelVisibility: (id, visible) => {
    get().updateItem(id, { labelVisible: visible })
  },

  updateItemLabelRotation: (id, rotation) => {
    get().updateItem(id, { labelRotation: rotation })
  },

  updateItemStyle: (id, style, pointType, strokeType) => {
    const updates: Partial<MyMapsItem> = { style }
    if (pointType !== undefined) updates.pointType = pointType
    if (strokeType !== undefined) updates.strokeType = strokeType
    get().updateItem(id, updates)
  },

  clearAllItems: () => {
    set({ items: [], drawingCounter: 1 })
    get().saveToStorage()
  },
  
  // Counter actions
  getNextDrawingNumber: () => {
    const current = get().drawingCounter
    set({ drawingCounter: current + 1 })
    return current
  },

  resetDrawingCounter: () => {
    set({ drawingCounter: 1 })
  },

  // Bulk operations
  toggleAllVisibility: (visible) => {
    set((state) => ({
      items: state.items.map(item => ({ ...item, visible }))
    }))
    get().saveToStorage()
  },

  deleteSelected: (selected) => {
    const state = get()
    const itemsToDelete = state.items.filter(item => 
      selected ? item.visible : !item.visible
    )
    
    // Delete items with delay like original
    itemsToDelete.forEach((item, index) => {
      setTimeout(() => {
        get().removeItem(item.id)
      }, index * 200)
    })
  },

  showByType: (geometryType) => {
    if (geometryType === 'all') {
      get().toggleAllVisibility(true)
    } else {
      set((state) => ({
        items: state.items.map(item => ({
          ...item,
          visible: item.geometryType === geometryType
        }))
      }))
      get().saveToStorage()
    }
  },

  zoomToSelected: () => {
    // This will be implemented when we integrate with map
    console.log('Zoom to selected items')
  },

  // Edit mode
  setEditMode: (isEditing, mode = 'vertices') => {
    set({ isEditing, editMode: isEditing ? mode : null })
  },

  // Import/Export
  setImportText: (text) => set({ importText: text }),

  exportItems: () => {
    const state = get()
    return JSON.stringify({
      items: state.items,
      drawColor: state.drawColor,
      drawOpacity: state.drawOpacity,
      config: state.config
    })
  },

  importItems: (jsonData) => {
    try {
      const data = JSON.parse(jsonData)
      if (data.items && Array.isArray(data.items)) {
        // Merge with existing items, avoiding duplicates
        set((state) => {
          const existingIds = new Set(state.items.map(item => item.id))
          const newItems = data.items.filter((item: MyMapsItem) => 
            !existingIds.has(item.id)
          )
          return {
            items: [...newItems, ...state.items],
            drawColor: data.drawColor || state.drawColor,
            drawOpacity: data.drawOpacity || state.drawOpacity
          }
        })
        get().saveToStorage()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to import MyMaps data:', error)
      return false
    }
  },

  saveToStorage: () => {
    try {
      const state = get()
      
      // Convert OpenLayers Style objects to JSON for proper serialization
      const serializedItems = state.items.map(item => {
        if (item.style instanceof Style) {
          // Convert OpenLayers Style to JSON
          return {
            ...item,
            style: styleToJSON(item.style)
          }
        }
        // If style is already JSON or null, keep as-is
        return item
      })
      
      const dataToSave = {
        items: serializedItems,
        drawColor: state.drawColor,
        drawOpacity: state.drawOpacity,
        drawingCounter: state.drawingCounter,
        config: state.config
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
      console.log('💾 MyMaps saved to storage:', { itemCount: serializedItems.length })
    } catch (error) {
      console.error('Failed to save MyMaps to storage:', error)
    }
  },

  loadFromStorage: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        
        // Calculate the next counter based on existing drawings if not saved
        let drawingCounter = data.drawingCounter || 1
        if (!data.drawingCounter && data.items) {
          const existingNumbers = data.items
            .filter((item: MyMapsItem) => item.label.startsWith("Drawing "))
            .map((item: MyMapsItem) => {
              const match = item.label.match(/Drawing (\d+)/)
              return match ? parseInt(match[1], 10) : 0
            })
            .filter((num: number) => num > 0)
          
          if (existingNumbers.length > 0) {
            drawingCounter = Math.max(...existingNumbers) + 1
          }
        }
        
        set({
          items: data.items || [],
          drawColor: data.drawColor || '#e809e5',
          drawOpacity: data.drawOpacity || 0.8,
          drawingCounter,
          config: { ...DEFAULT_CONFIG, ...data.config }
        })
        
        console.log('📥 MyMaps loaded from storage:', { 
          itemCount: data.items?.length || 0,
          items: data.items?.map((item: MyMapsItem) => ({
            id: item.id,
            label: item.label,
            visible: item.visible,
            hasStyle: !!item.style,
            styleType: item.style instanceof Style ? 'OpenLayers Style' : 'StyleJSON'
          })) || []
        })
      }
    } catch (error) {
      console.error('Failed to load MyMaps from storage:', error)
    }
  },

  // UI actions
  setToolTipClass: (className) => set({ toolTipClass: className }),
  
  toggleAdvanced: () => set((state) => ({ showAdvanced: !state.showAdvanced })),

  // Getters
  getVisibleItems: () => get().items.filter(item => item.visible),
  
  getItemById: (id) => get().items.find(item => item.id === id),
  
  getItemsByType: (geometryType) => 
    get().items.filter(item => item.geometryType === geometryType),
  
  hasItems: () => get().items.length > 0,
  
  hasVisibleItems: () => get().items.some(item => item.visible)
}))

// Helper function to create a new MyMaps item
export const createMyMapsItem = (
  feature: Feature<Geometry>,
  drawType: DrawType,
  label?: string,
  style?: StyleJSON
): MyMapsItem => {
  const geometry = feature.getGeometry()
  if (!geometry) {
    throw new Error('Feature must have geometry')
  }

  const geometryType = geometry.getType() as GeometryType
  const id = generateId()

  // Default labels based on draw type
  let defaultLabel = label
  if (!defaultLabel) {
    switch (drawType) {
      case 'Bearing':
        defaultLabel = 'Bearing Line'
        break
      case 'Measure':
        defaultLabel = 'Measure'
        break
      case 'Text':
        defaultLabel = 'Enter Custom Text'
        break
      default:
        // This should not be used anymore as labels are generated in the component
        defaultLabel = `Drawing ${Date.now()}`
    }
  }

  // Set label rotation to the actual bearing value for the slider
  let labelRotation = 0
  if (drawType === 'Bearing' || drawType === 'Measure') {
    const bearing = feature.get('bearing')
    if (typeof bearing === 'number') {
      // Store the raw bearing value for the rotation slider
      labelRotation = bearing
    }
  }

  return {
    id,
    label: defaultLabel,
    labelVisible: drawType === 'Text' || drawType === 'Bearing' || drawType === 'Measure',
    labelRotation,
    labelStyle: null,
    featureGeoJSON: '', // Will be set by calling code
    style: style || {} as StyleJSON,
    visible: true,
    drawType,
    geometryType,
    isParcel: false,
    hasChanged: false
  }
}
