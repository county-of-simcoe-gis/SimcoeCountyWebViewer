/**
 * Legacy style compatibility helpers.
 *
 * The old SimcoeCountyWebViewer apps serialized OpenLayers style instances by
 * stringifying their internal `_`-suffixed properties. The NextJS app uses a
 * cleaner JSON shape internally, so MyMaps load/import paths normalize the old
 * style structure through the helpers in this module.
 */

interface OldOLStyle {
  fill_?: { color_?: number[] | string };
  stroke_?: { color_?: number[] | string; width_?: number; lineDash_?: number[] | null };
  image_?: {
    fill_?: { color_?: number[] | string };
    stroke_?: { color_?: number[] | string; width_?: number; lineDash_?: number[] | null };
    radius_?: number;
    rotation_?: number;
    points_?: number;
    radius2_?: number;
    angle_?: number;
    src_?: string;
    scale_?: number;
  };
  text_?: {
    text_?: string;
    font_?: string;
    fill_?: { color_?: number[] | string };
    stroke_?: { color_?: number[] | string; width_?: number };
    offsetX_?: number;
    offsetY_?: number;
    rotation_?: number;
  };
}

interface NewStyleJSON {
  fill?: { color: string | number[] };
  stroke?: { color: string | number[]; width?: number; lineDash?: number[] };
  image?: {
    type: "circle" | "regularShape" | "icon";
    radius?: number;
    fill?: { color: string | number[] };
    stroke?: { color: string | number[]; width?: number; lineDash?: number[] };
    points?: number;
    radius2?: number;
    angle?: number;
    rotation?: number;
    src?: string;
    scale?: number;
  };
  text?: {
    text: string;
    font?: string;
    fill?: { color: string | number[] };
    stroke?: { color: string | number[]; width?: number };
    offsetX?: number;
    offsetY?: number;
    rotation?: number;
  };
}

/**
 * Detect whether a style object uses the old OL internal serialization
 * (properties ending with underscores like `fill_`, `stroke_`).
 */
export function isOldOLStyleFormat(style: unknown): style is OldOLStyle {
  if (!style || typeof style !== "object") return false;
  const keys = Object.keys(style);
  return keys.some((key) => key.endsWith("_"));
}

/**
 * Convert an OL internal style serialization to the clean JSON format used by
 * the NextJS MyMaps store.
 */
export function transformOLStyle(old: OldOLStyle): NewStyleJSON {
  const result: NewStyleJSON = {};

  if (old.fill_?.color_) {
    result.fill = { color: old.fill_.color_ };
  }

  if (old.stroke_) {
    result.stroke = { color: old.stroke_.color_ ?? [0, 0, 0, 1] };
    if (old.stroke_.width_ !== undefined) result.stroke.width = old.stroke_.width_;
    if (old.stroke_.lineDash_) result.stroke.lineDash = old.stroke_.lineDash_;
  }

  if (old.image_) {
    const img = old.image_;
    const imageType: "circle" | "regularShape" | "icon" = img.src_ ? "icon" : img.points_ != null ? "regularShape" : "circle";

    result.image = { type: imageType };

    if (img.radius_ !== undefined) result.image.radius = img.radius_;
    if (img.fill_?.color_) result.image.fill = { color: img.fill_.color_ };
    if (img.stroke_) {
      result.image.stroke = { color: img.stroke_.color_ ?? [0, 0, 0, 1] };
      if (img.stroke_.width_ !== undefined) result.image.stroke.width = img.stroke_.width_;
      if (img.stroke_.lineDash_) result.image.stroke.lineDash = img.stroke_.lineDash_;
    }
    if (img.points_ != null) result.image.points = img.points_;
    if (img.radius2_ !== undefined) result.image.radius2 = img.radius2_;
    if (img.angle_ !== undefined) result.image.angle = img.angle_;
    if (img.rotation_ !== undefined) result.image.rotation = img.rotation_;
    if (img.src_) result.image.src = img.src_;
    if (img.scale_ !== undefined) result.image.scale = img.scale_;
  }

  if (old.text_) {
    result.text = { text: old.text_.text_ ?? "" };
    if (old.text_.font_) result.text.font = old.text_.font_;
    if (old.text_.fill_?.color_) result.text.fill = { color: old.text_.fill_.color_ };
    if (old.text_.stroke_) {
      result.text.stroke = { color: old.text_.stroke_.color_ ?? [0, 0, 0, 1] };
      if (old.text_.stroke_.width_ !== undefined) result.text.stroke.width = old.text_.stroke_.width_;
    }
    if (old.text_.offsetX_ !== undefined) result.text.offsetX = old.text_.offsetX_;
    if (old.text_.offsetY_ !== undefined) result.text.offsetY = old.text_.offsetY_;
    if (old.text_.rotation_ !== undefined) result.text.rotation = old.text_.rotation_;
  }

  return result;
}
