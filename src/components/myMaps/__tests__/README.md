# MyMaps Component Tests

This directory contains comprehensive tests for all MyMaps components and API endpoints.

## Test Files

### Main Components

- **MyMaps.test.tsx** - Tests for the main MyMaps container component
- **MyMapsAdvanced.test.tsx** - Tests for the advanced options panel
- **MyMapsService.test.tsx** - Tests for the background service component

### Child Components

- **MyMapsItems.test.tsx** - Tests for the items list component
- **ButtonBar.test.tsx** - Tests for the drawing tools button bar
- **ColorBar.test.tsx** - Tests for the color selection component
- **MyMapsItemPopup.test.tsx** - Tests for the item context menu popup

### API Routes

- **route.test.ts** - Tests for POST /api/mymaps (save functionality)
- **[id]/route.test.ts** - Tests for GET /api/mymaps/[id] (retrieve functionality)

## Test Utilities

### Test Helper Files

- **myMapsTestUtils.ts** - Comprehensive test utilities for mocking OpenLayers and MyMaps dependencies

## Test Coverage

### MyMaps.tsx

- ✅ Component rendering with all child components
- ✅ Visibility control and conditional rendering
- ✅ Item operations (create, update, delete)
- ✅ Popup functionality and positioning
- ✅ Event handling and emissions
- ✅ Export functionality for different formats
- ✅ Advanced panel integration
- ✅ Error handling and edge cases

### MyMapsAdvanced.tsx

- ✅ Panel expand/collapse functionality
- ✅ Edit mode management (switch and radio buttons)
- ✅ Import/Save/Share operations
- ✅ Additional tools menu and submenus
- ✅ API integration and error handling
- ✅ Form validation and user feedback
- ✅ Accessibility features

### MyMapsService.tsx

- ✅ Service initialization and cleanup
- ✅ Drawing manager integration
- ✅ Feature creation for different draw types
- ✅ Feature modification and deletion
- ✅ Store state synchronization
- ✅ Event listener management
- ✅ Map interaction handling
- ✅ Error handling for service operations

### MyMapsItems.tsx

- ✅ Header rendering and editing indicators
- ✅ Empty state handling
- ✅ Item list rendering and updates
- ✅ Event propagation to parent components
- ✅ Different geometry type support
- ✅ Performance with large item counts
- ✅ Accessibility and proper structure

### ButtonBar.tsx

- ✅ Tool button rendering from configuration
- ✅ Active state management
- ✅ Enable/disable states and editing mode
- ✅ Button click handling and store updates
- ✅ Visibility configuration respect
- ✅ Keyboard accessibility
- ✅ Performance optimizations

### ColorBar.tsx

- ✅ Color palette rendering from constants
- ✅ Active color indication with checkmarks
- ✅ Color selection and store updates
- ✅ Editing mode restrictions
- ✅ Keyboard navigation and accessibility
- ✅ Tooltip functionality
- ✅ Edge cases with custom colors

### MyMapsItemPopup.tsx

- ✅ Popup visibility and positioning
- ✅ Menu action handling (buffer, symbolize, zoom, etc.)
- ✅ Export submenu functionality
- ✅ Optional callback support
- ✅ Click outside and escape key handling
- ✅ Event listener cleanup
- ✅ Accessibility and tooltips
- ✅ Error handling for edge cases

### API Routes

- ✅ Host authorization checks
- ✅ Request body validation and processing
- ✅ Database operations (insert/select)
- ✅ Error handling and status codes
- ✅ Response format consistency
- ✅ Edge cases and malformed requests
- ✅ Logging and debugging features

## Running Tests

```bash
# Run all MyMaps tests
npm test src/components/myMaps

# Run specific test file
npm test src/components/myMaps/__tests__/MyMaps.test.tsx

# Run API tests
npm test src/app/api/mymaps

# Run with coverage
npm test -- --coverage
```

## Test Patterns

### Mocking Strategy

- OpenLayers components are thoroughly mocked with realistic behavior
- Store hooks use vi.mock with controllable state
- DOM APIs and browser features are mocked appropriately
- External dependencies (navigator.clipboard, next/image) are mocked

### Test Structure

Each test file follows a consistent structure:

1. **Rendering tests** - Component display and visibility
2. **Interaction tests** - User interactions and event handling
3. **State management tests** - Store updates and synchronization
4. **Accessibility tests** - ARIA attributes and keyboard support
5. **Error handling tests** - Edge cases and error scenarios
6. **Performance tests** - Large datasets and rapid interactions

### Assertion Patterns

- Component structure and content verification
- Event callback verification with proper parameters
- Store state updates and side effects
- DOM manipulation and class applications
- Accessibility compliance
- Error boundary behavior

## Notes

- All tests use Vitest with React Testing Library
- Tests are isolated with proper cleanup between runs
- Comprehensive mocks prevent external dependencies
- Test utilities provide reusable mocking functions
- Coverage targets all major code paths and edge cases
