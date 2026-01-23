// AVL Theme TypeScript Interfaces

// ==================== Core Vehicle Types ====================

/**
 * Represents a vehicle in the AVL system
 */
export interface AvlVehicle {
  vehicle_name: string;
  vehicle_id?: string;
  vehicle_description?: string;
  vehicle_type?: string;
  grouping: string;
  subgrouping: string;
  latitude: number;
  longitude: number;
  velocity: number;
  direction: number;
  date: string;
  dateFriendly: string;
  device_id?: string | null;

  // Computed display properties
  imageName?: string;
  lastReported?: string;
  cssClass?: string;

  // GeoTab spreader data (for plow vehicles)
  hasGeoTabSpreaderData?: boolean;
  isPlowActive?: boolean;
  isSpreaderActive?: boolean;
  isWingActive?: boolean;

  // GeoTab diagnostic data
  SpreaderRate?: number | string;
  SpreaderRateReportedOn?: string | null;
  AirTemperature?: number | string;
  AirTemperatureReportedOn?: string | null;
  SurfaceTemperature?: number | string;
  SurfaceTemperatureReportedOn?: string | null;
  MaterialType?: string;
  MaterialTypeReportedOn?: string | null;
  Blasting?: boolean;

  // For dropdown selection
  label?: string;
  value?: string;
}

/**
 * Represents vehicle history data with additional spreader info
 */
export interface AvlHistoryVehicle extends AvlVehicle {
  dateUTC?: string;
  PlowDown?: boolean;
  DryOn?: boolean;
  DryRateKilosPerLaneKilometer?: number | string;
  DryRateReportedOn?: string | null;
  WingDown?: boolean | string;
  WingReportedOn?: string | null;
  TemperatureAir?: number | string;
  TemperatureAirReportedOn?: string | null;
  TemperatureSurface?: number | string;
  TemperatureSurfaceReportedOn?: string | null;
}

// ==================== Group & Configuration Types ====================

/**
 * Represents a sub-group within a vehicle group
 */
export interface AvlSubGroup {
  name: string;
  imageName: string;
  visible: boolean;
}

/**
 * Represents a group of vehicles in the AVL config
 */
export interface AvlGroup {
  name: string;
  visible: boolean;
  open: boolean;
  isGeoTabDevice?: boolean;
  geoTabAPIKey?: string;
  hasGeoTabSpreaderData?: boolean;
  showTripsTab?: boolean;
  subGroups: AvlSubGroup[];
  data?: AvlVehicle[];
  vehicles?: AvlVehicle[];
}

/**
 * AVL configuration structure from avlConfig.json
 */
export interface AvlConfig {
  groups: AvlGroup[];
  hideLiveFeed?: boolean;
}

/**
 * Security group mapping for access control
 */
export interface AvlSecurityGroup {
  key: string;
  label: string;
  value?: string;
}

// ==================== GeoTab Types ====================

/**
 * GeoTab API credentials
 */
export interface GeoTabCredentials {
  sessionId: string;
  database: string;
  userName: string;
}

/**
 * GeoTab device from API
 */
export interface GeoTabDevice {
  id: string;
  name: string;
  serialNumber?: string;
  deviceType?: string;
}

/**
 * GeoTab exception event (PlowActive, SpreaderActive)
 */
export interface GeoTabExceptionEvent {
  deviceId: string;
  activeFrom: Date;
  activeTo: Date;
}

/**
 * GeoTab status data (spreader rate, temperatures, etc.)
 */
export interface GeoTabStatusData {
  deviceId: string;
  dateTime: Date;
  value: number;
}

/**
 * GeoTab DeviceStatusInfo from API
 */
export interface GeoTabDeviceStatusInfo {
  latitude: number;
  longitude: number;
  speed?: number;
  bearing?: number;
  dateTime: string;
  device: {
    id: string;
  };
  exceptionEvents?: {
    rule?: {
      id: string;
    };
    diagnostic?: {
      id: string;
    };
  }[];
}

/**
 * GeoTab spreader data bundle
 */
export interface GeoTabSpreaderData {
  plowActiveEvents: GeoTabExceptionEvent[];
  spreaderActiveEvents: GeoTabExceptionEvent[];
  spreaderRateData: GeoTabStatusData[];
  wingData: GeoTabStatusData[];
  airTempData: GeoTabStatusData[];
  surfaceTempData: GeoTabStatusData[];
  materialTypeData: GeoTabStatusData[];
}

/**
 * Configuration for StatusData fetching and matching
 */
export interface StatusDataConfig {
  diagnosticId: string;
  fetchBufferHours: number;
  matchWindowMinutes: number;
}

// ==================== Dropdown/Select Types ====================

/**
 * Generic dropdown option
 */
export interface SelectOption<T = string> {
  label: string;
  value: T;
}

/**
 * Group dropdown option with GeoTab properties
 */
export interface GroupSelectOption extends SelectOption {
  key?: string;
  isGeoTabDevice?: boolean;
  geoTabAPIKey?: string;
}

/**
 * Sort options for vehicle list
 */
export type SortField = 'date' | 'vehicle_name' | 'velocity';

export interface SortOption extends SelectOption<SortField> {}

/**
 * Speed operator options for history filter
 */
export type SpeedOperator = '>=' | '<=' | '>' | '<' | '=';

export interface SpeedOperatorOption extends SelectOption<SpeedOperator> {}

// ==================== API Response Types ====================

/**
 * Response from AllVehicles endpoint
 */
export interface AllVehiclesResponse {
  vehicle_id: string;
  vehicle_description?: string;
  vehicle_type?: string;
  grouping: string;
  subgrouping: string;
  device_id?: string | null;
}

/**
 * Response from CurrentLocations endpoint
 */
export interface CurrentLocationResponse {
  vehicle_name: string;
  vehicle_description?: string;
  grouping: string;
  subgrouping: string;
  latitude: number;
  longitude: number;
  velocity: number;
  direction: number;
  date: string;
  dateFriendly?: string;
}

/**
 * Response from History/HistorySpreader endpoint
 */
export interface HistoryResponse extends CurrentLocationResponse {
  PlowDown?: boolean;
  DryOn?: boolean;
  DryRateKilosPerLaneKilometer?: number;
  TemperatureAir?: number;
  TemperatureSurface?: number;
  Blasting?: boolean;
}

/**
 * Response from GeoTabSessionId endpoint
 */
export interface GeoTabSessionResponse {
  sessionId: string;
  database: string;
  userName: string;
  error?: string;
}

/**
 * Response from HistorySpreaderGeoTabRunList endpoint
 */
export interface GeoTabRunListItem {
  vehicle_name: string;
  run_id: string;
  start_date: string;
  end_date: string;
  duration_minutes?: number;
}

// ==================== Component Props Types ====================

/**
 * Props for the main AVL theme component
 */
export interface AvlThemeProps {
  name?: string;
  helpLink?: string;
  hideHeader?: boolean;
  onClose: () => void;
  onSidebarVisibility?: () => void;
  config?: Partial<AvlConfig>;
  options?: Record<string, unknown>;
}

/**
 * Props for AvlLive component
 */
export interface AvlLiveProps {
  config: AvlConfig;
  securityGroups: AvlSecurityGroup[];
  onHistoryPopupButtonClick: (vehicle: AvlVehicle) => void;
  showVehicleList?: boolean;
  mapVehiclesVisible?: boolean;
  showFollowButton?: boolean;
  showHistoryButton?: boolean;
  useStorage?: boolean;
  onPlowVehiclesUpdate?: (hasVisiblePlowVehicles: boolean) => void;
  onPlowGroupsUpdate?: (groups: AvlGroup[]) => void;
  onGroupChange?: (group: AvlSubGroup | AvlGroup, checked: boolean) => void;
}

/**
 * Props for AvlHistory component
 */
export interface AvlHistoryProps {
  historyVehicle?: AvlVehicle | null;
  onHistoryVehicleConsumed?: () => void;
  group?: string | null;
  vehicleId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * Props for AvlTrips component
 */
export interface AvlTripsProps {
  groups: AvlGroup[];
}

/**
 * Props for AvlTripsResults component
 */
export interface AvlTripsResultsProps {
  results: GeoTabRunListItem[];
  selectedVehicleId: string;
  geoTabCredentials: Record<string, GeoTabCredentials>;
  geoTabDevices: Record<string, GeoTabDevice[]>;
  selectedGroup?: AvlGroup;
  cleanDeviceNameForMatching: (rawName: string, groupName: string) => string;
  ensureGeoTabCredentialsAndDevices: (
    groupOption: AvlGroup
  ) => Promise<{ credentials: GeoTabCredentials; devices: GeoTabDevice[] }>;
}

/**
 * Props for AvlLiveGroup component
 */
export interface AvlLiveGroupProps {
  info: AvlGroup;
  onInputChangeSubGroup: (subGroup: AvlSubGroup, group: AvlGroup, checked: boolean) => void;
  onInputChangeGroup: (group: AvlGroup, checked: boolean) => void;
  onPanelOpen: (group: AvlGroup, open: boolean) => void;
  onVechileClick?: (info: AvlVehicle) => void;
}

/**
 * Props for AvlLiveVehicle component
 */
export interface AvlLiveVehicleProps {
  info: AvlVehicle;
  onVechileClick: (info: AvlVehicle) => void;
}

/**
 * Props for AvlLivePopup component
 */
export interface AvlLivePopupProps {
  info: AvlVehicle;
  followingVehicleName: string;
  onFollowClick: (vehicle: AvlVehicle | null) => void;
  onHistoryClick: () => void;
  showFollowButton?: boolean;
  showHistoryButton?: boolean;
  onRef?: (ref: unknown) => void;
}

/**
 * Props for AvlHistoryVehicle component
 */
export interface AvlHistoryVehicleProps {
  info: AvlHistoryVehicle;
  onVechileClick: (info: AvlHistoryVehicle) => void;
}

/**
 * Props for AvlHistoryPopup component
 */
export interface AvlHistoryPopupProps {
  info: AvlHistoryVehicle;
  onRef?: (ref: unknown) => void;
}

// ==================== Storage Types ====================

/**
 * Structure of saved AVL live state in localStorage
 */
export interface AvlStorageState {
  groups: AvlGroup[];
  selectedSortOption: SortOption;
  sortAscendingChecked: boolean;
  showLabels: boolean;
}

// ==================== Utility Types ====================

/**
 * Matched status data value with timestamp
 */
export interface MatchedStatusValue {
  value: number;
  matchedDateTime: string;
}

/**
 * Extent bounding box [minX, minY, maxX, maxY]
 */
export type Extent = [number, number, number, number];
