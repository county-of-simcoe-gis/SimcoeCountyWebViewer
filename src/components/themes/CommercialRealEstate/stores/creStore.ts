"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Image as ImageLayer } from "ol/layer";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";
import {
  type SelectOption,
  type StringSelectOption,
  type PropertyType,
  PROPERTY_TYPES,
  getTypes,
  getBuildingSpaceFromItems,
  getBuildingSpaceToItems,
  getLandSizeFromItems,
  getLandSizeToItems,
  getPriceFromItems,
  getPriceToItems,
} from "@/components/themes/CommercialRealEstate/creObjects";

export type SearchMode = "BuildingSize" | "LandSize";

export interface PropertyLayerState {
  propType: PropertyType;
  pointLayer: ImageLayer | null;
  layerManagerId: string | null;
  visible: boolean;
}

interface CREState {
  // Filter state
  selectedType: StringSelectOption;
  incentiveChecked: boolean;
  onlyInMapChecked: boolean;
  searchMode: SearchMode;
  selectedBuildingSpaceFrom: SelectOption;
  selectedBuildingSpaceTo: SelectOption;
  selectedLandSizeFrom: SelectOption;
  selectedLandSizeTo: SelectOption;
  selectedPriceFrom: SelectOption;
  selectedPriceTo: SelectOption;

  // Property type layers
  propertyLayers: Record<string, PropertyLayerState>;

  // Results
  allResults: Feature<Geometry>[];
  numRecords: number;
  isLoading: boolean;

  // Active tab
  activeTab: number;

  // Actions
  setSelectedType: (type: StringSelectOption) => void;
  setIncentiveChecked: (checked: boolean) => void;
  setOnlyInMapChecked: (checked: boolean) => void;
  setSearchMode: (mode: SearchMode) => void;
  setBuildingSpaceFrom: (option: SelectOption) => void;
  setBuildingSpaceTo: (option: SelectOption) => void;
  setLandSizeFrom: (option: SelectOption) => void;
  setLandSizeTo: (option: SelectOption) => void;
  setPriceFrom: (option: SelectOption) => void;
  setPriceTo: (option: SelectOption) => void;
  setPropertyLayerVisible: (propType: string, visible: boolean) => void;
  setPropertyLayer: (propType: string, layer: ImageLayer, layerManagerId: string) => void;
  setResults: (results: Feature<Geometry>[], count: number) => void;
  appendResults: (results: Feature<Geometry>[]) => void;
  clearResults: () => void;
  setIsLoading: (loading: boolean) => void;
  setActiveTab: (tab: number) => void;
  reset: () => void;
}

const types = getTypes();
const buildingSpaceFromItems = getBuildingSpaceFromItems();
const buildingSpaceToItems = getBuildingSpaceToItems();
const landSizeFromItems = getLandSizeFromItems();
const landSizeToItems = getLandSizeToItems();
const priceFromItems = getPriceFromItems();
const priceToItems = getPriceToItems();

const initialPropertyLayers: Record<string, PropertyLayerState> = {};
PROPERTY_TYPES.forEach((pt) => {
  initialPropertyLayers[pt] = {
    propType: pt,
    pointLayer: null,
    layerManagerId: null,
    visible: true,
  };
});

export const useCREStore = create<CREState>()(
  immer((set) => ({
    // Initial filter values
    selectedType: types[0],
    incentiveChecked: false,
    onlyInMapChecked: false,
    searchMode: "BuildingSize",
    selectedBuildingSpaceFrom: buildingSpaceFromItems[0],
    selectedBuildingSpaceTo: buildingSpaceToItems[0],
    selectedLandSizeFrom: landSizeFromItems[0],
    selectedLandSizeTo: landSizeToItems[0],
    selectedPriceFrom: priceFromItems[0],
    selectedPriceTo: priceToItems[0],

    // Property layers
    propertyLayers: initialPropertyLayers,

    // Results
    allResults: [],
    numRecords: 0,
    isLoading: false,

    // Active tab
    activeTab: 0,

    // Actions
    setSelectedType: (type) =>
      set((state) => {
        state.selectedType = type;
      }),
    setIncentiveChecked: (checked) =>
      set((state) => {
        state.incentiveChecked = checked;
      }),
    setOnlyInMapChecked: (checked) =>
      set((state) => {
        state.onlyInMapChecked = checked;
      }),
    setSearchMode: (mode) =>
      set((state) => {
        state.searchMode = mode;
      }),
    setBuildingSpaceFrom: (option) =>
      set((state) => {
        state.selectedBuildingSpaceFrom = option;
      }),
    setBuildingSpaceTo: (option) =>
      set((state) => {
        state.selectedBuildingSpaceTo = option;
      }),
    setLandSizeFrom: (option) =>
      set((state) => {
        state.selectedLandSizeFrom = option;
      }),
    setLandSizeTo: (option) =>
      set((state) => {
        state.selectedLandSizeTo = option;
      }),
    setPriceFrom: (option) =>
      set((state) => {
        state.selectedPriceFrom = option;
      }),
    setPriceTo: (option) =>
      set((state) => {
        state.selectedPriceTo = option;
      }),
    setPropertyLayerVisible: (propType, visible) =>
      set((state) => {
        if (state.propertyLayers[propType]) {
          state.propertyLayers[propType].visible = visible;
        }
      }),
    setPropertyLayer: (propType, layer, layerManagerId) =>
      set((state) => {
        if (state.propertyLayers[propType]) {
          state.propertyLayers[propType].pointLayer = layer; // immer draft
          state.propertyLayers[propType].layerManagerId = layerManagerId;
        }
      }),
    setResults: (results, count) =>
      set((state) => {
        state.allResults = results;
        state.numRecords = count;
      }),
    appendResults: (results) =>
      set((state) => {
        state.allResults = [...state.allResults, ...results];
        state.numRecords = state.allResults.length;
      }),
    clearResults: () =>
      set((state) => {
        state.allResults = [];
        state.numRecords = 0;
      }),
    setIsLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),
    setActiveTab: (tab) =>
      set((state) => {
        state.activeTab = tab;
      }),
    reset: () =>
      set((state) => {
        state.selectedType = types[0];
        state.incentiveChecked = false;
        state.onlyInMapChecked = false;
        state.searchMode = "BuildingSize";
        state.selectedBuildingSpaceFrom = buildingSpaceFromItems[0];
        state.selectedBuildingSpaceTo = buildingSpaceToItems[0];
        state.selectedLandSizeFrom = landSizeFromItems[0];
        state.selectedLandSizeTo = landSizeToItems[0];
        state.selectedPriceFrom = priceFromItems[0];
        state.selectedPriceTo = priceToItems[0];
        state.allResults = [];
        state.numRecords = 0;
        state.isLoading = false;
        state.activeTab = 0;
        // Restore all property type layers to visible
        PROPERTY_TYPES.forEach((pt) => {
          if (state.propertyLayers[pt]) {
            state.propertyLayers[pt].visible = true;
          }
        });
      }),
  })),
);
