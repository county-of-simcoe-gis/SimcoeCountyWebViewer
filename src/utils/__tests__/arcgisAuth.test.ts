import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveTokenToStorage, loadTokenFromStorage, clearTokenFromStorage, STORAGE_KEY, type ArcGISTokenData } from "@/utils/arcgisAuth";

// Mock both storage APIs for testing
Object.defineProperty(global, "localStorage", {
  value: {
    store: {} as Record<string, string>,
    getItem(key: string) {
      return this.store[key] ?? null;
    },
    setItem(key: string, value: string) {
      this.store[key] = value;
    },
    removeItem(key: string) {
      delete this.store[key];
    },
    clear() {
      this.store = {};
    },
  },
  writable: true,
});

Object.defineProperty(global, "sessionStorage", {
  value: {
    store: {} as Record<string, string>,
    getItem(key: string) {
      return this.store[key] ?? null;
    },
    setItem(key: string, value: string) {
      this.store[key] = value;
    },
    removeItem(key: string) {
      delete this.store[key];
    },
    clear() {
      this.store = {};
    },
  },
  writable: true,
});

describe("arcgisAuth token persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  function makeToken(overrides: Partial<ArcGISTokenData> = {}): ArcGISTokenData {
    const now = Date.now();
    return {
      accessToken: "test-token",
      expiresAt: now + 24 * 60 * 60 * 1000,
      renewalDate: now + 12 * 60 * 60 * 1000,
      issueDate: now,
      username: "test-user",
      ssl: true,
      portalUrl: "https://example.com",
      ...overrides,
    };
  }

  it("saveTokenToStorage writes plaintext JSON to localStorage", async () => {
    const token = makeToken();
    await saveTokenToStorage(token);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(token);
  });

  it("loadTokenFromStorage returns the token when it is valid", async () => {
    const token = makeToken();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(token));

    const loaded = await loadTokenFromStorage();
    expect(loaded).toEqual(token);
  });

  it("loadTokenFromStorage returns null and removes the key when expired", async () => {
    const token = makeToken({ expiresAt: Date.now() - 1000 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(token));

    const loaded = await loadTokenFromStorage();
    expect(loaded).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("loadTokenFromStorage returns null and removes the key when accessToken is missing", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ expiresAt: Date.now() + 10000 }));

    const loaded = await loadTokenFromStorage();
    expect(loaded).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("loadTokenFromStorage returns null for malformed JSON", async () => {
    localStorage.setItem(STORAGE_KEY, "not-json");

    const loaded = await loadTokenFromStorage();
    expect(loaded).toBeNull();
  });

  it("clearTokenFromStorage removes the key from localStorage", async () => {
    const token = makeToken();
    await saveTokenToStorage(token);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    clearTokenFromStorage();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("saveTokenToStorage ignores malformed tokens", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await saveTokenToStorage({ accessToken: "", expiresAt: 0 } as ArcGISTokenData);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith("ArcGIS Auth: Refusing to save malformed token");
  });

  it("loadTokenFromStorage cleans up legacy encrypted sessionStorage entry", async () => {
    const token = makeToken();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, iv: "abc", data: "def" }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(token));

    await loadTokenFromStorage();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("does not sync the auth token to server-side user storage", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(() => Promise.resolve(new Response()));
    const { enableUserStorage } = await import("@/utils/userStorage");
    enableUserStorage(true);

    const token = makeToken();
    await saveTokenToStorage(token);

    // Give any pending debounce a chance to fire
    await new Promise((resolve) => setTimeout(resolve, 2500));

    expect(fetchSpy).not.toHaveBeenCalled();

    // Disable again so other tests are not affected
    enableUserStorage(false);
  });
});
