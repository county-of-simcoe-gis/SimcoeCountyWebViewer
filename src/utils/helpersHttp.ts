/**
 * HTTP and network utilities
 */

/**
 * HTTP GET request returning text
 */
export async function httpGetText(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('HTTP GET request failed:', error);
    throw error;
  }
}

/**
 * HTTP GET request returning JSON
 */
export async function getJSON<T = unknown>(url: string): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('JSON GET request failed:', error);
    throw error;
  }
}

/**
 * HTTP POST request with JSON data
 */
export async function postJSON<T = unknown>(
  url: string, 
  data: Record<string, unknown> = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('JSON POST request failed:', error);
    throw error;
  }
} 