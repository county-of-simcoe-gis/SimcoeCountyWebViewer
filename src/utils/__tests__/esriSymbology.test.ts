import { describe, it, expect } from "vitest";
import { Feature } from "ol";
import type { Icon, Style } from "ol/style";
import { buildEsriStyleFunction, type EsriRenderer } from "@/utils/esriSymbology";

const classBreaksRenderer = {
  type: "classBreaks",
  field: "WIND_SPEED",
  classBreakInfos: [
    { classMaxValue: 4, label: "0 - 4", symbol: { type: "esriPMS", imageData: "AAAA", contentType: "image/png", width: 4, height: 4 } },
    { classMaxValue: 12, label: "5 - 12", symbol: { type: "esriPMS", imageData: "BBBB", contentType: "image/png", width: 16, height: 8 } },
  ],
  visualVariables: [{ type: "rotationInfo", rotationType: "geographic", valueExpression: '$feature["WIND_DIRECT"] + 90' }],
} as unknown as EsriRenderer;

describe("buildEsriStyleFunction classBreaks", () => {
  const styleFunction = buildEsriStyleFunction(classBreaksRenderer);

  it("uses the symbol of the class containing the feature value", () => {
    const style = styleFunction(new Feature({ WIND_SPEED: 5, WIND_DIRECT: 0 }), 1) as Style;

    expect((style.getImage() as Icon).getSrc()).toContain("BBBB");
  });

  it("rotates by the rotationInfo expression in geographic degrees", () => {
    const style = styleFunction(new Feature({ WIND_SPEED: 5, WIND_DIRECT: 90 }), 1) as Style;

    expect((style.getImage() as Icon).getRotation()).toBeCloseTo(Math.PI);
  });

  it("draws nothing when the classified field is empty", () => {
    expect(styleFunction(new Feature({ WIND_SPEED: null, WIND_DIRECT: 0 }), 1)).toBeUndefined();
  });
});
