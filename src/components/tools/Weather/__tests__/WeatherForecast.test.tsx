import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import WeatherForecast from "../WeatherForecast";


const sampleCity = {
  siteData: {
    location: { name: { "#text": "Test City" } },
    forecastGroup: { forecast: [{ period: "Today", textSummary: "Sunny" }] },
  },
  forecastUrl: "https://example.com/forecast",
};

describe("WeatherForecast", () => {
  beforeEach(() => {
    // Provide a base API URL expected by component without replacing `window`
    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).window.config = { apiUrl: "http://localhost/" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => sampleCity })),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and displays forecasts", async () => {
    render(<WeatherForecast />);

    await waitFor(() => expect(screen.getByText("Weather Forecast")).toBeTruthy());

    // At least one forecast entry should be rendered
    expect(screen.getAllByText(/Full Forecast|3-Day Forecast|Loading forecasts/).length).toBeGreaterThan(0);
  });
});
