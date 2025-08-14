# Testing Guide for Simcoe County Web Viewer

## Overview

Your app now has a complete modern testing infrastructure with Vitest, React Testing Library, and MSW.

## Testing Zustand Stores

### Correct Pattern:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/stores/appStore";

describe("appStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState(
      {
        mapLoading: true,
        config: null,
        // ... other initial state
      },
      true
    ); // true = replace entire state
  });

  it("should update state correctly", () => {
    // ✅ Correct: Access actions through store instance
    const { setMapLoading, isAnyLoading } = useAppStore.getState();

    setMapLoading(false);

    const state = useAppStore.getState();
    expect(state.mapLoading).toBe(false);
  });
});
```

### Key Points:

1. Use `useAppStore.getState()` to get both state AND actions
2. Always reset state in `beforeEach`
3. Actions and computed functions are available in the returned object
4. Test state changes by calling actions then checking `getState()`

## Testing React Components

### Example Pattern:

```typescript
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import MyComponent from "@/components/MyComponent";

// Mock the store hook
vi.mock("@/stores/appStore", () => ({
  useAppStore: vi.fn(() => ({
    mapLoading: false,
    setMapLoading: vi.fn(),
  })),
}));

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });
});
```

## Testing Utilities & Hooks

### Example:

```typescript
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useConfig } from "@/hooks/useConfig";

describe("useConfig", () => {
  it("should return config data", () => {
    const { result } = renderHook(() => useConfig());

    expect(result.current.config).toBeDefined();
  });
});
```

## What's Ready to Use

### 1. Test Infrastructure ✅

- `vitest.config.ts` - Configured and working
- `src/test/setup.ts` - Test setup with mocks
- `src/test/testServer.ts` - MSW server with API mocks

### 2. Available Commands

```bash
npm test          # Run all tests
npm run test:watch # Watch mode
npm run test:ui   # UI mode
```

### 3. Mock Configuration

Your test server includes mocks for:

- Config API endpoints
- Search API endpoints
- Browser APIs (localStorage, fetch, etc.)

## Next Steps

1. **Fix existing store tests** using the correct Zustand pattern above
2. **Create component tests** for your React components
3. **Add hook tests** for custom hooks
4. **Test utility functions**

## Example Working Store Test

Here's a complete working example for your appStore:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/stores/appStore";

describe("appStore", () => {
  beforeEach(() => {
    useAppStore.setState(
      {
        mapLoading: true,
        sidebarLoading: true,
        headerLoading: true,
        configLoading: true,
        config: null,
        configError: null,
        appInfo: { name: "Test App", version: "1.0.0", homepage: "" },
      },
      true
    );
  });

  it("should compute isAnyLoading correctly", () => {
    const store = useAppStore.getState();

    // Initially true
    expect(store.isAnyLoading()).toBe(true);

    // Set all to false
    store.setMapLoading(false);
    store.setSidebarLoading(false);
    store.setHeaderLoading(false);
    store.setConfigLoading(false);

    // Should now be false
    expect(useAppStore.getState().isAnyLoading()).toBe(false);
  });
});
```

## Your Testing Setup is Complete! 🎉

You now have a professional-grade testing infrastructure that can handle your large, complex application. The key is using the correct Zustand testing patterns shown above.
