import { create } from 'zustand'

// Event types that were previously handled by window.emitter
type EventType = 
  | 'mapLoaded'
  | 'sidebarLoaded' 
  | 'headerLoaded'
  | 'tocLoaded'
  | 'sidebarChanged'
  | 'activateSidebarItem'
  | 'setSidebarVisiblity'
  | 'activateTab'
  | 'loadReport'
  | 'openLegend'
  | 'openMoreMenu'
  | 'takeScreenshot'
  | 'clearIdentify'
  | 'mapParametersComplete'
  | 'addMyMapsFeature'
  | 'changeCursor'
  | 'attributeTableResize'
  | 'extentHistoryChanged'
  | 'mapControlsChanged'
  | 'searchComplete'
  | 'showPropertyReport'
  | 'closeToolsOrThemes'
  | string // Allow custom event types

interface EventData {
  [key: string]: unknown
}

interface EventListener {
  id: string
  eventType: EventType
  callback: (data?: EventData) => void
}

interface EventState {
  listeners: EventListener[]
  
  // Actions
  addListener: (eventType: EventType, callback: (data?: EventData) => void) => string
  removeListener: (listenerId: string) => void
  removeAllListeners: (eventType?: EventType) => void
  emit: (eventType: EventType, data?: EventData) => void
  
  // Common event emitters (replace window.emitter.emit calls)
  emitMapLoaded: () => void
  emitSidebarLoaded: () => void
  emitHeaderLoaded: () => void
  emitTocLoaded: () => void
  emitSidebarChanged: (isOpen: boolean) => void
  emitActivateSidebarItem: (itemName: string, itemType: 'tools' | 'themes', data?: unknown) => void
  emitSetSidebarVisibility: (visibility: 'OPEN' | 'CLOSE') => void
  emitActivateTab: (tabName: string) => void
  emitOpenLegend: () => void
  emitOpenMoreMenu: () => void
  emitTakeScreenshot: () => void
  emitClearIdentify: () => void
  emitAddMyMapsFeature: (feature: unknown, label: string) => void
  emitChangeCursor: (cursorStyle: string) => void
  emitAttributeTableResize: (height: number) => void
  emitMapControlsChanged: (control: string, visible: boolean) => void
  emitShowPropertyReport: (coordinates: number[]) => void
  emitCloseToolsOrThemes: (type: string) => void
}

let listenerIdCounter = 0

export const useEventStore = create<EventState>((set, get) => ({
  listeners: [],
  
  // Core event system
  addListener: (eventType, callback) => {
    const id = `listener_${++listenerIdCounter}`
    const listener: EventListener = { id, eventType, callback }
    
    set(state => ({
      listeners: [...state.listeners, listener]
    }))
    
    return id
  },
  
  removeListener: (listenerId) => {
    set(state => ({
      listeners: state.listeners.filter(listener => listener.id !== listenerId)
    }))
  },
  
  removeAllListeners: (eventType) => {
    set(state => ({
      listeners: eventType 
        ? state.listeners.filter(listener => listener.eventType !== eventType)
        : []
    }))
  },
  
  emit: (eventType, data) => {
    const { listeners } = get()
    const matchingListeners = listeners.filter(listener => listener.eventType === eventType)
    
    // Execute all listeners for this event type
    matchingListeners.forEach(listener => {
      try {
        listener.callback(data)
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error)
      }
    })
  },
  
  // Common event emitters
  emitMapLoaded: () => get().emit('mapLoaded'),
  emitSidebarLoaded: () => get().emit('sidebarLoaded'),
  emitHeaderLoaded: () => get().emit('headerLoaded'),
  emitTocLoaded: () => get().emit('tocLoaded'),
  
  emitSidebarChanged: (isOpen) => get().emit('sidebarChanged', { isOpen }),
  
  emitActivateSidebarItem: (itemName, itemType, data) => 
    get().emit('activateSidebarItem', { itemName, itemType, data }),
    
  emitSetSidebarVisibility: (visibility) => 
    get().emit('setSidebarVisiblity', { visibility }),
    
  emitActivateTab: (tabName) => get().emit('activateTab', { tabName }),
  
  emitOpenLegend: () => get().emit('openLegend'),
  emitOpenMoreMenu: () => get().emit('openMoreMenu'),
  emitTakeScreenshot: () => get().emit('takeScreenshot'),
  emitClearIdentify: () => get().emit('clearIdentify'),
  
  emitAddMyMapsFeature: (feature, label) => 
    get().emit('addMyMapsFeature', { feature, label }),
    
  emitChangeCursor: (cursorStyle) => 
    get().emit('changeCursor', { cursorStyle }),
    
  emitAttributeTableResize: (height) => 
    get().emit('attributeTableResize', { height }),
    
  emitMapControlsChanged: (control, visible) => 
    get().emit('mapControlsChanged', { control, visible }),
    
  emitShowPropertyReport: (coordinates) => 
    get().emit('showPropertyReport', { coordinates }),
    
  emitCloseToolsOrThemes: (type) => 
    get().emit('closeToolsOrThemes', { type }),
})) 