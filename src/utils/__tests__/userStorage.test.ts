import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Tests for the boot-clobber protection and server-restore behavior in
 * userStorage.ts.
 *
 * IMPORTANT: userStorage.ts holds module-level singleton state (`_enabled`,
 * `_restoreComplete`, the `userStorageReady` promise). To test the boot
 * sequence in isolation we reset the module registry and dynamic-import a
 * FRESH copy in every test via `loadModule()`.
 *
 * MSW (configured in src/test/setup.ts) patches global.fetch, so we override it
 * per-test with `vi.stubGlobal("fetch", ...)` AFTER MSW's beforeAll has run.
 */

// Mock apiUrl so it returns a deterministic absolute URL without touching axios.
vi.mock("@/lib/axiosInstance", () => ({
  apiUrl: (path: string) => `http://localhost${path}`,
}));

const STORAGE_URL = "http://localhost/api/secure/user/storage";

type FetchMock = ReturnType<typeof vi.fn>;

let fetchMock: FetchMock;
let beaconMock: ReturnType<typeof vi.fn>;
/** Captured beforeunload handler (intercepted from window.addEventListener). */
let unloadHandler: ((e: Event) => void) | undefined;

async function loadModule() {
  return await import("@/utils/userStorage");
}

function postCalls() {
  return fetchMock.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === "POST");
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();

  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  beaconMock = vi.fn(() => true);
  Object.defineProperty(navigator, "sendBeacon", {
    value: beaconMock,
    configurable: true,
    writable: true,
  });

  // Intercept beforeunload registration so the handler is callable directly and
  // does NOT accumulate on the real window across dynamic-imported modules.
  unloadHandler = undefined;
  vi.spyOn(window, "addEventListener").mockImplementation((event: string, handler: EventListenerOrEventListenerObject) => {
    if (event === "beforeunload") {
      unloadHandler = handler as (e: Event) => void;
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("userStorage - server restore (getUserStorage)", () => {
  it("merges server keys into localStorage and resolves userStorageReady", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Layers: JSON.stringify({ "opengis:all_layers": { layers: {} } }),
        TOC_Type: "LIST",
      }),
    });

    await mod.getUserStorage();

    expect(localStorage.getItem("Layers")).toBe(JSON.stringify({ "opengis:all_layers": { layers: {} } }));
    expect(localStorage.getItem("TOC_Type")).toBe("LIST");
    await expect(mod.userStorageReady).resolves.toBeUndefined();
  });

  it("resolves userStorageReady even when fetch rejects", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true);

    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    await mod.getUserStorage();

    await expect(mod.userStorageReady).resolves.toBeUndefined();
  });

  it("returns early and resolves ready when not enabled", async () => {
    const mod = await loadModule();
    // enableUserStorage NOT called → _enabled stays false.

    await mod.getUserStorage();

    expect(fetchMock).not.toHaveBeenCalled();
    await expect(mod.userStorageReady).resolves.toBeUndefined();
  });

  it("does not write when the server responds non-OK", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true);

    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });

    await mod.getUserStorage();

    expect(localStorage.getItem("Layers")).toBeNull();
    await expect(mod.userStorageReady).resolves.toBeUndefined();
  });

  it("parses a string-encoded server blob", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true);

    // Server returns the blob as a JSON string (single-encoded).
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => JSON.stringify({ Layers: "abc" }),
    });

    await mod.getUserStorage();

    expect(localStorage.getItem("Layers")).toBe("abc");
  });

  it("parses a double-encoded server blob", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true);

    // Server returns a string whose contents are themselves a JSON string.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => JSON.stringify(JSON.stringify({ Layers: "deep" })),
    });

    await mod.getUserStorage();

    expect(localStorage.getItem("Layers")).toBe("deep");
  });

  it("excludes auth/internal keys from restore", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Layers: "keep",
        "next-auth.session-token": "drop",
        "login.microsoftonline.com": "drop",
        "msal.token": "drop",
        "scwv.internal": "drop",
        "__Secure-x": "drop",
      }),
    });

    await mod.getUserStorage();

    expect(localStorage.getItem("Layers")).toBe("keep");
    expect(localStorage.getItem("next-auth.session-token")).toBeNull();
    expect(localStorage.getItem("login.microsoftonline.com")).toBeNull();
    expect(localStorage.getItem("msal.token")).toBeNull();
    expect(localStorage.getItem("scwv.internal")).toBeNull();
    expect(localStorage.getItem("__Secure-x")).toBeNull();
  });

  it("overwrites local values with server values", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true);

    localStorage.setItem("Layers", "local");
    localStorage.setItem("TOC_Type", "FOLDER");

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ Layers: "server", TOC_Type: "LIST" }),
    });

    await mod.getUserStorage();

    expect(localStorage.getItem("Layers")).toBe("server");
    expect(localStorage.getItem("TOC_Type")).toBe("LIST");
  });
});

describe("userStorage - boot-clobber guard (setUserStorage)", () => {
  it("does NOT POST while disabled", async () => {
    vi.useFakeTimers();
    const mod = await loadModule();
    // Not enabled.
    localStorage.setItem("Layers", "x");
    mod.setUserStorage();

    await vi.advanceTimersByTimeAsync(2500);

    expect(postCalls()).toHaveLength(0);
  });

  it("does NOT POST before the initial restore completes", async () => {
    vi.useFakeTimers();
    const mod = await loadModule();
    mod.enableUserStorage(true); // enabled, but restore NOT complete

    localStorage.setItem("Layers", "x");
    mod.setUserStorage();

    // The debounce fires but its callback awaits userStorageReady (never
    // resolved here) and checks _restoreComplete, so no POST is sent.
    await vi.advanceTimersByTimeAsync(2500);

    expect(postCalls()).toHaveLength(0);
  });

  it("POSTs after the restore completes", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await mod.getUserStorage(); // sets _restoreComplete, resolves ready

    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    localStorage.setItem("Layers", "x");
    mod.setUserStorage();

    await vi.advanceTimersByTimeAsync(2500);

    const posts = postCalls();
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0][0]).toBe(STORAGE_URL);
  });

  it("debounces rapid successive calls into a single POST", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await mod.getUserStorage();

    vi.useFakeTimers();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    localStorage.setItem("Layers", "x");
    mod.setUserStorage();
    mod.setUserStorage();
    mod.setUserStorage();

    await vi.advanceTimersByTimeAsync(2500);

    expect(postCalls()).toHaveLength(1);
  });
});

describe("userStorage - flushUserStorage", () => {
  it("does NOT POST before the restore completes", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true); // restore NOT complete

    localStorage.setItem("Layers", "x");
    mod.flushUserStorage();

    expect(postCalls()).toHaveLength(0);
  });

  it("does NOT POST while disabled", async () => {
    const mod = await loadModule();
    localStorage.setItem("Layers", "x");
    mod.flushUserStorage();

    expect(postCalls()).toHaveLength(0);
  });

  it("POSTs immediately after the restore completes", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await mod.getUserStorage();

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    localStorage.setItem("Layers", "x");
    mod.flushUserStorage();

    const posts = postCalls();
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0][0]).toBe(STORAGE_URL);
  });
});

describe("userStorage - beforeunload beacon guard", () => {
  it("does NOT send a beacon before the restore completes", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true); // restore NOT complete

    localStorage.setItem("Layers", "x");
    mod.setUserStorage(); // registers the beforeunload listener + a debounce

    expect(unloadHandler).toBeDefined();
    unloadHandler!(new Event("beforeunload"));

    expect(beaconMock).not.toHaveBeenCalled();
  });

  it("sends a beacon on unload after the restore completes", async () => {
    const mod = await loadModule();
    mod.enableUserStorage(true);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await mod.getUserStorage();

    vi.useFakeTimers();
    localStorage.setItem("Layers", "x");
    mod.setUserStorage(); // creates a pending debounce + registers listener

    expect(unloadHandler).toBeDefined();
    unloadHandler!(new Event("beforeunload"));

    expect(beaconMock).toHaveBeenCalledTimes(1);
    expect(beaconMock.mock.calls[0][0]).toBe(STORAGE_URL);
  });
});
