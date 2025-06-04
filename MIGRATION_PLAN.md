# Simcoe County Web Viewer Migration Plan

## Overview

This document outlines the incremental migration strategy from the React app in `OldApp/` to the new Next.js application using DaisyUI and Zustand.

## Current Progress ✅

### Phase 1: Foundation Setup (COMPLETED)

- ✅ Created Zustand stores for state management:
  - `appStore.ts` - Main application state (loading, config, app info)
  - `sidebarStore.ts` - Sidebar state (themes, tools, panels)
- ✅ Basic layout structure with DaisyUI components
- ✅ Core components created:
  - `Layout.tsx` - Main application layout
  - `Header.tsx` - Top navigation bar
  - `Sidebar.tsx` - Left sidebar with themes/tools
  - `MapContainer.tsx` - Map area placeholder
  - `LoadingScreen.tsx` - Loading overlay

## Next Steps: Incremental Migration

### Phase 2: Configuration and Helpers (**COMPLETED**)

**Priority: HIGH**

1. **Migrate Configuration System**

   - ✅ Copy `config.json` to new app
   - ✅ Create configuration loading utilities (`src/utils/config.ts`)
   - ✅ Implement dynamic favicon changing
   - ⏸️ Set up Google Analytics integration (skipped for now)

2. **Helper Functions Migration**

   - ✅ Migrate `helpers/helpers.js` to TypeScript utilities (`src/utils/helpers.ts`)
   - ✅ Create custom hooks for common operations (`src/hooks/useConfig.ts`)
   - ✅ Replace event emitter system with Zustand event store
   - ✅ Implement local storage utilities (`src/utils/storage.ts`)

3. **Window Variables & Event Emitting Migration** (**NEW - COMPLETED**)
   - ✅ Created `mapStore.ts` to replace window map variables
   - ✅ Created `eventStore.ts` to replace window.emitter system
   - ✅ Updated helper functions to use Zustand stores
   - ✅ Created `useEventListener` and `useEventEmitters` hooks
   - ✅ Updated components (Header, Sidebar, MapContainer) to use new stores
   - ✅ Wired up event emitters between stores in Layout component
   - ✅ Created comprehensive migration documentation

**Phase 2 Summary:**

- ✅ Configuration system fully migrated with TypeScript interfaces
- ✅ All tools and themes now load from `config.json`
- ✅ Proper error handling and loading states
- ✅ Helper functions converted to modern TypeScript utilities
- ✅ Local storage utilities with expiration support
- ✅ App store and sidebar store integrated with configuration
- ✅ Sidebar now displays actual tools and themes from config
- ✅ **NEW**: Complete replacement of window variables with Zustand stores
- ✅ **NEW**: Event emitting system replaced with type-safe Zustand events
- ✅ **NEW**: All components updated to use new state management patterns

### Phase 3: Header Component Enhancement

**Priority: HIGH**

1. **Migrate Header Features**
   - [ ] Add dynamic title from config
   - [ ] Implement header controls
   - [ ] Add responsive design
   - [ ] Migrate header-specific styling

### Phase 4: Sidebar Component Migration

**Priority: HIGH**

1. **Enhanced Sidebar Structure**

   - [ ] Implement collapsible/slim mode
   - [ ] Add proper theme/tool navigation tabs
   - [ ] Create panel component system
   - [ ] Migrate sidebar item list functionality

2. **Panel System**
   - [ ] Create `PanelComponent.tsx`
   - [ ] Implement panel minimization
   - [ ] Add panel dragging/resizing
   - [ ] Set up panel content routing

### Phase 5: Tools Migration (One by One)

**Priority: MEDIUM**

Start with simpler tools and gradually move to complex ones:

1. **Settings Tool** (EASIEST)

   - [ ] Basic settings panel
   - [ ] User preferences
   - [ ] Map control settings

2. **Weather Tool**

   - [ ] Weather widget
   - [ ] Location-based weather

3. **Coordinates Tool**

   - [ ] Coordinate display
   - [ ] Different coordinate systems

4. **Search Tools**

   - [ ] Address search
   - [ ] Owner name search
   - [ ] Search history

5. **Measure Tool** (MORE COMPLEX)

   - [ ] Distance measurement
   - [ ] Area measurement
   - [ ] Integration with map

6. **Print Tool** (COMPLEX)
   - [ ] Print layout options
   - [ ] PDF generation
   - [ ] Print preview

### Phase 6: Themes Migration (One by One)

**Priority: MEDIUM**

1. **Property Information Theme**

   - [ ] Property data display
   - [ ] Property search integration

2. **Roads & Transportation Theme**

   - [ ] Road layer management
   - [ ] Transportation data

3. **Environment Theme**
   - [ ] Environmental data layers
   - [ ] Specialized environmental tools

### Phase 7: Map Integration

**Priority: HIGH**

1. **OpenLayers Integration**

   - [ ] Initialize OpenLayers map
   - [ ] Migrate map configuration
   - [ ] Implement map controls
   - [ ] Layer management system

2. **Map Utilities**
   - [ ] Map extent management
   - [ ] Coordinate transformations
   - [ ] Map printing functionality

### Phase 8: Advanced Features

**Priority: LOW**

1. **Routing System**

   - [ ] Implement Next.js routing for different views
   - [ ] Legend page route
   - [ ] LayerInfo page route

2. **Reports System**

   - [ ] Report generation
   - [ ] Report templates
   - [ ] Report export functionality

3. **Authentication** (if needed)
   - [ ] Azure MSAL integration
   - [ ] Secure route protection

## Migration Guidelines

### For Each Component Migration:

1. **Analyze the Original**

   ```bash
   # Read the original component
   cat OldApp/src/path/to/component.jsx
   ```

2. **Create TypeScript Version**

   - Convert class components to functional components
   - Add proper TypeScript interfaces
   - Use DaisyUI classes for styling
   - Integrate with Zustand stores

3. **Test Functionality**

   - Ensure feature parity
   - Test responsive design
   - Verify accessibility

4. **Update Dependencies**
   - Add any new npm packages needed
   - Remove old dependencies when safe

### State Management Strategy:

1. **Replace Redux/Context with Zustand**

   - Each major feature area gets its own store
   - Keep stores focused and small
   - Use computed values for derived state

2. **Event System**
   - Replace custom event emitter with Zustand actions
   - Use React patterns for component communication

### Styling Strategy:

1. **Replace Custom CSS with DaisyUI**

   - Use DaisyUI component classes
   - Extend with custom Tailwind classes when needed
   - Maintain the same visual design language

2. **Responsive Design**
   - Use Tailwind responsive prefixes
   - Test on mobile devices
   - Ensure accessibility standards

## Development Workflow

1. **Before Starting Each Phase:**

   - Read through old component files
   - Identify dependencies and data flow
   - Plan the Zustand store structure

2. **During Development:**

   - Create small, focused commits
   - Test each component in isolation
   - Update this migration plan with progress

3. **After Each Component:**
   - Test integration with existing components
   - Update documentation
   - Consider refactoring opportunities

## Testing Strategy

1. **Component Testing**

   - Test each migrated component individually
   - Verify state management integration
   - Check responsive design

2. **Integration Testing**

   - Test component interactions
   - Verify data flow through Zustand stores
   - Test loading states and error handling

3. **User Acceptance Testing**
   - Compare functionality with old app
   - Test common user workflows
   - Gather feedback on UI/UX improvements

## Notes

- Keep the old app running during migration for reference
- Consider creating a feature flag system for gradual rollout
- Document any API changes or breaking changes
- Keep performance in mind - the new app should be faster
- Consider progressive enhancement opportunities
