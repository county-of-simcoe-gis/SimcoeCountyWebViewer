import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import WeatherForecastCity from "../WeatherForecastCity";

const props = {
  forecastUrl: "https://example.com/forecast",
  forecast: [
    { period: "Today", textSummary: "Sunny" },
    { period: "Tomorrow", textSummary: "Cloudy" },
  ],
  warnings: [{ $: { type: "TORNADO", priority: "1", description: "Test warning" } }],
};

describe("WeatherForecastCity", () => {
  it("renders forecast grid and warnings", () => {
    render(<WeatherForecastCity {...props} />);

    expect(screen.getByText("Full Forecast")).toBeTruthy();
    expect(screen.getByText("3-Day Forecast")).toBeTruthy();
    expect(screen.getByText(/Weather Alerts/)).toBeTruthy();
  });
});
