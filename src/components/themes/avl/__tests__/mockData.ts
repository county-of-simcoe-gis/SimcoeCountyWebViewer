/**
 * Mock data fixtures for AVL theme component tests.
 *
 * These fixtures provide consistent test data for all AVL-related tests,
 * simulating real API responses without requiring network access.
 */

import type {
  AvlVehicle,
  AvlHistoryVehicle,
  AvlGroup,
  AvlSubGroup,
  AvlConfig,
  AvlSecurityGroup,
  GeoTabDevice,
  GeoTabCredentials,
  GeoTabRunListItem,
  SortOption,
} from "../types/avl.types";

// ==================== Security Groups ====================

export const mockSecurityGroups: AvlSecurityGroup[] = [
  { key: "avl_roads", label: "Roads" },
  { key: "avl_roads", label: "Roads GeoTab" },
  { key: "avl_solid_waste", label: "Solid Waste" },
  { key: "avl_solid_waste", label: "Solid Waste GeoTab" },
  { key: "avl_waste_contractor", label: "Waste Contractor" },
  { key: "avl_oro_roads", label: "Oro-Medonte Roads (Spreader)" },
  { key: "avl_severn_roads", label: "Severn" },
  { key: "avl_innisfil_roads", label: "Innisfil" },
];

// ==================== Sub-Groups ====================

export const mockSubGroups: AvlSubGroup[] = [
  { name: "Plow", imageName: "plow.png", visible: true },
  { name: "Heavy Equipment", imageName: "heavyEquipment.png", visible: true },
  { name: "Patrol", imageName: "patrol.png", visible: true },
  { name: "Truck", imageName: "truck.png", visible: false },
];

export const mockSolidWasteSubGroups: AvlSubGroup[] = [
  { name: "Garbage Truck", imageName: "garbage.png", visible: true },
  { name: "Recycling Truck", imageName: "recycling.png", visible: true },
];

// ==================== Vehicles ====================

export const mockVehicle: AvlVehicle = {
  vehicle_name: "ROADS-101",
  vehicle_id: "v101",
  vehicle_description: "Plow Truck 101",
  vehicle_type: "Plow",
  grouping: "Roads GeoTab",
  subgrouping: "Plow",
  latitude: 44.3894,
  longitude: -79.6903,
  velocity: 45,
  direction: 180,
  date: "2026-02-03T14:30:00.000Z",
  dateFriendly: "2026-02-03 9:30 AM",
  device_id: "device-101",
  imageName: "plow.png",
  lastReported: "Last Reported: 5 min",
  cssClass: "green",
  hasGeoTabSpreaderData: true,
  isPlowActive: true,
  isSpreaderActive: false,
  isWingActive: false,
  SpreaderRate: 150,
  AirTemperature: -5,
  SurfaceTemperature: -8,
  MaterialType: "SALT",
};

export const mockVehicle2: AvlVehicle = {
  vehicle_name: "ROADS-102",
  vehicle_id: "v102",
  vehicle_description: "Patrol Truck 102",
  vehicle_type: "Patrol",
  grouping: "Roads GeoTab",
  subgrouping: "Patrol",
  latitude: 44.4012,
  longitude: -79.7125,
  velocity: 65,
  direction: 90,
  date: "2026-02-03T14:25:00.000Z",
  dateFriendly: "2026-02-03 9:25 AM",
  device_id: "device-102",
  imageName: "patrol.png",
  lastReported: "Last Reported: 10 min",
  cssClass: "green",
};

export const mockVehicle3: AvlVehicle = {
  vehicle_name: "ROADS-103",
  vehicle_id: "v103",
  vehicle_description: "Heavy Equipment 103",
  vehicle_type: "Heavy Equipment",
  grouping: "Roads GeoTab",
  subgrouping: "Heavy Equipment",
  latitude: 44.3756,
  longitude: -79.6541,
  velocity: 0,
  direction: 0,
  date: "2026-02-02T10:00:00.000Z",
  dateFriendly: "2026-02-02 5:00 AM",
  device_id: "device-103",
  imageName: "heavyEquipment.png",
  lastReported: "Last Reported: 1 day",
  cssClass: "red",
};

export const mockSolidWasteVehicle: AvlVehicle = {
  vehicle_name: "SW-201",
  vehicle_id: "v201",
  vehicle_description: "Garbage Truck 201",
  vehicle_type: "Garbage Truck",
  grouping: "Solid Waste GeoTab",
  subgrouping: "Garbage Truck",
  latitude: 44.3500,
  longitude: -79.7000,
  velocity: 30,
  direction: 270,
  date: "2026-02-03T14:28:00.000Z",
  dateFriendly: "2026-02-03 9:28 AM",
  device_id: "device-201",
  imageName: "garbage.png",
  lastReported: "Last Reported: 7 min",
  cssClass: "green",
};

export const mockVehicles: AvlVehicle[] = [
  mockVehicle,
  mockVehicle2,
  mockVehicle3,
];

// ==================== History Vehicles ====================

export const mockHistoryVehicle: AvlHistoryVehicle = {
  ...mockVehicle,
  dateUTC: "2026-02-03T14:30:00.000Z",
  PlowDown: true,
  DryOn: true,
  DryRateKilosPerLaneKilometer: 150,
  DryRateReportedOn: "2026-02-03T14:30:00.000Z",
  WingDown: false,
  WingReportedOn: null,
  TemperatureAir: -5,
  TemperatureAirReportedOn: "2026-02-03T14:30:00.000Z",
  TemperatureSurface: -8,
  TemperatureSurfaceReportedOn: "2026-02-03T14:30:00.000Z",
};

export const mockHistoryVehicles: AvlHistoryVehicle[] = [
  mockHistoryVehicle,
  {
    ...mockVehicle,
    vehicle_name: "ROADS-101",
    date: "2026-02-03T14:25:00.000Z",
    dateFriendly: "2026-02-03 9:25 AM",
    latitude: 44.3880,
    longitude: -79.6890,
    velocity: 50,
    direction: 175,
    PlowDown: true,
    DryOn: false,
  },
  {
    ...mockVehicle,
    vehicle_name: "ROADS-101",
    date: "2026-02-03T14:20:00.000Z",
    dateFriendly: "2026-02-03 9:20 AM",
    latitude: 44.3865,
    longitude: -79.6875,
    velocity: 55,
    direction: 170,
    PlowDown: false,
    DryOn: false,
  },
];

// ==================== Groups ====================

export const mockRoadsGroup: AvlGroup = {
  name: "Roads GeoTab",
  visible: true,
  open: true,
  isGeoTabDevice: true,
  geoTabAPIKey: "roads",
  hasGeoTabSpreaderData: true,
  showTripsTab: true,
  subGroups: mockSubGroups,
  data: mockVehicles,
};

export const mockSolidWasteGroup: AvlGroup = {
  name: "Solid Waste GeoTab",
  visible: true,
  open: false,
  isGeoTabDevice: true,
  geoTabAPIKey: "solidwaste",
  hasGeoTabSpreaderData: false,
  showTripsTab: false,
  subGroups: mockSolidWasteSubGroups,
  data: [mockSolidWasteVehicle],
};

export const mockGroups: AvlGroup[] = [mockRoadsGroup, mockSolidWasteGroup];

// ==================== Config ====================

export const mockAvlConfig: AvlConfig = {
  groups: mockGroups,
  hideLiveFeed: false,
};

export const mockAvlConfigHideLiveFeed: AvlConfig = {
  groups: mockGroups,
  hideLiveFeed: true,
};

// ==================== GeoTab Data ====================

export const mockGeoTabCredentials: GeoTabCredentials = {
  sessionId: "mock-session-id-12345",
  database: "mock-database",
  userName: "mock-user@simcoe.ca",
};

export const mockGeoTabDevice: GeoTabDevice = {
  id: "geotab-device-001",
  name: "ROADS - 101",
  serialNumber: "G9ABC123",
  deviceType: "GO9",
};

export const mockGeoTabDevice2: GeoTabDevice = {
  id: "geotab-device-002",
  name: "ROADS - 102",
  serialNumber: "G9ABC124",
  deviceType: "GO9",
};

export const mockGeoTabDevices: GeoTabDevice[] = [
  mockGeoTabDevice,
  mockGeoTabDevice2,
];

// ==================== Trips ====================

export const mockTrip: GeoTabRunListItem = {
  vehicle_name: "ROADS-101",
  run_id: "trip-001",
  start_date: "2026-02-03T08:00:00.000Z",
  end_date: "2026-02-03T12:00:00.000Z",
  duration_minutes: 240,
};

export const mockTrip2: GeoTabRunListItem = {
  vehicle_name: "ROADS-101",
  run_id: "trip-002",
  start_date: "2026-02-03T13:00:00.000Z",
  end_date: "2026-02-03T16:30:00.000Z",
  duration_minutes: 210,
};

export const mockTrips: GeoTabRunListItem[] = [mockTrip, mockTrip2];

// ==================== Sort Options ====================

export const mockSortOptions: SortOption[] = [
  { label: "Last Reported", value: "date" },
  { label: "Vehicle ID", value: "vehicle_name" },
  { label: "Speed", value: "velocity" },
];

// ==================== API Response Generators ====================

/**
 * Generate a list of mock vehicles for API response
 */
export function generateMockVehicles(count: number, grouping = "Roads GeoTab"): AvlVehicle[] {
  return Array.from({ length: count }, (_, i) => ({
    vehicle_name: `VEHICLE-${i + 1}`,
    vehicle_id: `v${i + 1}`,
    grouping,
    subgrouping: mockSubGroups[i % mockSubGroups.length].name,
    latitude: 44.3894 + (i * 0.01),
    longitude: -79.6903 + (i * 0.01),
    velocity: Math.floor(Math.random() * 80),
    direction: Math.floor(Math.random() * 360),
    date: new Date(Date.now() - i * 60000).toISOString(),
    dateFriendly: `2026-02-03 ${9 + Math.floor(i / 60)}:${String(30 - (i % 60)).padStart(2, "0")} AM`,
    imageName: mockSubGroups[i % mockSubGroups.length].imageName,
    lastReported: `Last Reported: ${i + 1} min`,
    cssClass: i < 5 ? "green" : "red",
  }));
}

/**
 * Generate mock history records for a vehicle
 */
export function generateMockHistory(vehicleName: string, count: number): AvlHistoryVehicle[] {
  return Array.from({ length: count }, (_, i) => ({
    vehicle_name: vehicleName,
    vehicle_id: "v101",
    grouping: "Roads GeoTab",
    subgrouping: "Plow",
    latitude: 44.3894 + (i * 0.001),
    longitude: -79.6903 + (i * 0.001),
    velocity: 45 + (i % 20),
    direction: (180 + i * 5) % 360,
    date: new Date(Date.now() - i * 300000).toISOString(),
    dateFriendly: `2026-02-03 ${9 - Math.floor(i / 12)}:${String(30 - ((i * 5) % 60)).padStart(2, "0")} AM`,
    imageName: "plow.png",
    PlowDown: i % 3 === 0,
    DryOn: i % 4 === 0,
    DryRateKilosPerLaneKilometer: i % 4 === 0 ? 150 : 0,
    TemperatureAir: -5 - (i % 5),
    TemperatureSurface: -8 - (i % 3),
  }));
}

// ==================== Store Mock Factories ====================

/**
 * Create a mock AVL store state for testing
 */
export function createMockAvlStoreState(overrides: Partial<ReturnType<typeof getDefaultAvlStoreState>> = {}) {
  return {
    ...getDefaultAvlStoreState(),
    ...overrides,
  };
}

function getDefaultAvlStoreState() {
  return {
    activeTab: 0,
    config: mockAvlConfig,
    configGroups: mockGroups,
    allowedGroups: ["Roads GeoTab", "Solid Waste GeoTab"],
    vehicles: mockVehicles,
    geoTabDevices: { roads: mockGeoTabDevices } as Record<string, GeoTabDevice[]>,
    geoTabCredentials: { roads: mockGeoTabCredentials } as Record<string, GeoTabCredentials>,
    followingVehicle: null as { name: string; grouping: string } | null,
    selectedSortOption: mockSortOptions[0],
    sortAscendingChecked: true,
    showLabels: true,
    searchText: "",
    showTripsTab: true,
    plowGroups: [mockRoadsGroup],
    // Actions (mocked as vi.fn in tests)
    setActiveTab: () => {},
    setConfig: () => {},
    setConfigGroups: () => {},
    setAllowedGroups: () => {},
    setVehicles: () => {},
    setGeoTabDevices: () => {},
    setGeoTabCredentials: () => {},
    setFollowingVehicle: () => {},
    setSelectedSortOption: () => {},
    setSortAscendingChecked: () => {},
    setShowLabels: () => {},
    setSearchText: () => {},
    setShowTripsTab: () => {},
    setPlowGroups: () => {},
    setGroupVisibility: () => {},
    setSubGroupVisibility: () => {},
    setGroupOpen: () => {},
    loadFromStorage: () => {},
    saveToStorage: () => {},
  };
}

// ==================== Auth Mock Helpers ====================

export const mockAuthLoading = {
  isLoading: true,
  isAuthenticated: false,
  hasAccess: false,
  roles: [] as string[],
  promptLogin: () => {},
};

export const mockAuthUnauthenticated = {
  isLoading: false,
  isAuthenticated: false,
  hasAccess: false,
  roles: [] as string[],
  promptLogin: () => {},
};

export const mockAuthNoAccess = {
  isLoading: false,
  isAuthenticated: true,
  hasAccess: false,
  roles: ["some_other_role"],
  promptLogin: () => {},
};

export const mockAuthWithRoadsAccess = {
  isLoading: false,
  isAuthenticated: true,
  hasAccess: true,
  roles: ["avl_roads"],
  promptLogin: () => {},
};

export const mockAuthWithFullAccess = {
  isLoading: false,
  isAuthenticated: true,
  hasAccess: true,
  roles: ["avl_roads", "avl_solid_waste"],
  promptLogin: () => {},
};
