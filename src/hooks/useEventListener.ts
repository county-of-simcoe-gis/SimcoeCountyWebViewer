import { useEffect } from 'react'
import { useEventStore } from '@/stores/eventStore'

interface EventData {
  [key: string]: unknown
}

/**
 * Custom hook to listen for events from the event store.
 * Used primarily for MyMaps command-style events between loosely-coupled components.
 *
 * For reactive state, prefer subscribing to dedicated zustand stores directly.
 *
 * @param eventType - The event type to listen for
 * @param callback - Function to call when event is emitted
 * @param deps - Optional dependency array (like useEffect)
 */
export function useEventListener(
  eventType: string,
  callback: (data?: EventData) => void,
  deps: React.DependencyList = []
) {
  const addListener = useEventStore((s) => s.addListener)
  const removeListener = useEventStore((s) => s.removeListener)

  useEffect(() => {
    const listenerId = addListener(eventType, callback)
    
    return () => {
      removeListener(listenerId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, addListener, removeListener, ...deps])
} 