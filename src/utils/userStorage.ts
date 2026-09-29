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
const EXCLUDED_KEY_PATTERNS = ["scwv.", "__Secure-", "__Host-", "next-auth", "login.microsoftonline.com", "login.windows.net", "msal.", "cacheVersion", "nextauth.message"];

function isExcluded(key: string): boolean {
  return EXCLUDED_KEY_PATTERNS.some((pattern) => key.includes(pattern));
}

// --- Module-level state ---

/** Set to `true` once we confirm the user has the saveToServer role. */
let _enabled = false;

/**
 * Set to `true` once the initial server->localStorage restore has finished
 * (or once we've determined no restore is needed). Until this is true we must
 * NOT POST localStorage to the server, otherwise a sparse boot-time payload
 * would clobber the richer data already stored on the server.
 */
let _restoreComplete = false;

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
  if (!enabled) {
    // No server sync for this session — nothing to restore, so writes are safe.
    _restoreComplete = true;
    if (_readyResolve) {
      // Not applicable — resolve immediately so callers don't hang.
      _readyResolve();
      _readyResolve = undefined;
    }
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

    // The server may return the blob as a JSON string — parse it once.
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        // not valid JSON — ignore
      }
    }

    // It may STILL be a string if double-encoded — parse again.
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
    // The initial restore is now complete — writes back to the server are safe.
    _restoreComplete = true;
    _readyResolve?.();
    _readyResolve = undefined;
  }
}

/** Build the JSON payload representing current syncable localStorage contents. */
function buildSyncPayload(): string {
  const dataKeys = Object.keys(localStorage).filter((key) => !isExcluded(key));
  const data: Record<string, string> = {};
  dataKeys.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  });
  return JSON.stringify(data);
}

/** Whether a beforeunload listener has been attached. */
let _unloadListenerAttached = false;

/** Attach a beforeunload handler that flushes any pending sync using sendBeacon. */
function ensureUnloadListener(): void {
  if (_unloadListenerAttached || typeof window === "undefined") return;
  _unloadListenerAttached = true;

  window.addEventListener("beforeunload", () => {
    // Never flush before the initial restore completed — would clobber server data.
    if (!_enabled || !_restoreComplete || !_debounceTimer) return;
    // Cancel the pending debounce — we'll send immediately via sendBeacon.
    clearTimeout(_debounceTimer);
    _debounceTimer = null;

    const url = apiUrl("/api/secure/user/storage");
    const payload = buildSyncPayload();
    // sendBeacon guarantees delivery even during page unload.
    navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
  });
}

/**
 * Push the current localStorage contents to the server.
 * Debounced — rapid successive calls collapse into a single request.
 */
export function setUserStorage(): void {
  if (!_enabled) return;

  ensureUnloadListener();

  if (_debounceTimer) clearTimeout(_debounceTimer);

  _debounceTimer = setTimeout(async () => {
    _debounceTimer = null;

    // Wait for the initial server->localStorage restore before pushing back, so
    // we never overwrite richer server data with a sparse boot-time payload.
    await userStorageReady;
    if (!_restoreComplete) return;

    const url = apiUrl("/api/secure/user/storage");
    fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: buildSyncPayload(),
    }).catch((err) => {
      console.error("[UserStorage] Error saving user storage:", err);
    });
  }, 2000);
}

/**
 * Immediately flush any pending debounced sync to the server.
 * Use this after explicit clear/reset operations to guarantee persistence.
 */
export function flushUserStorage(): void {
  if (!_enabled || !_restoreComplete) return;

  // Cancel any pending debounce.
  if (_debounceTimer) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }

  const url = apiUrl("/api/secure/user/storage");
  fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: buildSyncPayload(),
  }).catch((err) => {
    console.error("[UserStorage] Error flushing user storage:", err);
  });
}

/**
 * Clear the server-side stored values (sends an empty body).
 */
export async function clearUserStorage(): Promise<void> {
  if (!_enabled) return;

  // Cancel any pending debounce that would re-save stale data.
  if (_debounceTimer) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }

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
