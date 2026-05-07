/**
 * Client-side user storage sync.
 *
 * When the authenticated user has the "saveToServer" role, every localStorage
 * write is automatically synced to the server so it can be restored on any
 * device or after clearing the browser cache.
 *
 * Mirrors the behaviour of the old React app's helpers/storage.js.
 */

import { apiUrl } from "@/lib/axiosInstance";

// Keys (or key substrings) that must NEVER be synced to the server.
const EXCLUDED_KEY_PATTERNS = [
  "scwv.",
  "__Secure-",
  "__Host-",
  "next-auth",
  "login.microsoftonline.com",
  "login.windows.net",
  "msal.",
  "cacheVersion",
];

function isExcluded(key: string): boolean {
  return EXCLUDED_KEY_PATTERNS.some((pattern) => key.includes(pattern));
}

// --- Module-level state ---

/** Set to `true` once we confirm the user has the saveToServer role. */
let _enabled = false;

/** Debounce timer for `setUserStorage`. */
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Resolves once `getUserStorage` has finished (or immediately if not applicable). */
let _readyResolve: (() => void) | undefined;
export const userStorageReady: Promise<void> = new Promise((resolve) => {
  _readyResolve = resolve;
});

/**
 * Call once during app boot to enable server sync for this session.
 * If `enabled` is false the module stays inert — every public function is a no-op.
 */
export function enableUserStorage(enabled: boolean): void {
  _enabled = enabled;
  if (!enabled && _readyResolve) {
    // Not applicable — resolve immediately so callers don't hang.
    _readyResolve();
    _readyResolve = undefined;
  }
}

// --- Public API ---

/**
 * Fetch stored localStorage values from the server and merge them into the
 * browser's localStorage.  Call this once at startup, BEFORE stores hydrate.
 */
export async function getUserStorage(): Promise<void> {
  if (!_enabled) {
    _readyResolve?.();
    _readyResolve = undefined;
    return;
  }

  try {
    const url = apiUrl("/api/secure/user/storage");
    const res = await fetch(url, { credentials: "same-origin" });

    if (!res.ok) {
      console.warn("[UserStorage] Failed to fetch user storage:", res.status);
      return;
    }

    let data = await res.json();

    // The server may return the blob as a JSON string — parse it once more.
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        // not valid JSON — ignore
      }
    }

    if (data && typeof data === "object") {
      Object.keys(data)
        .filter((key) => !isExcluded(key))
        .forEach((key) => {
          localStorage.setItem(key, data[key]);
        });
    }
  } catch (error) {
    console.error("[UserStorage] Error fetching user storage:", error);
  } finally {
    _readyResolve?.();
    _readyResolve = undefined;
  }
}

/**
 * Push the current localStorage contents to the server.
 * Debounced — rapid successive calls collapse into a single request.
 */
export function setUserStorage(): void {
  if (!_enabled) return;

  if (_debounceTimer) clearTimeout(_debounceTimer);

  _debounceTimer = setTimeout(() => {
    _debounceTimer = null;

    const dataKeys = Object.keys(localStorage).filter((key) => !isExcluded(key));
    const data: Record<string, string> = {};
    dataKeys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    });

    const url = apiUrl("/api/secure/user/storage");
    fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch((err) => {
      console.error("[UserStorage] Error saving user storage:", err);
    });
  }, 2000);
}

/**
 * Clear the server-side stored values (sends an empty body).
 */
export async function clearUserStorage(): Promise<void> {
  if (!_enabled) return;

  try {
    const url = apiUrl("/api/secure/user/storage");
    await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "",
    });
  } catch (err) {
    console.error("[UserStorage] Error clearing user storage:", err);
  }
}
