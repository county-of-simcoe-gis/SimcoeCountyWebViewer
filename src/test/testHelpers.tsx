import React from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";

/**
 * Test helpers for Zustand stores
 * These help test stores properly by calling the actions through the hook
 */

export const renderHook = <T,>(callback: () => T) => {
  let result: T;
  let error: Error | null = null;

  const TestComponent = () => {
    try {
      result = callback();
    } catch (e) {
      error = e as Error;
    }
    return null;
  };

  render(<TestComponent />);

  return {
    result: result!,
    error,
    rerender: (newCallback: () => T) => {
      const RerenderedComponent = () => {
        try {
          result = newCallback();
        } catch (e) {
          error = e as Error;
        }
        return null;
      };
      render(<RerenderedComponent />);
    },
  };
};

/**
 * Helper to act on store state changes
 * This properly calls actions through the store hook (not getState)
 */
export const actOnStore = <T,>(storeHook: () => T, action: (store: T) => void) => {
  const TestComponent = () => {
    const store = storeHook();
    React.useEffect(() => {
      action(store);
    }, [store]);
    return null;
  };

  render(<TestComponent />);
};

/**
 * Mock a Zustand store for testing
 */
export const createMockStore = <T extends Record<string, unknown>>(initialState: Partial<T> = {}) => {
  const mockStore = { ...initialState };

  return {
    ...mockStore,
    setState: vi.fn((updater) => {
      if (typeof updater === "function") {
        Object.assign(mockStore, updater(mockStore));
      } else {
        Object.assign(mockStore, updater);
      }
    }),
    getState: vi.fn(() => ({ ...mockStore })),
    subscribe: vi.fn(() => vi.fn()),
    destroy: vi.fn(),
  };
};

/**
 * Wait for next tick - useful for async operations
 */
export const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Mock implementations for common browser APIs
 */
export const mockBrowserAPIs = () => {
  global.fetch = vi.fn();
  global.URL = global.URL || URL;

  Object.defineProperty(window, "location", {
    value: {
      href: "http://localhost:3000",
      search: "",
      pathname: "/",
      hostname: "localhost",
      port: "3000",
      protocol: "http:",
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    },
    writable: true,
  });
};

/**
 * Setup common test mocks
 */
export const setupTestMocks = () => {
  mockBrowserAPIs();

  // Mock console methods
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});

  return {
    restoreConsole: () => {
      vi.restoreAllMocks();
    },
  };
};
