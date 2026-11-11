import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import AttributionControl from "@/components/map/controls/AttributionControl";

const makeLayer = (attributions?: string | string[]) =>
  new TileLayer({
    source: new XYZ({ url: "https://example.com/{z}/{x}/{y}.png", attributions }),
  });

describe("AttributionControl with real OpenLayers sources", () => {
  let map: Map;

  beforeEach(() => {
    map = new Map({ view: new View({ center: [0, 0], zoom: 5 }) });
  });

  it("renders nothing when no layers have attributions", () => {
    map.addLayer(makeLayer());
    const { container } = render(<AttributionControl map={map} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows attributions from function-based sources", () => {
    map.addLayer(makeLayer("© County of Simcoe"));
    render(<AttributionControl map={map} />);
    expect(screen.getByText("© County of Simcoe")).toBeInTheDocument();
  });

  it("dedupes identical attributions and strips markup", () => {
    map.addLayer(makeLayer(['<a href="https://example.com">© Esri</a>']));
    map.addLayer(makeLayer("© Esri"));
    render(<AttributionControl map={map} />);
    expect(screen.getAllByText("© Esri")).toHaveLength(1);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("updates when a layer is added, hidden or removed", () => {
    const layer = makeLayer("© Layer A");
    render(<AttributionControl map={map} />);
    expect(screen.queryByText("© Layer A")).not.toBeInTheDocument();

    act(() => map.addLayer(layer));
    expect(screen.getByText("© Layer A")).toBeInTheDocument();

    act(() => layer.setVisible(false));
    expect(screen.queryByText("© Layer A")).not.toBeInTheDocument();

    act(() => layer.setVisible(true));
    expect(screen.getByText("© Layer A")).toBeInTheDocument();

    act(() => layer.setOpacity(0));
    expect(screen.queryByText("© Layer A")).not.toBeInTheDocument();

    act(() => layer.setOpacity(1));
    act(() => map.removeLayer(layer));
    expect(screen.queryByText("© Layer A")).not.toBeInTheDocument();
  });

  it("joins credits on one line and renders into the map element", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);
    vi.spyOn(map, "getTargetElement").mockReturnValue(target);
    map.addLayer(makeLayer("© A"));
    map.addLayer(makeLayer("© B"));

    const { container } = render(<AttributionControl map={map} />);

    expect(container.firstChild).toBeNull();
    expect(target.querySelector('[data-testid="map-attribution"]')?.textContent).toBe("© A | © B");
    expect(target.hasAttribute("data-has-attribution")).toBe(true);

    target.remove();
  });

  it("renders nothing when map is not provided", () => {
    const { container } = render(<AttributionControl />);
    expect(container.firstChild).toBeNull();
  });
});
