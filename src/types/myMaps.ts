// Shared types for MyMaps functionality
import type { Vector as VectorSource } from 'ol/source'
import type { Vector as VectorLayer } from 'ol/layer'
import type Draw from 'ol/interaction/Draw'
import type { Modify, Translate } from 'ol/interaction'
import type { StyleJSON } from '@/stores/myMapsStore'

// Re-export store types for convenience
export type {
  DrawType,
  GeometryType,
  EditMode,
  MyMapsItem,
  MyMapsConfig
} from '@/stores/myMapsStore'

// Re-export StyleJSON for direct usage
export type { StyleJSON }

// Drawing tool configuration
export interface DrawingTool {
  id: string
  name: string
  drawType: string
  title: string
  imageName: string
  disabled?: boolean
  visible?: boolean
}

// Color configuration for drawing
export interface ColorOption {
  color: string
  label: string
}

// OpenLayers integration types
export interface MyMapsLayerConfig {
  layerName: string
  zIndex: number
  disableParcelClick: boolean
}

// Drawing interaction types
export interface DrawingInteractions {
  draw: Draw | null
  modify: Modify | null
  translate: Translate | null
  vectorSource: VectorSource
  vectorLayer: VectorLayer<VectorSource>
}

// Feature styling options
export interface FeatureStyleOptions {
  drawColor?: string
  strokeWidth?: number
  fillOpacity?: number
  strokeOpacity?: number
  pointRadius?: number
  pointType?: string
  strokeType?: string
  isText?: boolean
  geometryType?: string
}

// Popup component props interfaces
export interface MyMapsPopupProps {
  item: import('@/stores/myMapsStore').MyMapsItem
  activeTool?: string
  onLabelChange: (id: string, label: string) => void
  onLabelVisibilityChange: (id: string, visible: boolean) => void
  onLabelRotationChange: (id: string, rotation: number) => void
  onDeleteButtonClick: (id: string) => void
  onStyleUpdate: (id: string, style: StyleJSON, pointType?: string, strokeType?: string) => void
  extensions?: MyMapsExtension[]
}

// Import/Export data structure
export interface MyMapsExportData {
  id: string
  json: string
  created: string
}

export interface MyMapsImportResult {
  success: boolean
  error?: string
  itemsImported?: number
}

// Buffer tool configuration
export interface BufferOptions {
  distance: number
  units: 'meters' | 'kilometers' | 'feet' | 'miles'
  color: string
  opacity: number
}

// Measurement result
export interface MeasureResult {
  length?: string
  area?: string
  bearing?: string
}

// Extension system types
export interface MyMapsExtension {
  type: 'popup' | 'menu-item' | 'advanced'
  order: number
  component: React.ComponentType<Record<string, unknown>>
  action?: (params: Record<string, unknown>) => void
}

// Event types for MyMaps
export type MyMapsEventType = 
  | 'feature-added'
  | 'feature-deleted' 
  | 'feature-modified'
  | 'feature-styled'
  | 'items-imported'
  | 'items-exported'
  | 'edit-mode-changed'

export interface MyMapsEvent {
  type: MyMapsEventType
  payload: Record<string, unknown>
  timestamp: number
}

// Validation types
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Constants
export const MYMAPS_CONSTANTS = {
  LAYER_NAME: 'local:myMaps',
  STORAGE_KEY: 'myMaps',
  DEFAULT_COLORS: [
    '#000000', // Black
    '#e90808', // Red
    '#3174ba', // Blue
    '#55F31E', // Green
    '#636363', // Dark Gray
    '#8aedbd', // Mint
    '#974400', // Brown
    '#fcff1b', // Yellow
    '#ffb016', // Orange
    '#e809e5', // Pink
    '#6aad2f', // Olive Green
    '#08d1e9', // Cyan
    '#FFFFFF', // White
    '#aaaaaa', // Light Gray
    '#BE00C1'  // Purple
  ],
  DEFAULT_STYLE: {
    pointRadius: 8,
    strokeWidth: 2,
    fillOpacity: 0.3,
    strokeOpacity: 0.8
  },
  TOOLTIP_CLASSES: {
    VISIBLE: 'sc-mymaps-tooltip',
    HIDDEN: 'sc-hidden'
  },
  ANIMATION: {
    ITEM_TRANSITION_DURATION: 500,
    BULK_DELETE_DELAY: 200
  }
} as const
