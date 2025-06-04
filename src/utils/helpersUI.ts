/**
 * UI and user interaction utilities
 */

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
 * Show URL window (placeholder - can be enhanced)
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
  hideScroll = false
): void {
  // For now, just open in new window
  // TODO: Replace with proper modal system
  window.open(url, '_blank');
}

/**
 * App statistics tracking (placeholder)
 */
export function addAppStat(type: string, description: string): void {
  // For now, just log - can be enhanced with actual analytics
  console.log(`App Stat: ${type} - ${description}`);
} 