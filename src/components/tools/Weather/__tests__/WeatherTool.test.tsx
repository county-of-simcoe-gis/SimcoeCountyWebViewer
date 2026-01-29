import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import WeatherTool from "../WeatherTool";

describe("WeatherTool", () => {
  it("renders tabs and switches to Forecast", async () => {
    render(<WeatherTool />);

    // Tabs
    expect(screen.getByText("Radar")).toBeTruthy();
    expect(screen.getByText("Forecast")).toBeTruthy();

    // Click Forecast tab
    fireEvent.click(screen.getByText("Forecast"));

    await waitFor(() => {
      expect(screen.getByText("Weather Forecast")).toBeTruthy();
    });
  });
});
