import { create } from "zustand";
import type {
  AvlVehicle,
  AvlHistoryVehicle,
  AvlGroup,
  AvlConfig,
  GeoTabCredentials,
  GeoTabDevice,
  SortOption,
  SpeedOperatorOption,
  SelectOption,
  AvlStorageState,
} from "@/components/themes/avl/types/avl.types";

// Default configuration loaded from avlConfig.json
import defaultAvlConfig from "@/components/themes/avl/config/avlConfig.json";

const STORAGE_KEY = "avlLive";

// Default sort and filter options
const DEFAULT_SORT_OPTION: SortOption = { label: "Date", value: "date" };
const DEFAULT_SPEED_OPERATOR: SpeedOperatorOption = { label: ">=", value: ">=" };
const DEFAULT_SPEED_OPTION: SelectOption<number> = { label: "0", value: 0 };

interface AvlState {
  // ==================== Tab State ====================
  activeTab: number;

  // ==================== Config State ====================
  config: AvlConfig;
  configGroups: AvlGroup[];
  allowedGroups: string[];

  // ==================== Live State ====================
  vehicles: AvlVehicle[];
  geoTabDevices: Record<string, GeoTabDevice[]>;
  geoTabCredentials: Record<string, GeoTabCredentials>;
  followingVehicle: { name: string; grouping: string } | null;

  // Live view controls
  selectedSortOption: SortOption;
  sortAscendingChecked: boolean;
  showLabels: boolean;
  searchText: string;

  // ==================== History State ====================
  historyVehicle: AvlVehicle | null;
  historySearchResults: AvlHistoryVehicle[];
  historyIsLoading: boolean;
  historyTooManyRecords: boolean;
  historyZeroRecords: boolean;

  // History search filters
  historySelectedGroup: SelectOption | null;
  historySelectedVehicleType: SelectOption | null;
  historySelectedVehicle: SelectOption | null;
  historyStartDate: Date;
  historyEndDate: Date;
  historySelectedSpeedOperator: SpeedOperatorOption;
  historySelectedSpeed: SelectOption<number>;
  historySliderValue: number;
  historyOnlyVisibleExtent: boolean;

  // ==================== Trips State ====================
  tripsSearchResults: unknown[];
  tripsIsLoading: boolean;
  showTripsTab: boolean;
  plowGroups: AvlGroup[];

  // ==================== Actions ====================

  // Tab actions
  setActiveTab: (tab: number) => void;

  // Config actions
  setConfig: (config: AvlConfig) => void;
  setConfigGroups: (groups: AvlGroup[]) => void;
  updateConfigGroup: (groupName: string, updates: Partial<AvlGroup>) => void;
  setAllowedGroups: (groups: string[]) => void;

  // Live actions
  setVehicles: (vehicles: AvlVehicle[]) => void;
  setGeoTabDevices: (groupName: string, devices: GeoTabDevice[]) => void;
  setGeoTabCredentials: (groupName: string, credentials: GeoTabCredentials) => void;
  setFollowingVehicle: (vehicle: { name: string; grouping: string } | null) => void;

  // Live view controls
  setSelectedSortOption: (option: SortOption) => void;
  setSortAscendingChecked: (checked: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setSearchText: (text: string) => void;

  // Group visibility actions
  setGroupVisibility: (groupName: string, visible: boolean) => void;
  setSubGroupVisibility: (groupName: string, subGroupName: string, visible: boolean) => void;
  setGroupOpen: (groupName: string, open: boolean) => void;

  // History actions
  setHistoryVehicle: (vehicle: AvlVehicle | null) => void;
  setHistorySearchResults: (results: AvlHistoryVehicle[]) => void;
  setHistoryIsLoading: (loading: boolean) => void;
  setHistoryTooManyRecords: (tooMany: boolean) => void;
  setHistoryZeroRecords: (zero: boolean) => void;
  clearHistoryResults: () => void;

  // History filter actions
  setHistorySelectedGroup: (group: SelectOption | null) => void;
  setHistorySelectedVehicleType: (type: SelectOption | null) => void;
  setHistorySelectedVehicle: (vehicle: SelectOption | null) => void;
  setHistoryStartDate: (date: Date) => void;
  setHistoryEndDate: (date: Date) => void;
  setHistorySelectedSpeedOperator: (operator: SpeedOperatorOption) => void;
  setHistorySelectedSpeed: (speed: SelectOption<number>) => void;
  setHistorySliderValue: (value: number) => void;
  setHistoryOnlyVisibleExtent: (onlyVisible: boolean) => void;

  // Trips actions
  setTripsSearchResults: (results: unknown[]) => void;
  setTripsIsLoading: (loading: boolean) => void;
  setShowTripsTab: (show: boolean) => void;
  setPlowGroups: (groups: AvlGroup[]) => void;

  // Storage actions
  saveToStorage: () => void;
  loadFromStorage: () => void;

  // Computed/derived values
  getVisibleVehicles: () => AvlVehicle[];
  getFilteredVehicles: () => AvlVehicle[];
  hasGeoTabCredentials: (groupName: string) => boolean;
  hasGeoTabDevices: (groupName: string) => boolean;
}

// Helper function to get initial dates (3 hours behind current time)
const getInitialStartDate = (): Date => {
  const date = new Date();
  date.setHours(date.getHours() - 3);
  // Round to nearest 10 minutes
  const coeff = 1000 * 60 * 10;
  return new Date(Math.round(date.getTime() / coeff) * coeff);
};

const getInitialEndDate = (): Date => {
  const date = new Date();
  const coeff = 1000 * 60 * 10;
  return new Date(Math.round(date.getTime() / coeff) * coeff);
};

export const useAvlStore = create<AvlState>((set, get) => ({
  // ==================== Initial State ====================

  // Tab state
  activeTab: 0,

  // Config state
  config: defaultAvlConfig as AvlConfig,
  configGroups: (defaultAvlConfig as AvlConfig).groups || [],
  allowedGroups: [],

  // Live state
  vehicles: [],
  geoTabDevices: {},
  geoTabCredentials: {},
  followingVehicle: null,

  // Live view controls
  selectedSortOption: DEFAULT_SORT_OPTION,
  sortAscendingChecked: true,
  showLabels: true,
  searchText: "",

  // History state
  historyVehicle: null,
  historySearchResults: [],
  historyIsLoading: false,
  historyTooManyRecords: false,
  historyZeroRecords: false,

  // History filters
  historySelectedGroup: null,
  historySelectedVehicleType: { label: "All Types", value: "All Types" },
  historySelectedVehicle: { label: "All Vehicles", value: "All Vehicles" },
  historyStartDate: getInitialStartDate(),
  historyEndDate: getInitialEndDate(),
  historySelectedSpeedOperator: DEFAULT_SPEED_OPERATOR,
  historySelectedSpeed: DEFAULT_SPEED_OPTION,
  historySliderValue: 0,
  historyOnlyVisibleExtent: false,

  // Trips state
  tripsSearchResults: [],
  tripsIsLoading: false,
  showTripsTab: false,
  plowGroups: [],

  // ==================== Actions ====================

  // Tab actions
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Config actions
  setConfig: (config) =>
    set({
      config,
      configGroups: config.groups || [],
    }),

  setConfigGroups: (groups) => set({ configGroups: groups }),

  updateConfigGroup: (groupName, updates) =>
    set((state) => ({
      configGroups: state.configGroups.map((group) =>
        group.name === groupName ? { ...group, ...updates } : group
      ),
    })),

  setAllowedGroups: (groups) => set({ allowedGroups: groups }),

  // Live actions
  setVehicles: (vehicles) => set({ vehicles }),

  setGeoTabDevices: (groupName, devices) =>
    set((state) => ({
      geoTabDevices: {
        ...state.geoTabDevices,
        [groupName]: devices,
      },
    })),

  setGeoTabCredentials: (groupName, credentials) =>
    set((state) => ({
      geoTabCredentials: {
        ...state.geoTabCredentials,
        [groupName]: credentials,
      },
    })),

  setFollowingVehicle: (vehicle) => set({ followingVehicle: vehicle }),

  // Live view controls
  setSelectedSortOption: (option) => {
    set({ selectedSortOption: option });
    get().saveToStorage();
  },

  setSortAscendingChecked: (checked) => {
    set({ sortAscendingChecked: checked });
    get().saveToStorage();
  },

  setShowLabels: (show) => {
    set({ showLabels: show });
    get().saveToStorage();
  },

  setSearchText: (text) => set({ searchText: text }),

  // Group visibility actions
  setGroupVisibility: (groupName, visible) => {
    set((state) => ({
      configGroups: state.configGroups.map((group) =>
        group.name === groupName ? { ...group, visible } : group
      ),
    }));
    get().saveToStorage();
  },

  setSubGroupVisibility: (groupName, subGroupName, visible) => {
    set((state) => ({
      configGroups: state.configGroups.map((group) => {
        if (group.name !== groupName) return group;
        return {
          ...group,
          subGroups: group.subGroups.map((subGroup) =>
            subGroup.name === subGroupName ? { ...subGroup, visible } : subGroup
          ),
        };
      }),
    }));
    get().saveToStorage();
  },

  setGroupOpen: (groupName, open) => {
    set((state) => ({
      configGroups: state.configGroups.map((group) =>
        group.name === groupName ? { ...group, open } : group
      ),
    }));
  },

  // History actions
  setHistoryVehicle: (vehicle) => set({ historyVehicle: vehicle }),

  setHistorySearchResults: (results) => set({ historySearchResults: results }),

  setHistoryIsLoading: (loading) => set({ historyIsLoading: loading }),

  setHistoryTooManyRecords: (tooMany) => set({ historyTooManyRecords: tooMany }),

  setHistoryZeroRecords: (zero) => set({ historyZeroRecords: zero }),

  clearHistoryResults: () =>
    set({
      historySearchResults: [],
      historyTooManyRecords: false,
      historyZeroRecords: false,
    }),

  // History filter actions
  setHistorySelectedGroup: (group) => set({ historySelectedGroup: group }),

  setHistorySelectedVehicleType: (type) => set({ historySelectedVehicleType: type }),

  setHistorySelectedVehicle: (vehicle) => set({ historySelectedVehicle: vehicle }),

  setHistoryStartDate: (date) => set({ historyStartDate: date }),

  setHistoryEndDate: (date) => set({ historyEndDate: date }),

  setHistorySelectedSpeedOperator: (operator) =>
    set({ historySelectedSpeedOperator: operator }),

  setHistorySelectedSpeed: (speed) => set({ historySelectedSpeed: speed }),

  setHistorySliderValue: (value) => set({ historySliderValue: value }),

  setHistoryOnlyVisibleExtent: (onlyVisible) =>
    set({ historyOnlyVisibleExtent: onlyVisible }),

  // Trips actions
  setTripsSearchResults: (results) => set({ tripsSearchResults: results }),

  setTripsIsLoading: (loading) => set({ tripsIsLoading: loading }),

  setShowTripsTab: (show) => set({ showTripsTab: show }),

  setPlowGroups: (groups) => set({ plowGroups: groups }),

  // Storage actions
  saveToStorage: () => {
    const state = get();
    // Clone groups without data to avoid storing vehicle data
    const groupsWithoutData = state.configGroups.map((group) => ({
      ...group,
      data: [],
    }));

    const saveObj: AvlStorageState = {
      groups: groupsWithoutData,
      selectedSortOption: state.selectedSortOption,
      sortAscendingChecked: state.sortAscendingChecked,
      showLabels: state.showLabels,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveObj));
    } catch (e) {
      console.error("Failed to save AVL state to storage:", e);
    }
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data: AvlStorageState = JSON.parse(stored);

      // Merge stored group visibility with current config
      const mergedGroups = get().configGroups.map((group) => {
        const storedGroup = data.groups.find((g) => g.name === group.name);
        if (storedGroup) {
          return {
            ...group,
            visible: storedGroup.visible,
            open: storedGroup.open,
            subGroups: group.subGroups.map((subGroup) => {
              const storedSubGroup = storedGroup.subGroups?.find(
                (sg) => sg.name === subGroup.name
              );
              return storedSubGroup
                ? { ...subGroup, visible: storedSubGroup.visible }
                : subGroup;
            }),
          };
        }
        return group;
      });

      set({
        configGroups: mergedGroups,
        selectedSortOption: data.selectedSortOption || DEFAULT_SORT_OPTION,
        sortAscendingChecked: data.sortAscendingChecked ?? true,
        showLabels: data.showLabels ?? true,
      });
    } catch (e) {
      console.error("Failed to load AVL state from storage:", e);
    }
  },

  // Computed/derived values
  getVisibleVehicles: () => {
    const state = get();
    const vehicles: AvlVehicle[] = [];
    const vehicleKeys = new Set<string>();

    for (const group of state.configGroups) {
      if (!group.visible || !group.data) continue;
      if (!Array.isArray(group.data)) continue;

      for (const subGroup of group.subGroups) {
        if (!subGroup.visible) continue;

        for (const vehicle of group.data) {
          if (vehicle.subgrouping !== subGroup.name) continue;

          const vehicleKey = `${vehicle.grouping}-${vehicle.subgrouping}-${vehicle.vehicle_name}`;
          if (vehicleKeys.has(vehicleKey)) continue;

          vehicleKeys.add(vehicleKey);
          vehicles.push({
            ...vehicle,
            imageName: subGroup.imageName,
            hasGeoTabSpreaderData: group.hasGeoTabSpreaderData === true,
          });
        }
      }
    }

    return vehicles;
  },

  getFilteredVehicles: () => {
    const state = get();
    const visibleVehicles = get().getVisibleVehicles();

    if (!state.searchText) return visibleVehicles;

    return visibleVehicles.filter((vehicle) =>
      vehicle.vehicle_name.toUpperCase().includes(state.searchText.toUpperCase())
    );
  },

  hasGeoTabCredentials: (groupName) => {
    return !!get().geoTabCredentials[groupName];
  },

  hasGeoTabDevices: (groupName) => {
    const devices = get().geoTabDevices[groupName];
    return devices && devices.length > 0;
  },
}));
