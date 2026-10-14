import type { Layer } from "ol/layer";
import { useTOCStore, type TOCLayer } from "@/stores/tocStore";
import { useLayerRefreshStore } from "@/stores/layerRefreshStore";
import { useLayerTimeStore } from "@/stores/layerTimeStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { TIME_VALUE_APPLIER_PROPERTY, getTimeCount, getTimeValueAt, type TimeValueApplier } from "@/utils/timeDimension";

interface ParamSource {
  updateParams: (params: Record<string, unknown>) => void;
}

const timers = new Map<string, ReturnType<typeof setInterval>>();

const findTOCLayer = (layerId: string): TOCLayer | undefined => useTOCStore.getState().allLayers.find((layer) => layer.id === layerId);

const getOLLayer = (layer: TOCLayer): Layer | null => (layer.managedLayerId ? (LayerManager.getLayer(layer.managedLayerId)?.layer ?? null) : null);

const getParamSource = (olLayer: Layer | null): ParamSource | null => {
  const source: unknown = olLayer?.getSource();
  return typeof (source as ParamSource | null)?.updateParams === "function" ? (source as ParamSource) : null;
};

const getTimeApplier = (olLayer: Layer | null): TimeValueApplier | null => {
  const paramSource = getParamSource(olLayer);
  if (paramSource) return (value) => paramSource.updateParams({ TIME: value });
  return (olLayer?.get(TIME_VALUE_APPLIER_PROPERTY) as TimeValueApplier | undefined) ?? null;
};

const canStepLayer = (layer: TOCLayer, olLayer: Layer | null): boolean => (layer.timeDimension ? getTimeApplier(olLayer) !== null : getParamSource(olLayer) !== null);

export function canRefreshLayer(layer: TOCLayer): boolean {
  return (layer.refreshInterval ?? 0) > 0 && canStepLayer(layer, getOLLayer(layer));
}

function getTimeIndex(layer: TOCLayer): number {
  return useLayerTimeStore.getState().indexes[layer.id] ?? layer.timeDimension?.defaultIndex ?? 0;
}

export function setTimeIndex(layerId: string, index: number): void {
  const layer = findTOCLayer(layerId);
  const timeDimension = layer?.timeDimension;
  const applyTimeValue = getTimeApplier(layer ? getOLLayer(layer) : null);
  if (!timeDimension || !applyTimeValue) return;

  const count = getTimeCount(timeDimension);
  const wrappedIndex = ((index % count) + count) % count;
  useLayerTimeStore.getState().setIndex(layerId, wrappedIndex);
  applyTimeValue(getTimeValueAt(timeDimension, wrappedIndex));
}

function stopTimer(layerId: string): void {
  const timer = timers.get(layerId);
  if (timer === undefined) return;
  clearInterval(timer);
  timers.delete(layerId);
  useLayerRefreshStore.getState().setPlaying(layerId, false);
}

function tick(layerId: string): void {
  const layer = findTOCLayer(layerId);
  const olLayer = layer ? getOLLayer(layer) : null;
  if (!layer || !olLayer || !olLayer.getVisible() || !canStepLayer(layer, olLayer)) {
    stopTimer(layerId);
    return;
  }

  if (layer.timeDimension) {
    setTimeIndex(layerId, getTimeIndex(layer) + 1);
    return;
  }

  getParamSource(olLayer)?.updateParams({ _refresh: Date.now() });
}

export function startLayerRefresh(layerId: string): void {
  const layer = findTOCLayer(layerId);
  if (!layer || !layer.visible || timers.has(layerId) || !canRefreshLayer(layer)) return;

  timers.set(
    layerId,
    setInterval(() => tick(layerId), (layer.refreshInterval ?? 0) * 1000),
  );
  useLayerRefreshStore.getState().setPlaying(layerId, true);
}

export function stopLayerRefresh(layerId: string): void {
  stopTimer(layerId);
}

export function toggleLayerRefresh(layerId: string): void {
  if (timers.has(layerId)) {
    stopTimer(layerId);
  } else {
    startLayerRefresh(layerId);
  }
}

export function startGroupRefresh(layers: TOCLayer[]): void {
  layers.forEach((layer) => startLayerRefresh(layer.id));
}

export function stopGroupRefresh(layers: TOCLayer[]): void {
  layers.forEach((layer) => stopTimer(layer.id));
}

export function handleTOCVisibilityChange(current: { allLayers: TOCLayer[] }, previous: { allLayers: TOCLayer[] }): void {
  if (current.allLayers === previous.allLayers || !current.allLayers.some((layer) => (layer.refreshInterval ?? 0) > 0)) return;

  const previousVisible = new Map(previous.allLayers.map((layer) => [layer.id, layer.visible]));
  current.allLayers.forEach((layer) => {
    if ((layer.refreshInterval ?? 0) <= 0) return;
    const wasVisible = previousVisible.get(layer.id);
    if (wasVisible === false && layer.visible) startLayerRefresh(layer.id);
    else if (wasVisible === true && !layer.visible) stopLayerRefresh(layer.id);
  });
}

useTOCStore.subscribe(handleTOCVisibilityChange);
