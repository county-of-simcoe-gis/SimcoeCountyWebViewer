"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { FaSyncAlt, FaPlay, FaPause } from "react-icons/fa";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import ImageLayer from "ol/layer/Image";
import Static from "ol/source/ImageStatic";
import { addLayer, removeLayer, getLayer } from "@/utils/openlayers/LayerManager";

import { getRadarImages, type RadarImage } from "@/lib/weather";
import { useToast } from "@/hooks/useToast";

const tzoffset = new Date().getTimezoneOffset() * 60000;
const TEN_MIN_MS = 10 * 60 * 1000;

type TimeSetting = "last3hours" | "custom";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function roundTo10Minutes(dt: Date): Date {
  const ms = dt.getTime();
  const rounded = Math.round(ms / TEN_MIN_MS) * TEN_MIN_MS;
  return new Date(rounded);
}

function formatDateForApiLegacy(dt: Date): string {
  return dt.getFullYear() + "-" + pad2(dt.getMonth() + 1) + "-" + pad2(dt.getDate()) + " " + pad2(dt.getHours()) + ":" + pad2(dt.getMinutes()) + ":" + pad2(dt.getSeconds());
}

function extractFrame(img: RadarImage): { url: string; extent: [number, number, number, number] } | null {
  if (img?.imageUrl && Array.isArray(img?.extent) && img.extent.length === 4) {
    return { url: String(img.imageUrl), extent: img.extent };
  }
  const raw = img?.JS_MAPIMAGE ?? img?.js_mapimage;
  if (!raw) return null;

  try {
    const js = typeof raw === "string" ? JSON.parse(raw) : raw;
    const e = js?.extent;
    const href = js?.href;
    if (!href || !e) return null;

    const url = String(href).replace("http:", "https:");
    const extent: [number, number, number, number] = [e.xmin, e.ymin, e.xmax, e.ymax];
    return { url, extent };
  } catch {
    return null;
  }
}

function getRadarCode(img: RadarImage): string {
  return String(img?.RADAR_STATION_CODE ?? img?.RADAR_CODE ?? img?.radarCode ?? "");
}

function getRadarDate(img: RadarImage): Date | null {
  const d = img?.RADAR_DATE ?? img?.radarDate ?? img?.date;
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return new Date(dt.valueOf() + tzoffset);
}

export default function WeatherRadar(): React.ReactElement {
  // single managed layer id (from LayerManager) or fallback OL layer
  const layerIdRef = useRef<string | null>(null);
  const toast = useToast();
  const fallbackOlLayerRef = useRef<ImageLayer<Static> | null>(null);
  // frame lookup: key = `${time.getTime()}_${code}` -> frame info
  const frameLookupRef = useRef<Map<string, { url: string; extent: [number, number, number, number]; date: Date; code: string; timeId?: string | number }>>(new Map());
  const refreshIntervalRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  const instanceIdRef = useRef<string>(crypto.randomUUID()); // ✅ tag layers per instance
  const lastFetchKeyRef = useRef<string>(""); // ✅ prevent unnecessary refetch loops
  const lastFetchTimeRef = useRef<number>(0);

  const initialNow = useMemo(() => roundTo10Minutes(new Date()), []);
  const [timeSetting, setTimeSetting] = useState<TimeSetting>("last3hours");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [startDate, setStartDate] = useState<Date>(() => roundTo10Minutes(new Date(initialNow.getTime() - 3 * 60 * 60 * 1000)));
  const [endDate, setEndDate] = useState<Date>(initialNow);

  const [radarDate, setRadarDate] = useState<Date>(initialNow);
  const radarDateRef = useRef<Date>(initialNow);

  const [opacity, setOpacity] = useState(0.7);

  const [CASKR, setCASKR] = useState(true);
  const [CASBI, setCASBI] = useState(false);
  const [CASET, setCASET] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);

  // playback: frame-by-frame (real images)
  const frameDatesRef = useRef<Date[]>([]);
  const playTimerRef = useRef<number | null>(null);
  const PLAY_MS = 250; // ✅ adjust playback speed here

  const computeRange = useCallback((): { from: Date; to: Date } => {
    if (timeSetting === "last3hours") {
      const now = roundTo10Minutes(new Date());
      const from = roundTo10Minutes(new Date(now.getTime() - 3 * 60 * 60 * 1000));
      return { from, to: now };
    }
    return { from: startDate, to: endDate };
  }, [timeSetting, startDate, endDate]);

  const updateRadarDate = useCallback((d: Date) => {
    radarDateRef.current = d;
    setRadarDate(d);
  }, []);

  useEffect(() => {
    radarDateRef.current = radarDate;
  }, [radarDate]);

  const clearLayers = useCallback(() => {
    // Remove single managed layer via LayerManager first
    try {
      if (layerIdRef.current) {
        try {
          removeLayer(layerIdRef.current);
        } catch {}
        layerIdRef.current = null;
      }
    } catch {}

    // As a safety-net, also scan map for any leftover layers tagged with this instance id
    try {
      const map = (window as unknown as { map?: import("ol/Map").default }).map;
      if (map) {
        const allLayers = map.getLayers?.().getArray?.() ?? [];
        for (const l of allLayers) {
          try {
            if (l?.get?.("__wr_instance") === instanceIdRef.current) map.removeLayer(l);
          } catch {}
        }
      }
    } catch {}

    // clear fallback OL layer reference
    fallbackOlLayerRef.current = null;
    frameLookupRef.current.clear();
    frameDatesRef.current = [];
  }, []);

  const applyVisibility = useCallback(() => {
    const selected = new Set<string>();
    if (CASKR) selected.add("CASKR");
    if (CASBI) selected.add("CASBI");
    if (CASET) selected.add("CASET");

    const target = radarDateRef.current;
    // Single layer: find a matching frame for current date + selected code
    try {
      const codes = Array.from(selected);
      if (codes.length === 0) {
        // nothing selected -> hide layer
        if (layerIdRef.current) {
          const managed = getLayer(layerIdRef.current) as { layer?: ImageLayer<Static> } | null;
          const layer = managed?.layer ?? null;
          if (layer) layer.setVisible(false);
        } else if (fallbackOlLayerRef.current) {
          fallbackOlLayerRef.current.setVisible(false);
        }
        return;
      }

      // prefer first selected code (UI allows multiple, but showing one layer)
      const preferred = codes[0];
      const key = `${target.getTime()}_${preferred}`;
      const frame = frameLookupRef.current.get(key) ?? null;

      if (frame) {
        // ensure layer shows this frame
        const applyFrame = (layer: ImageLayer<Static>) => {
          try {
            layer.setVisible(true);
            layer.setProperties({ radarCode: frame.code, radarDate: frame.date, timeId: frame.timeId });
            const src = new Static({ url: frame.url, projection: "EPSG:3857", imageExtent: frame.extent });
            layer.setSource(src);
            if (layer.setOpacity) layer.setOpacity(opacity);
          } catch {}
        };

        if (layerIdRef.current) {
          const managed = getLayer(layerIdRef.current) as { layer?: ImageLayer<Static> } | null;
          const layer = managed?.layer ?? null;
          if (layer) applyFrame(layer);
        } else if (fallbackOlLayerRef.current) {
          applyFrame(fallbackOlLayerRef.current);
        }
      } else {
        // no matching frame -> hide layer
        if (layerIdRef.current) {
          const managed = getLayer(layerIdRef.current) as { layer?: ImageLayer<Static> } | null;
          const layer = managed?.layer ?? null;
          if (layer) layer.setVisible(false);
        } else if (fallbackOlLayerRef.current) {
          fallbackOlLayerRef.current.setVisible(false);
        }
      }
    } catch {}
  }, [CASKR, CASBI, CASET, opacity]);

  useEffect(() => {
    applyVisibility();
  }, [radarDate, CASKR, CASBI, CASET, applyVisibility]);

  useEffect(() => {
    try {
      if (layerIdRef.current) {
        const managed = getLayer(layerIdRef.current) as { layer?: ImageLayer<Static> } | null;
        const layer = managed?.layer ?? null;
        if (layer && layer.setOpacity) layer.setOpacity(opacity);
      } else if (fallbackOlLayerRef.current && fallbackOlLayerRef.current.setOpacity) {
        fallbackOlLayerRef.current.setOpacity(opacity);
      }
    } catch {}
  }, [opacity]);

  const fetchRadarImages = useCallback(
    async (reason: "mount" | "manual" | "interval" | "update" = "manual") => {
      const map = (window as unknown as { map?: import("ol/Map").default }).map;
      if (!map) return;

      // Throttle: avoid rapid repeated fetches (e.g., UI stuck firing events)
      const now = Date.now();
      if (now - lastFetchTimeRef.current < 800) return;
      lastFetchTimeRef.current = now;

      // Don't refetch while playing (legacy doesn't refresh mid-animation)
      if (isPlayingRef.current) return;

      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setIsLoading(true);

      try {
        const { from, to } = computeRange();

        // ✅ dedupe fetches: if same range and we already have a layer, skip
        const fetchKey = `${from.getTime()}_${to.getTime()}_${timeSetting}`;
        if (fetchKey === lastFetchKeyRef.current && (layerIdRef.current !== null || fallbackOlLayerRef.current !== null) && reason !== "manual") {
          setIsLoading(false);
          inFlightRef.current = false;
          return;
        }
        lastFetchKeyRef.current = fetchKey;

        const fromStr = formatDateForApiLegacy(from);
        const toStr = formatDateForApiLegacy(to);

        const result = (await getRadarImages(fromStr, toStr)) as RadarImage[];

        // clear existing frames and store new frame lookup
        clearLayers();
        frameLookupRef.current.clear();
        const frameDates: Date[] = [];

        for (const img of result ?? []) {
          const frame = extractFrame(img);
          const d = getRadarDate(img);
          const code = getRadarCode(img);
          if (!frame || !d || !code) continue;

          const entry = {
            url: frame.url,
            extent: frame.extent,
            date: d,
            code,
            timeId: (img as RadarImage & { TIME_ID?: string; timeId?: string }).TIME_ID ?? (img as RadarImage & { timeId?: string }).timeId,
          };
          const key = `${d.getTime()}_${code}`;
          frameLookupRef.current.set(key, entry);
          frameDates.push(d);
        }

        // Build frame list for playback + slider snapping
        frameDates.sort((a, b) => a.getTime() - b.getTime());
        frameDatesRef.current = frameDates;

        // If we have frames, ensure a single layer exists and point it at the last frame
        if (frameDatesRef.current.length > 0) {
          const last = frameDatesRef.current[frameDatesRef.current.length - 1];
          // pick preferred code if available
          const preferredCode = getRadarCode(result?.[result.length - 1] ?? {}) || Array.from(new Set(Array.from(frameLookupRef.current.values()).map((f) => f.code)))[0];
          const lastKey = `${last.getTime()}_${preferredCode}`;
          const lastFrame = frameLookupRef.current.get(lastKey) ?? Array.from(frameLookupRef.current.values())[0];

          if (lastFrame) {
            // create or update the single layer
            if (!layerIdRef.current && !fallbackOlLayerRef.current) {
              const layer = new ImageLayer({
                source: new Static({ url: lastFrame.url, projection: "EPSG:3857", imageExtent: lastFrame.extent }),
                zIndex: 10000,
                visible: true,
                opacity,
              });
              layer.setProperties({ radarCode: lastFrame.code, radarDate: lastFrame.date, timeId: lastFrame.timeId, __wr_instance: instanceIdRef.current });

              try {
                const layerId = addLayer(layer, "Tools" as unknown as import("@/stores/layerManagerStore").LayerCategory, "Weather Radar", {
                  visible: true,
                  opacity,
                  metadata: { source: "weatherRadar", instance: instanceIdRef.current },
                });
                if (layerId) {
                  layerIdRef.current = layerId;
                } else {
                  map.addLayer(layer);
                  fallbackOlLayerRef.current = layer;
                }
              } catch {
                try {
                  map.addLayer(layer);
                  fallbackOlLayerRef.current = layer;
                } catch {}
              }
            } else {
              // update existing layer source to lastFrame
              try {
                if (layerIdRef.current) {
                  const managed = getLayer(layerIdRef.current) as { layer?: ImageLayer<Static> } | null;
                  const layer = managed?.layer ?? null;
                  if (layer) {
                    const src = new Static({ url: lastFrame.url, projection: "EPSG:3857", imageExtent: lastFrame.extent });
                    layer.setSource(src);
                    layer.setProperties({ radarCode: lastFrame.code, radarDate: lastFrame.date, timeId: lastFrame.timeId });
                    if (layer.setOpacity) layer.setOpacity(opacity);
                  }
                } else if (fallbackOlLayerRef.current) {
                  const layer = fallbackOlLayerRef.current;
                  const src = new Static({ url: lastFrame.url, projection: "EPSG:3857", imageExtent: lastFrame.extent });
                  layer.setSource(src);
                  layer.setProperties({ radarCode: lastFrame.code, radarDate: lastFrame.date, timeId: lastFrame.timeId });
                  if (layer.setOpacity) layer.setOpacity(opacity);
                }
              } catch {}
            }
          }
        }

        // Sync UI dates for last3hours without causing fetch loops
        if (timeSetting === "last3hours") {
          const nowRange = computeRange();
          setStartDate(nowRange.from);
          setEndDate(nowRange.to);
        }

        // Default radar date = last frame (legacy)
        if (frameDatesRef.current.length > 0) {
          updateRadarDate(frameDatesRef.current[frameDatesRef.current.length - 1]);
        }

        applyVisibility();
      } catch (err) {
        console.error("Radar fetch error:", err);
      } finally {
        setIsLoading(false);
        inFlightRef.current = false;
      }
    },
    [applyVisibility, clearLayers, computeRange, opacity, timeSetting, updateRadarDate],
  );

  // Mount + auto refresh interval
  useEffect(() => {
    fetchRadarImages("mount");

    if (refreshIntervalRef.current) {
      window.clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (autoRefresh) {
      refreshIntervalRef.current = window.setInterval(() => {
        fetchRadarImages("interval");
      }, 60000);
    }

    return () => {
      if (refreshIntervalRef.current) window.clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    };
  }, [autoRefresh, fetchRadarImages]);

  // Full cleanup on unmount (or tool close)
  useEffect(() => {
    return () => {
      // stop play
      isPlayingRef.current = false;
      if (playTimerRef.current) window.clearInterval(playTimerRef.current);
      playTimerRef.current = null;

      // stop refresh
      if (refreshIntervalRef.current) window.clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;

      // remove layers
      clearLayers();
    };
  }, [clearLayers]);

  // Playback: frame-by-frame (real frames) at PLAY_MS
  useEffect(() => {
    isPlayingRef.current = isPlaying;

    if (playTimerRef.current) window.clearInterval(playTimerRef.current);
    playTimerRef.current = null;

    if (!isPlaying) return;
    if (frameDatesRef.current.length === 0) return;

    // pause auto refresh while playing to avoid churn
    if (refreshIntervalRef.current) {
      window.clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    let idx = Math.max(
      0,
      frameDatesRef.current.findIndex((d) => d.getTime() === radarDateRef.current.getTime()),
    );
    if (idx < 0) idx = 0;

    playTimerRef.current = window.setInterval(() => {
      if (!isPlayingRef.current) return;

      idx = (idx + 1) % frameDatesRef.current.length;
      updateRadarDate(frameDatesRef.current[idx]);
    }, PLAY_MS);

    return () => {
      if (playTimerRef.current) window.clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    };
  }, [isPlaying, updateRadarDate]);

  // Slider: snap to actual frames (not every 10 minutes)
  const sliderMax = Math.max(0, frameDatesRef.current.length - 1);

  const sliderValue = useMemo(() => {
    const idx = frameDatesRef.current.findIndex((d) => d.getTime() === radarDate.getTime());
    return idx >= 0 ? idx : sliderMax;
  }, [radarDate, sliderMax]);

  const onSliderChange = (val: number | number[]) => {
    const idx = typeof val === "number" ? val : val[0];
    const d = frameDatesRef.current[idx];
    if (d) updateRadarDate(d);
  };

  const handleUpdate = () => {
    if (timeSetting !== "custom") return;

    if (endDate < startDate) {
      toast.warning("Start Date needs to be before End Date");
      return;
    }

    const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 5) {
      toast.warning("Cannot display more than 5 days of radar.");
      return;
    }

    fetchRadarImages("update");
  };

  return (
    <div className="p-3 space-y-3 bg-base-100">
      <div className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.target.checked)}
          disabled={isPlaying}
          title={isPlaying ? "Auto refresh disabled while playing" : ""}
        />
        <span className="text-sm">Automatically refresh every minute.</span>

        <button className="btn btn-xs btn-outline ml-auto" onClick={() => fetchRadarImages("manual")} disabled={isPlaying} aria-label="Refresh radar" title="Refresh now">
          <FaSyncAlt className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="divider my-1" />

      <div className="space-y-2">
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            className="btn btn-xs btn-primary"
            onClick={() => setIsPlaying((p) => !p)}
            disabled={frameDatesRef.current.length === 0}
            aria-label={isPlaying ? "Pause playback" : "Play playback"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>

          <div className="flex-1 px-2">
            <Slider max={sliderMax} value={sliderValue} onChange={onSliderChange} />
          </div>
        </div>

        <div className="text-xs text-base-content/70">
          <span className="font-semibold">Radar Date:</span> {formatDateForApiLegacy(radarDate)}
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm">
            <span className="loading loading-spinner loading-xs" />
            <span>Loading radar…</span>
          </div>
        )}
      </div>

      <div className="p-3 rounded-lg border border-base-300 bg-base-200 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="text-sm font-semibold">Time Settings:</span>
          <label className="label cursor-pointer justify-start gap-2 p-0">
            <input type="radio" name="timesetting" className="radio radio-sm" checked={timeSetting === "last3hours"} onChange={() => setTimeSetting("last3hours")} disabled={isPlaying} />
            <span className="label-text">Last 3 Hours</span>
          </label>
          <label className="label cursor-pointer justify-start gap-2 p-0">
            <input type="radio" name="timesetting" className="radio radio-sm" checked={timeSetting === "custom"} onChange={() => setTimeSetting("custom")} disabled={isPlaying} />
            <span className="label-text">Custom</span>
          </label>
        </div>

        <div className={timeSetting === "last3hours" ? "opacity-50 pointer-events-none" : ""}>
          <div className="flex items-start gap-2 ">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <span className="text-sm font-semibold">Start:</span>
              <DatePicker
                className="input input-xs input-bordered"
                selected={startDate}
                onChange={(value: Date | null) => {
                  if (!value) return;
                  const v = roundTo10Minutes(value);
                  if (v < endDate) setStartDate(v);
                  else toast.warning("Start Date needs to be before End Date");
                }}
                popperPlacement="bottom"
                popperModifiers={{
                  flip: { behavior: ["bottom"] },
                  preventOverflow: { enabled: false },
                  hide: { enabled: false },
                }}
                showTimeSelect
                timeIntervals={10}
                dateFormat="MMM d, yyyy h:mm aa"
              />
              <span className="text-sm font-semibold">End:</span>
              <DatePicker
                className="input input-xs input-bordered"
                selected={endDate}
                onChange={(value: Date | null) => {
                  if (!value) return;
                  const v = roundTo10Minutes(value);
                  if (v > startDate) setEndDate(v);
                  else toast.warning("End Date needs to be after Start Date");
                }}
                popperPlacement="bottom"
                popperModifiers={{
                  flip: { behavior: ["bottom"] },
                  hide: { enabled: false },
                }}
                showTimeSelect
                timeIntervals={10}
                dateFormat="MMM d, yyyy h:mm aa"
              />
            </div>
            <button className="btn btn-xs btn-outline shrink-0" onClick={handleUpdate} disabled={isPlaying}>
              Update
            </button>
          </div>
        </div>

        <div className="text-sm space-y-1">
          <label className="label cursor-pointer justify-start gap-2 p-0">
            <input type="checkbox" className="checkbox checkbox-sm" checked={CASKR} onChange={(e) => setCASKR(e.target.checked)} />
            <span className="label-text">CASKR (King City)</span>
          </label>
          <label className="label cursor-pointer justify-start gap-2 p-0">
            <input type="checkbox" className="checkbox checkbox-sm" checked={CASBI} onChange={(e) => setCASBI(e.target.checked)} />
            <span className="label-text">CASBI (Britt)</span>
          </label>
          <label className="label cursor-pointer justify-start gap-2 p-0">
            <input type="checkbox" className="checkbox checkbox-sm" checked={CASET} onChange={(e) => setCASET(e.target.checked)} />
            <span className="label-text">CASET (Exeter)</span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Opacity</div>
          <div className="badge badge-ghost">{Math.round(opacity * 100)}%</div>
        </div>
        <Slider included={false} max={1} min={0} step={0.01} value={opacity} onChange={(v: number | number[]) => setOpacity(typeof v === "number" ? v : v[0])} />
      </div>
      <div className="mt-3">
        <div className="flex gap-4 items-start">
          <div className="flex flex-col items-center text-xs">
            <div className="font-semibold">Rain (Summer)</div>
            <Image className="bg-black p-1" src="/images/radarlegendrain.png" alt="Rain legend" width={90} height={238} />
          </div>
          <div className="flex flex-col items-center text-xs">
            <div className="font-semibold">Snow (Winter)</div>
            <Image className="bg-black p-1" src="/images/radarlegendsnow.png" alt="Snow legend" width={90} height={238} />
          </div>
        </div>

        <div className="mt-2 border-t pt-2 text-[11px] text-center">
          <div>Weather Data Provided by Environment Canada</div>
          <div className="mt-1">
            <a href="https://weather.gc.ca/" target="_blank" rel="noreferrer">
              <Image src="https://weather.gc.ca/images/ecfip_e.gif" alt="Environment Canada" width={242} height={22} className="mt-1" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
