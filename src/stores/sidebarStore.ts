import { create } from 'zustand'
import type { SidebarComponent } from '@/utils/config'

export interface SidebarItem {
  id: string
  name: string
  type: 'theme' | 'tool'
  component?: string
  config?: Record<string, unknown>
  imageName: string
  description?: string
  helpLink?: string
  enabled: boolean
}

interface SidebarState {
  // Sidebar visibility and state
  isOpen: boolean
  isSlim: boolean
  activeTab: number // Track which tab is active (0=layers, 1=tools, 2=mymaps, 3=themes, 4=reports)
  activeTheme: string | null
  activeTool: string | null
  
  // Available items (loaded from config)
  themes: SidebarItem[]
  tools: SidebarItem[]
  
  // Panel state
  activePanelId: string | null
  panelMinimized: boolean
  
  // Actions
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  setActiveTab: (tabIndex: number) => void
  setSlimMode: (slim: boolean) => void
  setActiveTheme: (themeId: string | null) => void
  setActiveTool: (toolId: string | null) => void
  setThemes: (themes: SidebarItem[]) => void
  setTools: (tools: SidebarItem[]) => void
  setActivePanel: (panelId: string | null) => void
  togglePanelMinimized: () => void
  activateSidebarItem: (itemId: string, itemType: 'themes' | 'tools') => void
  loadFromConfig: (sidebarToolComponents: SidebarComponent[], sidebarThemeComponents: SidebarComponent[]) => void
  
  // Event emitters (integrate with event store when available)
  emitSidebarChanged?: (isOpen: boolean) => void
  setEventEmitter: (emitter: (isOpen: boolean) => void) => void
}

function convertToSidebarItem(component: SidebarComponent, type: 'theme' | 'tool'): SidebarItem {
  return {
    id: component.id.toString(),
    name: component.name,
    type,
    component: component.componentName,
    imageName: component.imageName,
    description: component.description,
    helpLink: component.helpLink,
    enabled: component.enabled !== false && component.disable !== true, // Default to enabled unless explicitly disabled
    config: {}
  }
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  // Initial state
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
  
  // Actions
  toggleSidebar: () => {
    const state = get()
    const newIsOpen = !state.isOpen
    set({ isOpen: newIsOpen })
    
    // Emit sidebar changed event if emitter is available
    if (state.emitSidebarChanged) {
      state.emitSidebarChanged(newIsOpen)
    }
  },
  
  openSidebar: () => set({ isOpen: true }),
  closeSidebar: () => set({ isOpen: false }),
  setActiveTab: (tabIndex) => set({ activeTab: tabIndex }),
  setSlimMode: (slim) => set({ isSlim: slim }),
  setActiveTheme: (themeId) => set({ activeTheme: themeId }),
  setActiveTool: (toolId) => set({ activeTool: toolId }),
  setThemes: (themes) => set({ themes }),
  setTools: (tools) => set({ tools }),
  setActivePanel: (panelId) => set({ activePanelId: panelId }),
  togglePanelMinimized: () => set((state) => ({ panelMinimized: !state.panelMinimized })),
  
  activateSidebarItem: (itemId, itemType) => {
    if (itemType === 'themes') {
      // Deactivate current tool and activate theme
      set({ 
        activeTheme: itemId, 
        activeTool: null,
        activePanelId: itemId
      })
    } else if (itemType === 'tools') {
      // Deactivate current theme and activate tool
      set({ 
        activeTool: itemId, 
        activeTheme: null,
        activePanelId: itemId
      })
    }
  },
  
  loadFromConfig: (sidebarToolComponents, sidebarThemeComponents) => {
    // Convert and filter enabled tools
    const tools = sidebarToolComponents
      .filter(component => component.enabled !== false && component.disable !== true)
      .map(component => convertToSidebarItem(component, 'tool'))
    
    // Convert and filter enabled themes  
    const themes = sidebarThemeComponents
      .filter(component => component.enabled !== false && component.disable !== true)
      .map(component => convertToSidebarItem(component, 'theme'))
    
    set({ tools, themes })
  },
  
  setEventEmitter: (emitter) => set({ emitSidebarChanged: emitter })
})) 