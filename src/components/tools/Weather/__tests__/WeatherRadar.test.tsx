import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import WeatherRadar from "../WeatherRadar";

describe("WeatherRadar", () => {
  beforeEach(() => {
    // Minimal stub of window.map used by the component to avoid errors
    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).window.map = {
      getLayers: () => ({ getArray: () => [] }),
      addLayer: () => {},
      removeLayer: () => {},
      getView: () => ({ getCenter: () => null }),
      getSize: () => null,
    };
  });

  afterEach(() => {
    try {
      delete (globalThis as any).window.map;
    } catch {}
  });

  it("mounts without throwing", () => {
    expect(() => render(<WeatherRadar />)).not.toThrow();
  });
});
