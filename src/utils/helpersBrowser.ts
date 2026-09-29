/**
 * Browser and DOM utilities
 */

/**
 * Check if the current view is mobile
 */
export function isMobile(): boolean {
  return window.innerWidth < 770;
}

/**
 * Add glow effect to an element
 */
export function glowContainer(id: string, color = 'blue'): void {
  const elem = document.getElementById(id);
  if (!elem) return;
  
  const className = `glow-container-${color}`;
  elem.classList.add(className);
  setTimeout(() => {
    elem.classList.remove(className);
  }, 1000);
}

/**
 * Download data as file
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
} 