import { useEffect } from 'react'
import { useEventStore } from '@/stores/eventStore'

interface EventData {
  [key: string]: unknown
}

type EventType = 
  | 'mapLoaded'
  | 'sidebarLoaded' 
  | 'headerLoaded'
  | 'tocLoaded'
  | 'sidebarChanged'
  | 'activateSidebarItem'
  | 'setSidebarVisiblity'
  | 'activateTab'
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
  | string

/**
 * Custom hook to listen for events from the event store
 * Replaces window.emitter.addListener pattern
 * 
 * @param eventType - The event type to listen for
 * @param callback - Function to call when event is emitted
 * @param deps - Optional dependency array (like useEffect)
 */
export function useEventListener(
  eventType: EventType,
  callback: (data?: EventData) => void,
  deps: React.DependencyList = []
) {
  const { addListener, removeListener } = useEventStore()

  useEffect(() => {
    const listenerId = addListener(eventType, callback)
    
    return () => {
      removeListener(listenerId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, addListener, removeListener, ...deps])
}

/**
 * Hook to get event emitters
 * Provides easy access to all the emit functions
 */
export function useEventEmitters() {
  return useEventStore((state) => ({
    emitMapLoaded: state.emitMapLoaded,
    emitSidebarLoaded: state.emitSidebarLoaded,
    emitHeaderLoaded: state.emitHeaderLoaded,
    emitTocLoaded: state.emitTocLoaded,
    emitSidebarChanged: state.emitSidebarChanged,
    emitActivateSidebarItem: state.emitActivateSidebarItem,
    emitSetSidebarVisibility: state.emitSetSidebarVisibility,
    emitActivateTab: state.emitActivateTab,
    emitOpenLegend: state.emitOpenLegend,
    emitOpenMoreMenu: state.emitOpenMoreMenu,
    emitTakeScreenshot: state.emitTakeScreenshot,
    emitClearIdentify: state.emitClearIdentify,
    emitAddMyMapsFeature: state.emitAddMyMapsFeature,
    emitChangeCursor: state.emitChangeCursor,
    emitAttributeTableResize: state.emitAttributeTableResize,
    emitMapControlsChanged: state.emitMapControlsChanged,
    emitShowPropertyReport: state.emitShowPropertyReport,
    emitCloseToolsOrThemes: state.emitCloseToolsOrThemes,
    // Also expose the generic emit function
    emit: state.emit,
  }))
} 