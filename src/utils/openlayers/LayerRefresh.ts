import type { Layer } from "ol/layer";
import { useTOCStore, type TOCLayer } from "@/stores/tocStore";
import { useLayerRefreshStore } from "@/stores/layerRefreshStore";
import { LayerManager } from "@/utils/openlayers/LayerManager";

interface ParamSource {
  updateParams: (params: Record<string, unknown>) => void;
}

const timers = new Map<string, ReturnType<typeof setInterval>>();
const timeStepIndex = new Map<string, number>();

const findTOCLayer = (layerId: string): TOCLayer | undefined => useTOCStore.getState().allLayers.find((layer) => layer.id === layerId);

const getOLLayer = (layer: TOCLayer): Layer | null => (layer.managedLayerId ? (LayerManager.getLayer(layer.managedLayerId)?.layer ?? null) : null);

const getParamSource = (olLayer: Layer | null): ParamSource | null => {
  const source: unknown = olLayer?.getSource();
  return typeof (source as ParamSource | null)?.updateParams === "function" ? (source as ParamSource) : null;
};

export function canRefreshLayer(layer: TOCLayer): boolean {
  return (layer.refreshInterval ?? 0) > 0 && getParamSource(getOLLayer(layer)) !== null;
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
  const paramSource = getParamSource(olLayer);
  if (!layer || !olLayer || !paramSource || !olLayer.getVisible()) {
    stopTimer(layerId);
    return;
  }

  if (layer.timeValues && layer.timeValues.length > 0) {
    const nextIndex = ((timeStepIndex.get(layerId) ?? -1) + 1) % layer.timeValues.length;
    timeStepIndex.set(layerId, nextIndex);
    paramSource.updateParams({ TIME: layer.timeValues[nextIndex] });
    return;
  }

  paramSource.updateParams({ _refresh: Date.now() });
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
