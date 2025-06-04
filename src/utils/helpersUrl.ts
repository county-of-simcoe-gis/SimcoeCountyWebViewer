/**
 * URL manipulation utilities
 */

/**
 * Get URL parameter value
 */
export function getURLParameter(parameterName: string, decoded = true, caseSensitive = false): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (caseSensitive) {
    const value = urlParams.get(parameterName);
    return value && decoded ? decodeURIComponent(value) : value;
  } else {
    // Case insensitive search
    for (const [key, value] of urlParams.entries()) {
      if (key.toLowerCase() === parameterName.toLowerCase()) {
        return decoded ? decodeURIComponent(value) : value;
      }
    }
    return null;
  }
}

/**
 * Remove URL parameter from URL string
 */
export function removeURLParameter(url: string, parameter: string): string {
  const urlParts = url.split('?');
  if (urlParts.length >= 2) {
    const prefix = encodeURIComponent(parameter) + '=';
    const params = urlParts[1].split(/[&;]/g);
    
    for (let i = params.length; i-- > 0;) {
      if (params[i].lastIndexOf(prefix, 0) !== -1) {
        params.splice(i, 1);
      }
    }
    
    return urlParts[0] + (params.length > 0 ? '?' + params.join('&') : '');
  }
  return url;
} 