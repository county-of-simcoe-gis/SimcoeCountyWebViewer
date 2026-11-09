import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MyMapsItem from "@/components/myMaps/MyMapsItem";
import type { MyMapsItem as MyMapsItemType } from "@/types/myMaps";

vi.mock("next/image", () => ({
  default: ({ src, alt, width, height }: any) => <img src={src} alt={alt} width={width} height={height} />,
}));

vi.mock("@/stores/myMapsStore", () => ({
  useMyMapsStore: vi.fn(() => ({ toggleItemVisibility: vi.fn() })),
}));

const makeItem = (geometryType: string): MyMapsItemType =>
  ({
    id: "item-1",
    label: "Item",
    labelVisible: true,
    labelRotation: 0,
    drawType: geometryType,
    geometryType,
    visible: true,
    featureGeoJSON: "{}",
    style: {},
  }) as unknown as MyMapsItemType;

describe("MyMapsItem geometry icon", () => {
  it.each([
    ["Point", "point.png"],
    ["MultiPoint", "point.png"],
    ["LineString", "polyline.png"],
    ["MultiLineString", "polyline.png"],
    ["Polygon", "polygon.png"],
    ["MultiPolygon", "polygon.png"],
    ["Circle", "circle.png"],
  ])("renders %s with %s", (geometryType, icon) => {
    render(<MyMapsItem item={makeItem(geometryType)} onLabelChange={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByAltText(geometryType)).toHaveAttribute("src", `/images/measure/${icon}`);
  });
});
