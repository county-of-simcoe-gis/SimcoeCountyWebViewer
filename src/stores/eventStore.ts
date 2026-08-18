import { create } from 'zustand'

/**
 * Lightweight command-bus for fire-and-forget messages between loosely-coupled
 * components (primarily MyMaps drawing/styling commands).
 *
 * For state that can be modelled reactively, prefer dedicated zustand stores
 * (sidebarStore, tocStore, myMapsStore, mapStore, etc.) over emitting events.
 */

interface EventData {
  [key: string]: unknown
}

interface EventListener {
  id: string
  eventType: string
  callback: (data?: EventData) => void
}

interface EventState {
  listeners: EventListener[]

  addListener: (eventType: string, callback: (data?: EventData) => void) => string
  removeListener: (listenerId: string) => void
  removeAllListeners: (eventType?: string) => void
  emit: (eventType: string, data?: EventData) => void
}

let listenerIdCounter = 0

export const useEventStore = create<EventState>((set, get) => ({
  listeners: [],

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

    matchingListeners.forEach(listener => {
      try {
        listener.callback(data)
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error)
      }
    })
  },
})) 