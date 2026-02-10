# TogglerTool Test Suite

## Overview

Comprehensive test suite for the TogglerTool component with both unit tests and API integration tests.

## Test Files

### 1. `TogglerTool.test.tsx` - Unit Tests (19 tests)

Component tests using MSW (Mock Service Worker) for API mocking.

**Test Coverage:**

- ✅ Authentication and Authorization (4 tests)
  - Loading state while checking authentication
  - Login prompt when not authenticated
  - Access denied when lacking required roles
  - Tool renders when properly authenticated

- ✅ Layer Management (5 tests)
  - Layer dropdown display with configured layers
  - Layer selection changes
  - Record count display for selected layer
  - Layer visibility toggling
  - Legend display toggling

- ✅ Toggle Switch (4 tests)
  - Toggle switch default off state
  - Toggle switch state changes
  - Disables parcel click when toggle is on
  - Shift-click instruction display

- ✅ Error Handling (3 tests)
  - Error message display
  - Loading indicator display
  - WFS record count fetch failure handling

- ✅ Cleanup (2 tests)
  - Reset and onClose calls on close
  - Re-enables parcel click on unmount

- ✅ Helper Functions (1 test)
  - Helper functions tested via component behavior

### 2. `togglerApi.test.ts` - API Integration Tests (12 tests) **[SKIPPED IN CI]**

Real API endpoint tests that run locally but are skipped in Azure pipelines using `describe.skipIf(isCI)`.

**Test Coverage:**

- ✅ Toggler API Endpoint (4 tests)
  - Successful toggle operation
  - 401 unauthorized response
  - Invalid source table handling
  - Missing key parameter handling

- ✅ WFS Proxy Integration (3 tests)
  - Feature fetch by spatial query
  - Record count via RESULTTYPE=hits
  - Invalid WFS URL handling

- ✅ WMS Proxy Integration (2 tests)
  - GetFeatureInfo fetch
  - WMS tile image fetch

- ✅ End-to-End Workflow (1 test)
  - Complete toggle workflow (query → toggle → count)

- ✅ Performance and Load (2 tests)
  - Multiple concurrent WFS requests
  - Rapid successive toggle requests

### 3. `mockData.ts` - Test Data

Shared mock data for both test files including:

- Mock toggler layers configuration
- Mock WFS/WMS responses
- Mock API responses
- Mock session data

## Running Tests

### Run All Toggler Tests

```bash
npm test toggler
```

### Run Only Unit Tests

```bash
npm test TogglerTool.test
```

### Run Only API Tests (Local)

```bash
npm test togglerApi.test
```

### Watch Mode

```bash
npm run test:watch toggler
```

## CI/Pipeline Behavior

The API integration tests in `togglerApi.test.ts` use the `describe.skipIf(isCI)` pattern to:

- ✅ **Run locally** when developing and testing
- ⏭️ **Skip in CI/Azure pipelines** where network access and authentication are restricted

This is detected via environment variables:

```typescript
isCI = !!process.env.CI || process.env.TF_BUILD === "True";
```

Azure DevOps automatically sets `TF_BUILD=True`, causing these tests to be skipped during pipeline runs.

## Test Environment Setup

The tests use:

- **MSW (Mock Service Worker)** - HTTP request mocking for unit tests
- **Vitest** - Test runner with JSDOM environment
- **Testing Library** - React component testing utilities
- **OpenLayers Mocks** - Mock OL classes for map layer testing

## Mocking Strategy

### Component Dependencies

- `useSession` - NextAuth session hook
- `useRequireAuth` - Authentication/authorization hook
- `useMapStore` - Zustand map state store
- `useTogglerStore` - Zustand toggler state store
- `usePopupStore` - Zustand popup state store
- `LayerManager` - OpenLayers layer management utility

### API Endpoints Mocked

- `/api/secure/toggler/:sourceTable/:key/:userName` - Toggle endpoint
- `/api/proxy/wfs` - WFS proxy for feature queries
- `/api/proxy/wms` - WMS proxy for tile/feature info requests

### OpenLayers Mocks

- `ImageLayer` - WMS layer class
- `ImageWMS` - WMS source class (with auto-fire imageloadend event)
- `GeoJSON` - GeoJSON format parser
- `unByKey` - Event listener cleanup

## Authentication Testing

The tests cover all authentication states:

- ⏳ **Loading** - Checking authentication status
- ❌ **Unauthenticated** - Not logged in
- 🚫 **Unauthorized** - Logged in but lacking required roles
- ✅ **Authorized** - Logged in with proper toggler roles

Required roles for Toggler tool:

- `toggler_solid_waste`
- `toggler_customer_service`
- `toggler_forestry`
- `toggler_planning`

## Notes

- All tests pass locally: **31/31 tests passing**
- Zero ESLint errors
- API tests gracefully handle missing authentication (expected behavior)
- WMS layer loading is mocked to fire `imageloadend` event automatically
- Tests validate both success and error paths
