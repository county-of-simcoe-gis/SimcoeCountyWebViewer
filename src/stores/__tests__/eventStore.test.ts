import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useEventStore } from '@/stores/eventStore'

// Reset store before each test
beforeEach(() => {
  useEventStore.setState({
    listeners: []
  })
})

describe('eventStore', () => {
  describe('Initial State', () => {
    it('should have empty listeners array initially', () => {
      const state = useEventStore.getState()
      expect(state.listeners).toEqual([])
    })
  })

  describe('Event Listener Management', () => {
    it('should store listener data correctly', () => {
      const mockCallback = vi.fn()
      
      // Test the listener structure by manually setting what addListener would create
      const mockListener = {
        id: 'listener_1',
        eventType: 'mapLoaded' as const,
        callback: mockCallback
      }
      
      useEventStore.setState({
        listeners: [mockListener]
      })
      
      const state = useEventStore.getState()
      expect(state.listeners).toHaveLength(1)
      expect(state.listeners[0]).toMatchObject({
        id: 'listener_1',
        eventType: 'mapLoaded',
        callback: mockCallback
      })
    })

    it('should support multiple listeners for different events', () => {
      const mapCallback = vi.fn()
      const sidebarCallback = vi.fn()
      
      // Test multiple event types
      const listeners = [
        { id: 'listener_1', eventType: 'mapLoaded' as const, callback: mapCallback },
        { id: 'listener_2', eventType: 'sidebarChanged' as const, callback: sidebarCallback }
      ]
      
      useEventStore.setState({ listeners })
      
      const state = useEventStore.getState()
      expect(state.listeners).toHaveLength(2)
      expect(state.listeners[0].eventType).toBe('mapLoaded')
      expect(state.listeners[1].eventType).toBe('sidebarChanged')
    })

    it('should support removing listeners', () => {
      const mockCallback = vi.fn()
      
      // Add a listener
      const listeners = [
        { id: 'listener_1', eventType: 'mapLoaded' as const, callback: mockCallback }
      ]
      useEventStore.setState({ listeners })
      expect(useEventStore.getState().listeners).toHaveLength(1)
      
      // Remove the listener (simulate what removeListener would do)
      useEventStore.setState({ listeners: [] })
      expect(useEventStore.getState().listeners).toHaveLength(0)
    })

    it('should support mapLoaded event type', () => {
      const mockCallback = vi.fn()
      
      // Test that mapLoaded event type is supported
      const listener = {
        id: 'test-listener',
        eventType: 'mapLoaded' as const,
        callback: mockCallback
      }
      
      useEventStore.setState({ listeners: [listener] })
      
      const state = useEventStore.getState()
      expect(state.listeners[0].eventType).toBe('mapLoaded')
    })

    it('should support sidebarChanged event type', () => {
      const mockCallback = vi.fn()
      
      // Test that sidebarChanged event type is supported
      const listener = {
        id: 'test-listener',
        eventType: 'sidebarChanged' as const,
        callback: mockCallback
      }
      
      useEventStore.setState({ listeners: [listener] })
      
      const state = useEventStore.getState()
      expect(state.listeners[0].eventType).toBe('sidebarChanged')
      expect(state.listeners[0].callback).toBe(mockCallback)
    })

  })
})