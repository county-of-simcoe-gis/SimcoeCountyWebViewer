import { describe, it, expect } from "vitest";
import OLMap from "ol/Map";
import { Feature } from "ol";
import { MyMapsDrawingManager } from "@/utils/openlayers/MyMapsDrawing";
import type { MyMapsItem } from "@/types/myMaps";

const makeItem = (id: string): MyMapsItem =>
  ({
    id,
    label: id,
    labelVisible: false,
    labelRotation: 0,
    visible: true,
    drawType: "Point",
    geometryType: "Point",
    featureGeoJSON: JSON.stringify({ type: "Feature", geometry: { type: "Point", coordinates: [0, 0] }, properties: {} }),
    style: {},
  }) as unknown as MyMapsItem;

const createManager = () =>
  new MyMapsDrawingManager(new OLMap({}), {
    onFeatureDrawn: () => {},
    onFeatureModified: () => {},
  });

const featureFor = (manager: MyMapsDrawingManager, id: string): Feature => {
  const feature = manager
    .getVectorSource()
    .getFeatures()
    .find((f) => f.get("id") === id);
  if (!feature) throw new Error(`missing feature ${id}`);
  return feature;
};

describe("MyMapsDrawingManager stacking order", () => {
  it("ranks the first list item highest", () => {
    const manager = createManager();
    manager.loadFeatures([makeItem("a"), makeItem("b"), makeItem("c")]);

    expect(featureFor(manager, "a").get("zRank")).toBe(3);
    expect(featureFor(manager, "b").get("zRank")).toBe(2);
    expect(featureFor(manager, "c").get("zRank")).toBe(1);
  });

  it("draws higher-ranked features on top", () => {
    const manager = createManager();
    manager.loadFeatures([makeItem("a"), makeItem("b")]);
    const order = manager.getVectorLayer().getRenderOrder() as (a: Feature, b: Feature) => number;

    expect(order(featureFor(manager, "a"), featureFor(manager, "b"))).toBeGreaterThan(0);
  });

  it("keeps features without a rank on top", () => {
    const manager = createManager();
    manager.loadFeatures([makeItem("a")]);
    const order = manager.getVectorLayer().getRenderOrder() as (a: Feature, b: Feature) => number;
    const preview = new Feature();

    expect(order(preview, featureFor(manager, "a"))).toBeGreaterThan(0);
  });

  it("setItemOrder reranks existing features without replacing them", () => {
    const manager = createManager();
    manager.loadFeatures([makeItem("a"), makeItem("b"), makeItem("c")]);
    const before = manager.getVectorSource().getFeatures();

    manager.setItemOrder([makeItem("c"), makeItem("b"), makeItem("a")]);

    const after = manager.getVectorSource().getFeatures();
    expect(after).toHaveLength(3);
    after.forEach((feature) => expect(before).toContain(feature));
    expect(featureFor(manager, "c").get("zRank")).toBe(3);
    expect(featureFor(manager, "b").get("zRank")).toBe(2);
    expect(featureFor(manager, "a").get("zRank")).toBe(1);
  });
});
