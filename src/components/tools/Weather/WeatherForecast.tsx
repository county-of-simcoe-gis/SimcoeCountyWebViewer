"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaSyncAlt, FaTimes } from "react-icons/fa";
import config from "./config.json";
import { apiUrl } from "@/lib/axiosInstance";

type CityConfig = {
  code: string;
  forecastUrl: string;
  name?: string;
};

type CityApiResult = {
  siteData?: Record<string, unknown>;
  forecastUrl?: string; // injected
  [k: string]: unknown;
};

type WeatherForecastProps = {
  onClose?: () => void;
};


function iconUrl(code?: string): string {
  return code ? `https://weather.gc.ca/weathericons/small/${code}.png` : "";
}

function warningClass(type: string, priority: string): string {
  if (type === "ENDED") return "bg-success text-success-content";

  switch (priority) {
    case "high":
      return "bg-error text-error-content";
    case "medium":
      return "bg-warning text-warning-content";
    case "low":
    default:
      return "bg-neutral text-neutral-content";
  }
}

export default function WeatherForecast(props: WeatherForecastProps): React.ReactElement {
  const cities = useMemo(() => (config.cities ?? []) as CityConfig[], []);
  const [cityInfo, setCityInfo] = useState<CityApiResult[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const urlForCity = useCallback((cityCode: string) => {
    return apiUrl(`/api/public/map/tool/weather/${cityCode}`);
  }, []);

  const refreshWeather = useCallback(async () => {
    setIsRefreshing(true);
    setCityInfo([]);

    const results = await Promise.allSettled(
      cities.map(async (c) => {
        const url = urlForCity(c.code);

        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${c.code}`);

        const json = (await res.json()) as CityApiResult;
        json.forecastUrl = c.forecastUrl;
        return { code: c.code, data: json };
      }),
    );

    const byCode = new Map<string, CityApiResult>();
    for (const r of results) {
      if (r.status === "fulfilled") byCode.set(r.value.code, r.value.data);
      else console.error("Weather fetch error:", r.reason);
    }

    const ordered = cities.map((c) => byCode.get(c.code)).filter((x): x is CityApiResult => !!x);

    setCityInfo(ordered);
    setIsRefreshing(false);
  }, [cities, urlForCity]);

  useEffect(() => {
    refreshWeather();
  }, [refreshWeather]);

  const onClose = useCallback(() => {
    props.onClose?.();
  }, [props]);

  return (
    <div
      className="
        p-2
        space-y-3
        bg-base-100
      "
    >
      <div className="flex items-center justify-between px-1">
        <div className="font-semibold text-sm">Weather Forecast</div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-xs btn-outline btn-primary" onClick={refreshWeather} disabled={isRefreshing} aria-label="Refresh forecasts" title="Refresh">
            <FaSyncAlt className={isRefreshing ? "animate-spin" : ""} />
          </button>

          {props.onClose && (
            <button type="button" className="btn btn-xs btn-ghost" onClick={onClose} title="Close">
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {cityInfo.length === 0 && (
        <div className="card bg-base-100 shadow-md border border-base-300">
          <div className="card-body p-4 flex items-center justify-center gap-2">
            <span className="loading loading-spinner loading-sm" />
            <span className="text-sm text-base-content/70">Loading forecasts…</span>
          </div>
        </div>
      )}

      {cityInfo.map((city) => (
        <Forecast key={city?.siteData?.location?.name?.["#text"] ?? city?.forecastUrl ?? crypto.randomUUID()} info={city} />
      ))}
    </div>
  );
}

function Forecast({ info }: { info: CityApiResult }): React.ReactElement {
  const { siteData, forecastUrl } = info;

  const forecast1 = siteData?.forecastGroup?.forecast?.[0];
  const forecast2 = siteData?.forecastGroup?.forecast?.[1];
  const forecast3 = siteData?.forecastGroup?.forecast?.[2];

  const warnings = siteData?.warnings;
  let warningEvents: Record<string, unknown>[] = [];
  let warningUrl = "";

  if (warnings !== "" && warnings != null) {
    try {
      warningUrl = warnings?.event?.$?.url ?? "";
      const ev = warnings?.event;
      warningEvents = Array.isArray(ev) ? ev : ev ? [ev] : [];
    } catch (e) {
      console.error("Weather Forecast Warning Error:", e);
    }
  }

  const hasTwoWarnings = warningEvents.length === 2;
  const cityName = siteData?.location?.name?.["#text"];
  const dt = siteData?.forecastGroup?.dateTime?.[1]?.textSummary;

  return (
    <div className="relative">
      {/* Date/time label */}
      <div className="text-[10px] text-base-content/70 text-right pr-2 mb-1">{dt}</div>

      <div className="card bg-base-100 shadow-md border border-base-300">
        <div className="card-body p-3">
          {/* City name (legend) */}
          <div className="font-bold text-base mb-2">{cityName}</div>

          {/* Warnings (advisories) - preserve original container behavior */}
          <div className={warningEvents.length === 0 ? "hidden" : "w-full h-[25px] mb-[5px] text-center font-bold leading-[27px] cursor-pointer text-[11pt]"}>
            {warningEvents.map((event, idx) => (
              <Warning key={`${event?.$?.type ?? "event"}-${idx}`} info={event} url={warningUrl} />
            ))}
          </div>

          {/* Forecast cells */}
          <div className={hasTwoWarnings ? "mt-[30px]" : ""}>
            <div className="grid grid-cols-3 gap-2">
              <DayCell
                title={forecast1?.textSummary}
                period={forecast1?.period?.textForecastName}
                icon={iconUrl(forecast1?.abbreviatedForecast?.iconCode?.["#text"])}
                temp={forecast1?.temperatures?.temperature?.["#text"]}
                summary={forecast1?.abbreviatedForecast?.textSummary}
              />
              <DayCell
                title={forecast2?.textSummary}
                period={forecast2?.period?.textForecastName}
                icon={iconUrl(forecast2?.abbreviatedForecast?.iconCode?.["#text"])}
                temp={forecast2?.temperatures?.temperature?.["#text"]}
                summary={forecast2?.abbreviatedForecast?.textSummary}
              />
              <DayCell
                title={forecast3?.textSummary}
                period={forecast3?.period?.textForecastName}
                icon={iconUrl(forecast3?.abbreviatedForecast?.iconCode?.["#text"])}
                temp={forecast3?.temperatures?.temperature?.["#text"]}
                summary={forecast3?.abbreviatedForecast?.textSummary}
              />
            </div>
          </div>

          {/* View forecast link */}
          <div className="card-actions justify-center mt-2">
            <a href={forecastUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline btn-primary w-full">
              View Full Forecast
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayCell({ title, period, icon, temp, summary }: { title?: string; period?: string; icon?: string; temp?: string; summary?: string }): React.ReactElement {
  return (
    <div
      title={title}
      className="
        border border-base-300
        rounded-lg
        p-2
        h-[140px]
        grid
        place-items-center
        text-center
        bg-base-200
      "
    >
      <div className="text-xs font-semibold">{period}</div>

      {icon ? <img src={icon} alt="icon" className="w-10 h-10" /> : <div className="w-10 h-10 skeleton" />}

      <div className="text-sm font-bold">{temp}</div>

      <div className="text-[11px] leading-tight text-base-content/80 line-clamp-3">{summary}</div>
    </div>
  );
}

function Warning({ info, url }: { info: Record<string, unknown>; url: string }): React.ReactElement {
  const type = (info?.$?.type ?? "").toString().toUpperCase();
  const priority = (info?.$?.priority ?? "").toString();
  const description = (info?.$?.description ?? "").toString();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        ${warningClass(type, priority)}
        w-full
        rounded-md
        px-3 py-2
        font-bold
        text-sm
        text-center
        block
        hover:opacity-90
      `}
    >
      {type}: {description}
    </a>
  );
}
