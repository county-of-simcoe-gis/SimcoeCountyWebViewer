# LayerManager System

A comprehensive layer management system for organizing and controlling map layers with proper z-index ordering and categorization.

## Overview

The LayerManager system provides:

- **Categorized Layer Management**: Organize layers into logical categories (BaseMap, TOC, MyMaps, etc.)
- **Automatic Z-Index Management**: Proper layer stacking based on category priorities
- **Centralized Control**: Single interface for all layer operations
- **Type Safety**: Full TypeScript support with proper interfaces

## Layer Categories

Categories are defined in `LayerOrderConfig.json` with priority-based z-index ranges:

| Category     | Z-Index Range | Purpose                                          |
| ------------ | ------------- | ------------------------------------------------ |
| **BaseMap**  | 0-99          | Base map layers (imagery, streets, topographic)  |
| **TOC**      | 100-1999      | Table of Contents layers from GeoServer          |
| **MyMaps**   | 2000-2199     | User-created drawing and custom layers           |
| **Tools**    | 2200-2399     | Tool-related layers (measure, coordinates, etc.) |
| **Graphics** | 2400-2499     | Temporary graphics, highlights, and overlays     |
| **Overlay**  | 2500-2599     | Overlay layers                                   |
| **Popup**    | 2600-2699     | Popup and tooltip layers                         |

## Basic Usage

### Adding Layers

```typescript
import { LayerManager } from "@/utils/openlayers/LayerManager";

// Simple layer addition
const layerId = LayerManager.addLayer(myLayer, "TOC", "My Layer Name");

// With options
const layerId = LayerManager.addLayer(myLayer, "TOC", "My Layer Name", {
  index: 0, // Insert at specific position (optional)
  visible: true, // Set initial visibility (optional)
  opacity: 0.8, // Set initial opacity (optional)
  metadata: {
    // Custom metadata (optional)
    source: "GeoServer",
    url: "https://...",
  },
});
```

### Layer Operations

```typescript
// Update visibility
LayerManager.setLayerVisibility(layerId, true);

// Update opacity
LayerManager.setLayerOpacity(layerId, 0.5);

// Move layer to different category
LayerManager.moveLayer(layerId, "Graphics", 0);

// Remove layer
LayerManager.removeLayer(layerId);
```

### Querying Layers

```typescript
// Get specific layer
const layer = LayerManager.getLayer(layerId);

// Get all layers in a category
const tocLayers = LayerManager.getLayersByCategory("TOC");

// Get all layers sorted by z-index
const allLayers = LayerManager.getAllLayers();

// Debug layer order
LayerManager.logLayerOrder();
```

## Integration with TOC

The TOC system is now integrated with LayerManager:

```typescript
// TOC layers are automatically registered with LayerManager
// Each TOC layer gets a `managedLayerId` property for tracking

// Example from TOC store:
const managedLayerId = LayerManager.addLayer(olLayer, "TOC", layer.name, {
  visible: layer.visible,
  opacity: layer.opacity,
  metadata: {
    groupName: group.label,
    groupUrl: group.wmsGroupUrl,
  },
});

// Store the managed ID for future reference
layer.managedLayerId = managedLayerId;
```

## Store Architecture

### LayerManagerStore

The core Zustand store that tracks all layers:

```typescript
interface LayerManagerState {
  layers: Record<LayerCategory, ManagedLayer[]>;
  nextZIndex: Record<LayerCategory, number>;

  // Actions
  addLayer: (layer, category, name, options?) => string;
  removeLayer: (layerId) => boolean;
  updateLayerVisibility: (layerId, visible) => boolean;
  // ... more actions
}
```

### ManagedLayer Interface

Each managed layer contains:

```typescript
interface ManagedLayer {
  id: string; // Unique identifier
  name: string; // Human-readable name
  category: LayerCategory; // Category assignment
  layer: Layer; // OpenLayers layer object
  zIndex: number; // Calculated z-index
  visible: boolean; // Current visibility
  opacity: number; // Current opacity
  metadata?: object; // Custom metadata
  addedAt: Date; // Creation timestamp
}
```

## Configuration

### LayerOrderConfig.json

```json
{
  "categories": {
    "BaseMap": {
      "priority": 0,
      "zIndexRange": { "min": 0, "max": 99 },
      "description": "Base map layers"
    }
    // ... more categories
  },
  "defaultLayersPerCategory": 50,
  "zIndexIncrement": 1
}
```

## Advanced Features

### Batch Operations

```typescript
// Clear all layers in a category
LayerManager.clearCategory("Graphics");

// Clear all layers
LayerManager.clearAllLayers();

// Reorder category (fix z-index gaps)
LayerManager.reorderCategory("TOC");
```

### Z-Index Calculation

```typescript
// Get next available z-index for a category
const nextIndex = LayerManager.getNextZIndex("TOC");

// Get z-index for specific position
const specificIndex = LayerManager.getNextZIndex("TOC", 5);
```

### Debug Utilities

```typescript
// Log current layer hierarchy
LayerManager.logLayerOrder();

// Output example:
// 🗺️ Layer Order
//   📁 BaseMap (1 layers)
//     1. Streets (z-index: 0, visible: true)
//   📁 TOC (3 layers)
//     1. Layer A (z-index: 100, visible: true)
//     2. Layer B (z-index: 101, visible: false)
//     3. Layer C (z-index: 102, visible: true)
```

## Migration Guide

### From Direct Layer Management

**Before:**

```typescript
// Old direct approach
map.addLayer(layer);
layer.setZIndex(someIndex);
layer.setVisible(true);
```

**After:**

```typescript
// New managed approach
const layerId = LayerManager.addLayer(layer, "TOC", "Layer Name", {
  visible: true,
});
```

### TOC Integration

**Before:**

```typescript
// Direct layer manipulation
layer.layer.setVisible(visible);
```

**After:**

```typescript
// Use LayerManager when available
if (layer.managedLayerId) {
  LayerManager.setLayerVisibility(layer.managedLayerId, visible);
} else {
  // Fallback for unmanaged layers
  layer.layer.setVisible(visible);
}
```

## Best Practices

1. **Always use LayerManager** for new layer creation
2. **Store managedLayerId** in your layer objects for future reference
3. **Use appropriate categories** based on layer purpose
4. **Avoid direct z-index manipulation** - let LayerManager handle it
5. **Use metadata** to store additional layer information
6. **Clear categories** when switching contexts (e.g., changing map themes)

## Troubleshooting

### Layer Not Visible

- Check if layer is in correct category
- Verify z-index with `LayerManager.logLayerOrder()`
- Confirm layer visibility and opacity settings

### Z-Index Issues

- Use `LayerManager.reorderCategory()` to fix gaps
- Check if category z-index range is exceeded
- Verify LayerOrderConfig.json is valid

### Performance

- Clear unused categories with `LayerManager.clearCategory()`
- Monitor layer count with debug utilities
- Use appropriate metadata instead of storing large objects

## Testing

Run the test suite to verify functionality:

```typescript
import { testLayerManager } from "@/utils/openlayers/LayerManagerTest";
testLayerManager();
```

This will create test layers, verify z-index ordering, test operations, and clean up.
