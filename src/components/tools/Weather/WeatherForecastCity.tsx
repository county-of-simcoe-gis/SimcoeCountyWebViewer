'use client';

import React from 'react';
import { getWarningColor, type WeatherWarning } from '@/lib/weather';

interface WeatherForecastCityProps {
  cityName: string;
  forecastUrl: string;
  currentTemperature: string;
  currentDescription: string;
  feelsLike: string;
  humidity: string;
  windSpeed: string;
  windDirection: string;
  forecast: Array<{
    period: string;
    summary: string;
    temperature: string;
    iconCode: string;
    imageUrl?: string;
  }>;
  warnings: WeatherWarning[];
}

export default function WeatherForecastCity({
  cityName,
  forecastUrl,
  currentTemperature,
  currentDescription,
  feelsLike,
  humidity,
  windSpeed,
  windDirection,
  forecast,
  warnings,
}: WeatherForecastCityProps): React.ReactElement {
  return (
    <div className="card bg-base-100 shadow-md mb-4">
      {/* Header with City Name */}
      <div className="card-body p-4">
        <h3 className="card-title text-lg font-bold mb-2">
          <a
            href={forecastUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary"
          >
            {cityName}
          </a>
        </h3>

        {/* Current Conditions */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-base-200 p-2 rounded">
            <div className="text-xs text-gray-600">Temperature</div>
            <div className="text-xl font-bold">{currentTemperature}</div>
          </div>
          <div className="bg-base-200 p-2 rounded">
            <div className="text-xs text-gray-600">Condition</div>
            <div className="text-sm font-semibold">{currentDescription}</div>
          </div>
          <div className="bg-base-200 p-2 rounded">
            <div className="text-xs text-gray-600">Feels Like</div>
            <div className="text-sm">{feelsLike}</div>
          </div>
          <div className="bg-base-200 p-2 rounded">
            <div className="text-xs text-gray-600">Humidity</div>
            <div className="text-sm">{humidity}</div>
          </div>
        </div>

        {/* Wind Information */}
        <div className="bg-base-200 p-2 rounded mb-4">
          <div className="text-xs text-gray-600 mb-1">Wind</div>
          <div className="text-sm">
            {windDirection} {windSpeed}
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="text-sm font-semibold text-yellow-700">⚠ Weather Alerts</div>
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className={`p-2 rounded text-xs font-semibold ${getWarningColor(warning.priority)}`}
              >
                {warning.text}
                {warning.link && (
                  <a
                    href={warning.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-sm ml-1"
                  >
                    Details →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Forecast Grid */}
        {forecast.length > 0 && (
          <div className="border-t border-base-300 pt-4">
            <div className="text-sm font-semibold mb-3">3-Day Forecast</div>
            <div className="grid grid-cols-1 gap-2">
              {forecast.map((f, idx) => (
                <div key={idx} className="bg-base-200 p-2 rounded">
                  <div className="font-semibold text-sm">{f.period}</div>
                  <div className="text-xs text-gray-600 mt-1">{f.summary}</div>
                  {f.temperature && (
                    <div className="text-sm font-bold mt-1">{f.temperature}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link to Full Forecast */}
        <div className="card-actions justify-end mt-4">
          <a
            href={forecastUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline btn-primary"
          >
            Full Forecast
          </a>
        </div>
      </div>
    </div>
  );
}
