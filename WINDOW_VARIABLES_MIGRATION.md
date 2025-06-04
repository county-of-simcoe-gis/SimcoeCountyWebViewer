# Window Variables & Event Emitting Migration to Zustand

This document outlines how we've replaced the window variables and event emitting system from the original application with proper Zustand state management.

## Overview

The original application used several global window variables and an EventEmitter for component communication:

```javascript
// OLD APPROACH - Using window variables
window.map = null;
window.sidebarOpen = null;
window.emitter = new EventEmitter();
window.popup = null;
window.disableParcelClick = false;
window.isDrawingOrEditing = false;
window.isCoordinateToolOpen = false;
window.isMeasuring = false;
window.loaded = [];
window.config = {};
window.mapControls = {};
```

This has been replaced with structured Zustand stores that provide better TypeScript support, reactive updates, and cleaner component architecture.

## New Store Structure

### 1. App Store (`src/stores/appStore.ts`)

Handles main application state and configuration:

- `config`: Application configuration
- `configError`: Configuration loading errors
- Loading states for different components
- App metadata (name, version, homepage)

### 2. Sidebar Store (`src/stores/sidebarStore.ts`)

Manages sidebar state and items:

- `isOpen`: Sidebar visibility (replaces `window.sidebarOpen`)
- `themes`, `tools`: Available sidebar items from config
- `activeTheme`, `activeTool`: Currently selected items
- Panel state management

### 3. Map Store (`src/stores/mapStore.ts`)

Handles all map-related state (replaces multiple window variables):

- `map`: OpenLayers map instance (replaces `window.map`)
- `popup`: Popup instance (replaces `window.popup`)
- `disableParcelClick`: Interaction flags (replaces `window.disableParcelClick`)
- `isDrawingOrEditing`: Drawing state (replaces `window.isDrawingOrEditing`)
- `isCoordinateToolOpen`: Tool states (replaces `window.isCoordinateToolOpen`)
- `isMeasuring`: Measurement state (replaces `window.isMeasuring`)
- `loadedItems`: Loading tracking (replaces `window.loaded` array)
- `mapControls`: Map control settings (replaces `window.mapControls`)

### 4. Event Store (`src/stores/eventStore.ts`)

Replaces the EventEmitter system with Zustand-based events:

- Event listener management
- Type-safe event emission
- Common event emitters for typical operations

## Migration Examples

### Before: Using window.loaded Array

```javascript
// OLD WAY
window.loaded = [];
window.loaded.push("map");
if (window.loaded.includes("sidebar")) {
  // Do something
}
```

### After: Using Map Store

```typescript
// NEW WAY
import { useMapStore } from "@/stores/mapStore";

const { addLoadedItem, isItemLoaded } = useMapStore();
addLoadedItem("map");
if (isItemLoaded("sidebar")) {
  // Do something
}
```

### Before: Event Emitting

```javascript
// OLD WAY
window.emitter.emit("sidebarChanged", isOpen);
window.emitter.addListener("mapLoaded", callback);
```

### After: Using Event Store

```typescript
// NEW WAY
import { useEventStore } from "@/stores/eventStore";
import { useEventListener } from "@/hooks/useEventListener";

// Emitting
const { emitSidebarChanged } = useEventStore();
emitSidebarChanged(isOpen);

// Listening
useEventListener("mapLoaded", (data) => {
  // Handle map loaded
});
```

### Before: Map State Management

```javascript
// OLD WAY
window.map = mapInstance;
window.disableParcelClick = true;
window.isDrawingOrEditing = false;
```

### After: Using Map Store

```typescript
// NEW WAY
import { useMapStore } from "@/stores/mapStore";

const { setMap, setDisableParcelClick, setIsDrawingOrEditing } = useMapStore();
setMap(mapInstance);
setDisableParcelClick(true);
setIsDrawingOrEditing(false);
```

## Helper Functions Migration

### Wait for Load Pattern

```typescript
// OLD: helpers.waitForLoad(['map', 'sidebar'], Date.now(), 30, callback)
// NEW: Uses mapStore.areItemsLoaded() internally
import { waitForLoad } from "@/utils/helpers";
waitForLoad(["map", "sidebar"], Date.now(), 30, callback);
```

### Adding Loaded Items

```typescript
// OLD: helpers.addIsLoaded('map')
// NEW: Uses mapStore.addLoadedItem() internally
import { addIsLoaded } from "@/utils/helpers";
addIsLoaded("map");
```

## Component Integration Patterns

### 1. Component Initialization

```typescript
// Mark component as loaded when it mounts
import { useMapStore } from "@/stores/mapStore";
import { useEventStore } from "@/stores/eventStore";

export default function MyComponent() {
  const { addLoadedItem } = useMapStore();
  const { emitSidebarLoaded } = useEventStore();

  useEffect(() => {
    addLoadedItem("mycomponent");
    emitSidebarLoaded();
  }, []);

  // Component JSX...
}
```

### 2. Event Listening

```typescript
// Listen for events in components
import { useEventListener } from "@/hooks/useEventListener";

export default function MyComponent() {
  useEventListener("sidebarChanged", (data) => {
    console.log("Sidebar changed:", data.isOpen);
  });

  useEventListener("activateSidebarItem", (data) => {
    console.log("Activate:", data.itemName, data.itemType);
  });

  // Component JSX...
}
```

### 3. State Updates

```typescript
// Update state in response to user actions
import { useSidebarStore } from "@/stores/sidebarStore";
import { useMapStore } from "@/stores/mapStore";

export default function MyComponent() {
  const { toggleSidebar } = useSidebarStore();
  const { setIsDrawingOrEditing } = useMapStore();

  const handleDrawStart = () => {
    setIsDrawingOrEditing(true);
  };

  // Component JSX...
}
```

## Benefits of the New Approach

### 1. Type Safety

- Full TypeScript support for all state and events
- IntelliSense and auto-completion
- Compile-time error checking

### 2. Reactive Updates

- Components automatically re-render when state changes
- No manual DOM manipulation needed
- Predictable state flow

### 3. Debugging

- Redux DevTools integration with Zustand
- Clear state history and time-travel debugging
- Better error messages and stack traces

### 4. Testing

- Easy to mock stores for unit tests
- Isolated state for each test
- No global state pollution

### 5. Code Organization

- Related state grouped in logical stores
- Clear separation of concerns
- Easier to maintain and extend

## Custom Hooks

### useEventListener Hook

Simplifies event listening with automatic cleanup:

```typescript
import { useEventListener } from "@/hooks/useEventListener";

// Automatically removes listener on unmount
useEventListener("mapLoaded", () => {
  console.log("Map is ready!");
});
```

### useEventEmitters Hook

Provides access to all event emitters:

```typescript
import { useEventEmitters } from "@/hooks/useEventListener";

const { emitMapLoaded, emitSidebarChanged, emitActivateSidebarItem } = useEventEmitters();
```

## Migration Checklist

When migrating components from the old system:

- [ ] Replace `window.sidebarOpen` with `useSidebarStore().isOpen`
- [ ] Replace `window.map` with `useMapStore().map`
- [ ] Replace `window.loaded.push()` with `useMapStore().addLoadedItem()`
- [ ] Replace `window.emitter.emit()` with event store emitters
- [ ] Replace `window.emitter.addListener()` with `useEventListener()`
- [ ] Replace `window.config` access with `useAppStore().config`
- [ ] Update any other window variable usage

## Future Enhancements

The new store system enables several future improvements:

1. **Persistence**: Easy to add localStorage persistence
2. **Undo/Redo**: State history management
3. **Real-time Sync**: WebSocket integration
4. **Performance**: Selective re-renders and memoization
5. **DevTools**: Advanced debugging capabilities

This migration provides a solid foundation for the continued development of the Simcoe County Web Viewer while maintaining compatibility with existing functionality.
