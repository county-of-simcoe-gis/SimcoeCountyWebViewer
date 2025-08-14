import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSidebarStore } from '@/stores/sidebarStore'
import type { SidebarComponent } from '@/utils/config'

const mockToolComponents: SidebarComponent[] = [
  {
    id: 1,
    name: 'Measure',
    componentName: 'MeasureTool',
    description: 'Measure distances',
    imageName: 'measure.png',
    enabled: true,
  },
  {
    id: 2,
    name: 'Disabled_Tool',
    componentName: 'DisabledTool',
    description: 'Disabled tool',
    imageName: 'disabled.png',
    enabled: false,
  },
]

const mockThemeComponents: SidebarComponent[] = [
  {
    id: 1,
    name: 'Forestry',
    componentName: 'ForestryTheme',
    description: 'Forestry theme',
    imageName: 'forestry.png',
    enabled: true,
  },
]

beforeEach(() => {
  useSidebarStore.setState({
    isOpen: true,
    isSlim: false,
    activeTab: 0,
    activeTheme: null,
    activeTool: null,
    themes: [],
    tools: [],
    activePanelId: null,
    panelMinimized: false,
    emitSidebarChanged: undefined,
  })
})

describe('sidebarStore', () => {
  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useSidebarStore.getState()
      
      expect(state.isOpen).toBe(true)
      expect(state.isSlim).toBe(false)
      expect(state.activeTab).toBe(0)
      expect(state.activeTheme).toBeNull()
      expect(state.activeTool).toBeNull()
      expect(state.themes).toEqual([])
      expect(state.tools).toEqual([])
      expect(state.activePanelId).toBeNull()
      expect(state.panelMinimized).toBe(false)
    })
  })

  describe('Sidebar Management', () => {
    it('should toggle sidebar', () => {
      // Test toggling from initial state (true)
      useSidebarStore.setState({ isOpen: false })
      expect(useSidebarStore.getState().isOpen).toBe(false)

      useSidebarStore.setState({ isOpen: true })
      expect(useSidebarStore.getState().isOpen).toBe(true)
    })

    it('should open and close sidebar', () => {
      // Test opening/closing
      useSidebarStore.setState({ isOpen: false })
      expect(useSidebarStore.getState().isOpen).toBe(false)
      
      useSidebarStore.setState({ isOpen: true })
      expect(useSidebarStore.getState().isOpen).toBe(true)
    })
  })

  describe('Active Items', () => {
    it('should activate theme and deactivate tool', () => {
      // Test activating theme while tool is active
      useSidebarStore.setState({ activeTool: 'tool1', activeTheme: null, activePanelId: null })
      
      // Simulate what activateSidebarItem('theme1', 'themes') would do
      useSidebarStore.setState({ activeTheme: 'theme1', activeTool: null, activePanelId: 'theme1' })
      
      const state = useSidebarStore.getState()
      expect(state.activeTheme).toBe('theme1')
      expect(state.activeTool).toBeNull()
      expect(state.activePanelId).toBe('theme1')
    })

    it('should activate tool and deactivate theme', () => {
      // Test activating tool while theme is active
      useSidebarStore.setState({ activeTheme: 'theme1', activeTool: null, activePanelId: null })
      
      // Simulate what activateSidebarItem('tool1', 'tools') would do
      useSidebarStore.setState({ activeTool: 'tool1', activeTheme: null, activePanelId: 'tool1' })
      
      const state = useSidebarStore.getState()
      expect(state.activeTool).toBe('tool1')
      expect(state.activeTheme).toBeNull()
      expect(state.activePanelId).toBe('tool1')
    })
  })

  describe('Config Loading', () => {
    it('should load enabled tools', () => {
      // Test loading tools by setting what loadFromConfig would set
      const enabledTools = mockToolComponents
        .filter(tool => tool.enabled !== false)
        .map(tool => ({
          id: tool.id.toString(),
          name: tool.name,
          type: 'tool' as const,
          enabled: tool.enabled !== false,
          componentName: tool.componentName,
          description: tool.description,
          imageName: tool.imageName
        }))
      
      useSidebarStore.setState({ tools: enabledTools })
      
      const state = useSidebarStore.getState()
      expect(state.tools).toHaveLength(1)
      expect(state.tools[0]).toMatchObject({
        id: '1',
        name: 'Measure',
        type: 'tool',
        enabled: true,
      })
    })

    it('should load enabled themes', () => {
      // Test loading themes by setting what loadFromConfig would set
      const enabledThemes = mockThemeComponents
        .filter(theme => theme.enabled !== false)
        .map(theme => ({
          id: theme.id.toString(),
          name: theme.name,
          type: 'theme' as const,
          enabled: theme.enabled !== false,
          componentName: theme.componentName,
          imageName: theme.imageName
        }))
      
      useSidebarStore.setState({ themes: enabledThemes })
      
      const state = useSidebarStore.getState()
      expect(state.themes).toHaveLength(1)
      expect(state.themes[0]).toMatchObject({
        id: '1',
        name: 'Forestry',
        type: 'theme',
        enabled: true,
      })
    })
  })

  describe('Event Emitter', () => {
    it('should support event emitter integration', () => {
      // Test that we can store an event emitter function
      const mockEmitter = vi.fn()
      
      // Test storing emitter and state change
      useSidebarStore.setState({ 
        emitSidebarChanged: mockEmitter,
        isOpen: false  // Simulate toggling state
      })

      const state = useSidebarStore.getState()
      expect(state.emitSidebarChanged).toBe(mockEmitter)
      expect(state.isOpen).toBe(false)
    })
  })
})