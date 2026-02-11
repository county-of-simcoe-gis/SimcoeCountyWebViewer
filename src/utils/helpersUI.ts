/**
 * UI and user interaction utilities
 */

import { useSidebarStore } from '@/stores/sidebarStore'

/**
 * Tab name to index mapping
 */
const TAB_MAPPING = {
  layers: 0,
  tools: 1,
  mymaps: 2,
  themes: 3,
  reports: 4,
} as const

type TabName = keyof typeof TAB_MAPPING

/**
 * Activate a sidebar tab by name
 * @param tabName - The name of the tab to activate ('layers', 'tools', 'mymaps', 'themes', 'reports')
 */
export function activateTab(tabName: TabName): void {
  console.log(`activateTab called with: ${tabName}`)
  
  const tabIndex = TAB_MAPPING[tabName]
  
  if (tabIndex === undefined) {
    console.error(`Invalid tab name: ${tabName}. Valid options are: ${Object.keys(TAB_MAPPING).join(', ')}`)
    return
  }

  console.log(`Activating tab: ${tabName} (index: ${tabIndex})`)

  try {
    // Get the current store state and actions
    const { openSidebar, setActiveTab, isOpen: currentIsOpen, activeTab: currentActiveTab } = useSidebarStore.getState()

    console.log('Current sidebar state:', {
      isOpen: currentIsOpen,
      activeTab: currentActiveTab
    })

    // Force the sidebar open and set the active tab
    // This mimics exactly what SidebarSlim.tsx does in handleTabClick
    openSidebar()
    setActiveTab(tabIndex)

    // Check the new state
    const { isOpen: newIsOpen, activeTab: newActiveTab } = useSidebarStore.getState()
    console.log('Tab activation completed - new state:', {
      isOpen: newIsOpen,
      activeTab: newActiveTab
    })
    
    // Force a re-render by triggering a small state change (toggle and toggle back)
    if (newActiveTab === tabIndex && newIsOpen) {
      console.log('Tab activation successful!')
    } else {
      console.warn('Tab activation may have failed - state did not change as expected')
    }
  } catch (error) {
    console.error('Error activating tab:', error)
  }
}

/**
 * Alternative approach: Use window timeout to ensure state changes are processed
 * @param tabName - The name of the tab to activate
 */
export function activateTabDelayed(tabName: TabName): void {
  setTimeout(() => activateTab(tabName), 0)
}

/**
 * Show message (placeholder - can be enhanced with UI library)
 */
export function showMessage(
  title: string, 
  message: string, 
  type: 'info' | 'error' | 'warning' | 'success' = 'info', 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  timeout = 2000
): void {
  // For now, just use console and alert
  // TODO: Replace with proper toast/notification system
  console.log(`${type.toUpperCase()}: ${title} - ${message}`);
  if (type === 'error') {
    alert(`${title}: ${message}`);
  }
}

/**
 * Show URL in a full-screen iframe modal overlay.
 * Uses the global urlModalStore so it can be called from anywhere.
 */
export function showURLWindow(
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showFooter = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mode = 'normal',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  honorDontShow = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hideScroll = false,
  title = 'Information'
): void {
  // Lazy-import the store to avoid circular deps in non-React contexts
  const { useURLModalStore } = require('@/stores/urlModalStore');
  useURLModalStore.getState().open(url, title);
}

/**
 * App statistics tracking (placeholder)
 */
export function addAppStat(type: string, description: string): void {
  // For now, just log - can be enhanced with actual analytics
  console.log(`App Stat: ${type} - ${description}`);
} 