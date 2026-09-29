/**
 * Test utilities for MyMaps components
 * Provides common mocks and utilities for testing MyMaps functionality
 */

import { vi } from 'vitest'
import type { MyMapsItem, DrawType, GeometryType } from '@/types/myMaps'

/**
 * Mock OpenLayers Feature
 */
export const createMockOLFeature = (overrides: Partial<any> = {}) => {
  const defaultFeature = {
    getId: vi.fn(() => 'mock-feature-id'),
    get: vi.fn((prop: string) => {
      const props: Record<string, any> = {
        id: 'mock-feature-id',
        label: 'Mock Feature',
        drawType: 'Point',
        labelVisible: true,
        labelRotation: 0,
        ...overrides.properties,
      }
      return props[prop]
    }),
    set: vi.fn(),
    getProperties: vi.fn(() => ({ 
      id: 'mock-feature-id', 
      label: 'Mock Feature',
      ...overrides.properties 
    })),
    setProperties: vi.fn(),
    getGeometry: vi.fn(() => ({
      getType: vi.fn(() => 'Point'),
      getCoordinates: vi.fn(() => [0, 0]),
      getExtent: vi.fn(() => [0, 0, 1, 1]),
      ...overrides.geometry,
    })),
    setGeometry: vi.fn(),
    getStyle: vi.fn(() => overrides.style || null),
    setStyle: vi.fn(),
    clone: vi.fn(() => createMockOLFeature(overrides)),
    ...overrides,
  }
  
  return defaultFeature
}

/**
 * Mock OpenLayers Map
 */
export const createMockOLMap = (overrides: Partial<any> = {}) => {
  return {
    getView: vi.fn(() => ({
      getCenter: vi.fn(() => [0, 0]),
      getZoom: vi.fn(() => 10),
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      fit: vi.fn(),
      animate: vi.fn(),
      ...overrides.view,
    })),
    getLayers: vi.fn(() => ({
      getArray: vi.fn(() => []),
      push: vi.fn(),
      remove: vi.fn(),
      ...overrides.layers,
    })),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    addInteraction: vi.fn(),
    removeInteraction: vi.fn(),
    getPixelFromCoordinate: vi.fn(() => [100, 100]),
    getCoordinateFromPixel: vi.fn(() => [0, 0]),
    getSize: vi.fn(() => [1024, 768]),
    getTarget: vi.fn(() => 'map-container'),
    setTarget: vi.fn(),
    render: vi.fn(),
    renderSync: vi.fn(),
    on: vi.fn(),
    un: vi.fn(),
    once: vi.fn(),
    ...overrides,
  }
}

/**
 * Mock OpenLayers Vector Layer
 */
export const createMockOLVectorLayer = (overrides: Partial<any> = {}) => {
  return {
    getSource: vi.fn(() => createMockOLVectorSource(overrides.source)),
    setSource: vi.fn(),
    getStyle: vi.fn(),
    setStyle: vi.fn(),
    setOpacity: vi.fn(),
    getOpacity: vi.fn(() => 1),
    setVisible: vi.fn(),
    getVisible: vi.fn(() => true),
    setZIndex: vi.fn(),
    getZIndex: vi.fn(() => 0),
    on: vi.fn(),
    un: vi.fn(),
    once: vi.fn(),
    ...overrides,
  }
}

/**
 * Mock OpenLayers Vector Source
 */
export const createMockOLVectorSource = (overrides: Partial<any> = {}) => {
  const mockFeatures: any[] = overrides.features || []
  
  return {
    getFeatures: vi.fn(() => mockFeatures),
    addFeature: vi.fn((feature: any) => mockFeatures.push(feature)),
    addFeatures: vi.fn((features: any[]) => mockFeatures.push(...features)),
    removeFeature: vi.fn((feature: any) => {
      const index = mockFeatures.indexOf(feature)
      if (index > -1) mockFeatures.splice(index, 1)
    }),
    clear: vi.fn(() => mockFeatures.length = 0),
    getFeatureById: vi.fn((id: string) => mockFeatures.find(f => f.getId() === id)),
    forEachFeature: vi.fn((callback: (feature: any) => void) => mockFeatures.forEach(callback)),
    on: vi.fn(),
    un: vi.fn(),
    once: vi.fn(),
    changed: vi.fn(),
    ...overrides,
  }
}

/**
 * Create mock MyMaps item for testing
 */
export const createMockMyMapsItem = (overrides: Partial<MyMapsItem> = {}): MyMapsItem => {
  return {
    id: 'mock-item-id',
    label: 'Mock Item',
    labelVisible: true,
    labelRotation: 0,
    drawType: 'Point',
    geometryType: 'Point',
    visible: true,
    featureGeoJSON: JSON.stringify({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [0, 0],
      },
      properties: {},
    }),
    style: { fill: { color: '#e809e5' } },
    ...overrides,
  }
}

/**
 * Create multiple mock MyMaps items
 */
export const createMockMyMapsItems = (count: number = 3): MyMapsItem[] => {
  const geometryTypes: GeometryType[] = ['Point', 'LineString', 'Polygon']
  const drawTypes: DrawType[] = ['Point', 'LineString', 'Polygon']
  
  return Array.from({ length: count }, (_, index) => {
    const geometryType = geometryTypes[index % geometryTypes.length]
    const drawType = drawTypes[index % drawTypes.length]
    
    return createMockMyMapsItem({
      id: `mock-item-${index}`,
      label: `Mock Item ${index}`,
      drawType,
      geometryType,
      featureGeoJSON: JSON.stringify({
        type: 'Feature',
        geometry: {
          type: geometryType,
          coordinates: geometryType === 'Point' 
            ? [index, index] 
            : geometryType === 'LineString'
            ? [[index, index], [index + 1, index + 1]]
            : [[[index, index], [index + 1, index], [index + 1, index + 1], [index, index + 1], [index, index]]],
        },
        properties: {},
      }),
    })
  })
}

/**
 * Mock MyMapsDrawingManager for testing
 */
export const createMockDrawingManager = (overrides: Partial<any> = {}) => {
  return {
    getVectorLayer: vi.fn(() => createMockOLVectorLayer()),
    getVectorSource: vi.fn(() => createMockOLVectorSource()),
    startDrawing: vi.fn(),
    stopDrawing: vi.fn(),
    clearDrawing: vi.fn(),
    startEditing: vi.fn(),
    stopEditing: vi.fn(),
    clearEditing: vi.fn(),
    loadFeatures: vi.fn(),
    highlightFeature: vi.fn(),
    unhighlightFeature: vi.fn(),
    updateFeatureLabel: vi.fn(),
    setFeatureLabel: vi.fn(),
    updateFeatureLabelRotation: vi.fn(),
    updateFeatureStyle: vi.fn(),
    cleanup: vi.fn(),
    ...overrides,
  }
}

/**
 * Mock event object for testing
 */
export const createMockEvent = (overrides: Partial<any> = {}) => {
  return {
    type: 'click',
    target: document.createElement('div'),
    currentTarget: document.createElement('div'),
    clientX: 100,
    clientY: 200,
    pageX: 100,
    pageY: 200,
    screenX: 100,
    screenY: 200,
    button: 0,
    buttons: 1,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn(),
    ...overrides,
  }
}

/**
 * Mock DOM element with common methods
 */
export const createMockElement = (tagName: string = 'div', overrides: Partial<any> = {}) => {
  const element = document.createElement(tagName)
  
  // Add common mock methods
  Object.assign(element, {
    getBoundingClientRect: vi.fn(() => ({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      ...overrides.boundingRect,
    })),
    scrollIntoView: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
    click: vi.fn(),
    ...overrides,
  })
  
  return element
}

/**
 * Mock store state for MyMaps
 */
export const createMockMyMapsStore = (overrides: Partial<any> = {}) => {
  return {
    drawType: 'Cancel' as DrawType,
    drawColor: '#e809e5',
    drawStyle: null,
    isEditing: false,
    editMode: null,
    items: [],
    toolTipId: 'tooltip-id',
    toolTipClass: 'tooltip-class',
    importText: '',
    setDrawType: vi.fn(),
    setDrawColor: vi.fn(),
    setDrawStyle: vi.fn(),
    setEditMode: vi.fn(),
    setImportText: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    updateItemLabel: vi.fn(),
    toggleItemVisibility: vi.fn(),
    clearAllItems: vi.fn(),
    hasItems: vi.fn(() => false),
    loadFromStorage: vi.fn(),
    saveToStorage: vi.fn(),
    importItems: vi.fn(() => true),
    getNextDrawingNumber: vi.fn(() => 1),
    saveToApi: vi.fn(() => Promise.resolve({ success: true, id: 'test-id' })),
    importFromApi: vi.fn(() => Promise.resolve({ success: true, data: { id: 'test-id', json: '{}' } })),
    exportToFile: vi.fn(() => ({ success: true, count: 1 })),
    toggleAllVisibility: vi.fn(),
    deleteSelected: vi.fn(),
    showByType: vi.fn(),
    zoomToSelected: vi.fn(),
    mergePolygons: vi.fn(() => ({ success: true })),
    ...overrides,
  }
}

/**
 * Mock event store for testing
 */
export const createMockEventStore = (overrides: Partial<any> = {}) => {
  return {
    emit: vi.fn(),
    ...overrides,
  }
}

/**
 * Mock map store for testing
 */
export const createMockMapStore = (overrides: Partial<any> = {}) => {
  return {
    map: createMockOLMap(),
    ...overrides,
  }
}

/**
 * Mock layer manager store for testing
 */
export const createMockLayerManagerStore = (overrides: Partial<any> = {}) => {
  return {
    addLayer: vi.fn(() => 'mock-layer-id'),
    removeLayer: vi.fn(),
    updateLayer: vi.fn(),
    getLayer: vi.fn(),
    ...overrides,
  }
}

/**
 * Utility to wait for async operations in tests
 */
export const waitForAsync = (ms: number = 0) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Mock window methods commonly used in MyMaps
 */
export const mockWindowMethods = () => {
  const mockAlert = vi.fn()
  const mockConfirm = vi.fn(() => true)
  const mockPrompt = vi.fn(() => 'test-input')
  
  Object.defineProperties(window, {
    alert: { value: mockAlert, writable: true },
    confirm: { value: mockConfirm, writable: true },
    prompt: { value: mockPrompt, writable: true },
    innerWidth: { value: 1024, writable: true },
    innerHeight: { value: 768, writable: true },
  })
  
  return { mockAlert, mockConfirm, mockPrompt }
}

/**
 * Mock URL methods for file operations
 */
export const mockURLMethods = () => {
  const mockCreateObjectURL = vi.fn(() => 'mock-object-url')
  const mockRevokeObjectURL = vi.fn()
  
  Object.defineProperties(window.URL, {
    createObjectURL: { value: mockCreateObjectURL, writable: true },
    revokeObjectURL: { value: mockRevokeObjectURL, writable: true },
  })
  
  return { mockCreateObjectURL, mockRevokeObjectURL }
}

/**
 * Mock document methods for element creation
 */
export const mockDocumentMethods = () => {
  const originalCreateElement = document.createElement
  const mockCreateElement = vi.fn((tagName: string) => {
    if (tagName === 'a') {
      return createMockElement('a', {
        href: '',
        download: '',
        click: vi.fn(),
      })
    }
    return originalCreateElement.call(document, tagName)
  })
  
  document.createElement = mockCreateElement
  
  return { mockCreateElement }
}

/**
 * Setup common mocks for MyMaps testing
 */
export const setupMyMapsTestMocks = () => {
  const windowMocks = mockWindowMethods()
  const urlMocks = mockURLMethods()
  const documentMocks = mockDocumentMethods()
  
  return {
    ...windowMocks,
    ...urlMocks,
    ...documentMocks,
  }
}

/**
 * Cleanup test mocks
 */
export const cleanupMyMapsTestMocks = () => {
  vi.restoreAllMocks()
}

/**
 * Common test assertions for MyMaps components
 */
export const MyMapsAssertions = {
  /**
   * Assert that a MyMaps item has the correct structure
   */
  assertMyMapsItem: (item: MyMapsItem) => {
    expect(item).toHaveProperty('id')
    expect(item).toHaveProperty('label')
    expect(item).toHaveProperty('drawType')
    expect(item).toHaveProperty('geometryType')
    expect(item).toHaveProperty('visible')
    expect(item).toHaveProperty('featureGeoJSON')
    expect(typeof item.id).toBe('string')
    expect(typeof item.label).toBe('string')
    expect(typeof item.visible).toBe('boolean')
    
    // Validate GeoJSON
    expect(() => JSON.parse(item.featureGeoJSON)).not.toThrow()
  },

  /**
   * Assert that a component has proper accessibility attributes
   */
  assertAccessibility: (element: HTMLElement) => {
    // Check for ARIA attributes or other accessibility features
    if (element.hasAttribute('role')) {
      expect(element.getAttribute('role')).toBeTruthy()
    }
    if (element.hasAttribute('tabindex')) {
      const tabindex = element.getAttribute('tabindex')
      expect(tabindex).toMatch(/^-?\d+$/) // Should be a number
    }
  },

  /**
   * Assert that event callbacks are called correctly
   */
  assertEventCallback: (mockFn: any, expectedCalls: number = 1) => {
    expect(mockFn).toHaveBeenCalledTimes(expectedCalls)
    if (expectedCalls > 0) {
      expect(mockFn).toHaveBeenCalledWith(expect.anything())
    }
  },
}
