"use client";

import { Map } from "ol";
import { Vector as VectorSource } from "ol/source";
import { Vector as VectorLayer } from "ol/layer";
import Draw, { createBox } from "ol/interaction/Draw";
import type { Type as GeometryType } from "ol/geom/Geometry";
import { Modify, Translate } from "ol/interaction";
import GeoJSON from "ol/format/GeoJSON";
import { fromCircle } from "ol/geom/Polygon";
import { Style, Fill, Stroke, Circle as CircleStyle, Text, RegularShape, Icon } from "ol/style";
import { Feature } from "ol";
import type { FeatureLike } from "ol/Feature";
import { Circle, LineString, MultiPolygon, Point } from "ol/geom";
import { asArray } from "ol/color";
import type { EventsKey } from "ol/events";
import { unByKey } from "ol/Observable";
import { generateUID, convertLineToArrow, getBearing, getCalloutStyle, getDefaultLabelStyle, type LabelStyle } from "@/utils/myMapsHelpers";
import type { MyMapsItem, StyleJSON } from "@/types/myMaps";
import { LayerManager } from "@/utils/openlayers/LayerManager";
import { useMapStore } from "@/stores/mapStore";
import { useInteractionManagerStore } from "@/stores/interactionManagerStore";
import { hexToRgba } from "@/utils/openlayers/ColorHelpers";
import { getPublicPath } from "@/utils/getPublicPath";

export class MyMapsDrawingManager {
  private map: Map;
  private vectorSource!: VectorSource;
  private vectorLayer!: VectorLayer<VectorSource>;
  private drawInteraction: Draw | null = null;
  private modifyInteraction: Modify | null = null;
  private translateInteraction: Translate | null = null;
  private eraserPreviewFeature: Feature | null = null;
  private eraserPointerMoveEvent: EventsKey | null = null;
  private eraserPointerLeaveHandler: (() => void) | null = null;
  public static readonly LAYER_NAME = "MyMaps Drawing Layer";

  // Highlight layer for hover effects (like old app)
  private highlightLayer: VectorLayer<VectorSource> | null = null;
  private highlightLayerId: string | null = null;

  // Callbacks from MyMaps component
  private onFeatureDrawn: (feature: Feature) => void;
  private onFeatureModified: (feature: Feature) => void;

  constructor(
    map: Map,
    callbacks: {
      onFeatureDrawn: (feature: Feature) => void;
      onFeatureModified: (feature: Feature) => void;
    },
  ) {
    this.map = map;
    this.onFeatureDrawn = callbacks.onFeatureDrawn;
    this.onFeatureModified = callbacks.onFeatureModified;

    this.initializeLayer();
  }

  private initializeLayer() {
    // Check if layer already exists
    const existingLayer = this.map
      .getLayers()
      .getArray()
      .find((layer) => layer.get("name") === MyMapsDrawingManager.LAYER_NAME) as VectorLayer<VectorSource>;

    if (existingLayer) {
      this.vectorSource = existingLayer.getSource()!;
      this.vectorLayer = existingLayer;
    } else {
      this.vectorSource = new VectorSource();
      this.vectorLayer = new VectorLayer({
        source: this.vectorSource,
      });

      this.vectorLayer.setProperties({
        name: MyMapsDrawingManager.LAYER_NAME,
      });

      // Note: Layer will be registered with LayerManager by MyMapsService component
      // This is just the layer initialization - z-index management happens via LayerManager
      this.map.addLayer(this.vectorLayer);
    }
  }

  public startDrawing(drawType: string, drawColor: string, drawStyle?: Style) {
    this.clearDrawing();

    if (drawType === "Cancel" || drawType === "Eraser") return;

    // Signal other interactions that drawing is active
    useMapStore.getState().setActiveToolId("mymaps-draw");

    // Convert draw type for OpenLayers
    let olDrawType: GeometryType = drawType as GeometryType;
    let geometryFunction;

    switch (drawType) {
      case "Rectangle":
        olDrawType = "Circle";
        geometryFunction = createBox();
        break;
      case "Arrow":
      case "Bearing":
      case "Measure":
      case "Callout":
        olDrawType = "LineString";
        break;
      case "Text":
        olDrawType = "Point";
        break;
    }

    // Create drawing style
    const style = drawStyle || this.getDefaultStyle(drawColor);

    // Create draw interaction
    this.drawInteraction = new Draw({
      source: this.vectorSource,
      type: olDrawType,
      geometryFunction,
      style,
      maxPoints: drawType === "Bearing" || drawType === "Measure" || drawType === "Callout" ? 2 : undefined,
    });

    // Handle draw end
    this.drawInteraction.on("drawend", (event) => {
      const feature = event.feature;
      const featureId = generateUID();

      // Set feature properties
      feature.setProperties({
        id: featureId,
        drawType,
        originalDrawType: drawType,
      });

      // Apply post-processing based on draw type
      this.postProcessFeature(feature, drawType, drawColor);

      // Notify component
      this.onFeatureDrawn(feature);

      // Clear drawing after OL finishes dispatching drawend (next microtask).
      // Previously a 100ms setTimeout was used as an arbitrary guard.
      queueMicrotask(() => this.clearDrawing());
    });

    // Register with centralized interaction store (which also adds to map)
    useInteractionManagerStore.getState().registerInteraction("myMaps-draw", this.drawInteraction, "myMaps");
  }

  private postProcessFeature(feature: Feature, drawType: string, drawColor: string) {
    const geometry = feature.getGeometry();

    // Convert circle to polygon for GeoJSON compatibility
    if (geometry?.getType() === "Circle") {
      const polygon = fromCircle(geometry as Circle, 64);
      feature.setGeometry(polygon);
    }

    // Convert line to arrow for arrow type
    if (drawType === "Arrow" && geometry?.getType() === "LineString") {
      const arrowLine = convertLineToArrow(geometry as LineString);
      feature.setGeometry(arrowLine);
      feature.setProperties({ ...feature.getProperties(), isArrow: true });
    }

    // Calculate bearing for bearing type
    if (drawType === "Bearing" && geometry?.getType() === "LineString") {
      const lineGeometry = geometry as LineString;
      const coords = lineGeometry.getCoordinates();
      if (coords.length >= 2) {
        const bearing = getBearing(coords[0], coords[coords.length - 1]);
        feature.setProperties({
          ...feature.getProperties(),
          bearing: bearing,
          bearingLabel: `Bearing: ${bearing}°`,
        });
      }
    }

    // Handle Callout type - apply callout style and set label properties
    if (drawType === "Callout" && geometry?.getType() === "LineString") {
      const defaultLabelStyle = getDefaultLabelStyle();
      feature.setProperties({
        ...feature.getProperties(),
        label: "Enter Callout Text",
        labelVisible: true,
        labelStyle: {
          ...defaultLabelStyle,
          lineColor: drawColor,
          anchorColor: drawColor,
          borderColor: drawColor,
        },
      });
      // Apply callout style function
      const calloutStyleFn = getCalloutStyle({ drawColor });
      feature.setStyle(calloutStyleFn);
      return; // Skip regular styling for callouts
    }

    // Apply styling based on type
    const style = this.getStyleForFeature(drawType, drawColor);
    feature.setStyle(style);
  }

  private getStyleForFeature(drawType: string, drawColor: string): Style {
    const isText = drawType === "Text";
    const strokeWidth = drawType === "Arrow" ? 6 : 2;

    return new Style({
      fill: new Fill({
        color: hexToRgba(drawColor, 0.3),
      }),
      stroke: new Stroke({
        color: drawColor,
        width: strokeWidth,
      }),
      image: new CircleStyle({
        radius: isText ? 0 : 5,
        fill: new Fill({
          color: drawColor,
        }),
        stroke: new Stroke({
          color: "#fff",
          width: 2,
        }),
      }),
      text: isText
        ? new Text({
            text: "Enter Custom Text",
            font: "12px Arial",
            fill: new Fill({ color: drawColor }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
          })
        : undefined,
    });
  }

  private getDefaultStyle(color: string): Style {
    return new Style({
      fill: new Fill({
        color: hexToRgba(color, 0.3),
      }),
      stroke: new Stroke({
        color: color,
        width: 2,
      }),
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({
          color: color,
        }),
        stroke: new Stroke({
          color: "#fff",
          width: 2,
        }),
      }),
    });
  }

  public clearDrawing() {
    this.clearEraserPreview();

    if (this.drawInteraction) {
      useInteractionManagerStore.getState().unregisterInteraction("myMaps-draw");
      this.drawInteraction = null;
    }
    // Only clear the flag if we're also not editing
    if (!this.isEditing()) {
      useMapStore.getState().setActiveToolId(null);
    }
  }

  public startEraserPreview() {
    this.clearEraserPreview();

    const previewFeature = new Feature({
      geometry: new Point([0, 0]),
      __mymapsPreview: true,
    });
    previewFeature.setStyle(this.getEraserPreviewStyle());
    this.eraserPreviewFeature = previewFeature;
    this.vectorSource.addFeature(previewFeature);

    this.eraserPointerMoveEvent = this.map.on("pointermove", (event: { coordinate: number[]; dragging?: boolean }) => {
      if (event.dragging || !this.eraserPreviewFeature) return;

      const geometry = this.eraserPreviewFeature.getGeometry();
      if (geometry instanceof Point) {
        geometry.setCoordinates(event.coordinate);
      }

      if (!this.vectorSource.hasFeature(this.eraserPreviewFeature)) {
        this.vectorSource.addFeature(this.eraserPreviewFeature);
      }
    });

    this.eraserPointerLeaveHandler = () => {
      if (this.eraserPreviewFeature && this.vectorSource.hasFeature(this.eraserPreviewFeature)) {
        this.vectorSource.removeFeature(this.eraserPreviewFeature);
      }
    };

    this.map.getViewport().addEventListener("mouseleave", this.eraserPointerLeaveHandler);
  }

  public clearEraserPreview() {
    if (this.eraserPointerMoveEvent) {
      unByKey(this.eraserPointerMoveEvent);
      this.eraserPointerMoveEvent = null;
    }

    if (this.eraserPointerLeaveHandler) {
      this.map.getViewport().removeEventListener("mouseleave", this.eraserPointerLeaveHandler);
      this.eraserPointerLeaveHandler = null;
    }

    if (this.eraserPreviewFeature && this.vectorSource.hasFeature(this.eraserPreviewFeature)) {
      this.vectorSource.removeFeature(this.eraserPreviewFeature);
    }
    this.eraserPreviewFeature = null;
  }

  private getEraserPreviewStyle(): Style {
    return new Style({
      image: new Icon({
        src: getPublicPath("/images/eraser.png"),
        anchor: [0.5, 0.5],
        anchorXUnits: "fraction",
        anchorYUnits: "fraction",
        scale: 0.8,
      }),
    });
  }

  public startEditing(mode: "vertices" | "translate") {
    this.clearEditing();

    // Signal other interactions that editing is active
    useMapStore.getState().setActiveToolId("mymaps-edit");

    if (mode === "vertices") {
      this.modifyInteraction = new Modify({
        source: this.vectorSource,
      });

      this.modifyInteraction.on("modifyend", (event) => {
        event.features.forEach((feature) => {
          this.onFeatureModified(feature as Feature);
        });
      });

      useInteractionManagerStore.getState().registerInteraction("myMaps-modify", this.modifyInteraction, "myMaps");
    } else {
      // For translate mode, configure to work on individual features from our layer
      this.translateInteraction = new Translate({
        // Configure to work with features from our vector layer
        layers: [this.vectorLayer],
      });

      this.translateInteraction.on("translateend", (event) => {
        event.features.forEach((feature) => {
          this.onFeatureModified(feature as Feature);
        });
      });

      useInteractionManagerStore.getState().registerInteraction("myMaps-translate", this.translateInteraction, "myMaps");
    }
  }

  public clearEditing() {
    if (this.modifyInteraction) {
      useInteractionManagerStore.getState().unregisterInteraction("myMaps-modify");
      this.modifyInteraction = null;
    }
    if (this.translateInteraction) {
      useInteractionManagerStore.getState().unregisterInteraction("myMaps-translate");
      this.translateInteraction = null;
    }
    // Only clear the flag if we're also not drawing
    if (!this.drawInteraction) {
      useMapStore.getState().setActiveToolId(null);
    }
  }

  public isEditing(): boolean {
    return !!(this.modifyInteraction || this.translateInteraction);
  }

  public addFeature(feature: Feature) {
    this.vectorSource.addFeature(feature);
  }

  public removeFeature(featureId: string) {
    const feature = this.getFeatureById(featureId);
    if (feature) {
      this.vectorSource.removeFeature(feature);
    }
  }

  public getFeatureById(id: string): Feature | null {
    const features = this.vectorSource.getFeatures();
    return features.find((feature) => feature.get("id") === id) || null;
  }

  public highlightFeature(featureId: string) {
    const feature = this.getFeatureById(featureId);
    if (!feature) return;

    // Remove any existing highlight first
    this.unhighlightFeature(featureId);

    // Get the geometry and clone it to avoid any reference issues
    const geometry = feature.getGeometry();
    if (!geometry) return;

    // Create geometry-specific shadow style - completely separate objects
    let shadowStyle: Style;

    if (geometry.getType() === "Point") {
      // Points: Only image style (like old app for points)
      shadowStyle = new Style({
        image: new CircleStyle({
          radius: 10,
          stroke: new Stroke({
            color: [0, 0, 127, 0.3],
            width: 6,
          }),
          fill: new Fill({
            color: [0, 0, 127, 0.3],
          }),
        }),
        zIndex: 100000,
      });
    } else {
      // Lines and Polygons: Only stroke and fill (NO image property at all)
      const styleConfig: {
        stroke: Stroke;
        fill?: Fill;
        zIndex?: number;
      } = {
        stroke: new Stroke({
          color: [0, 0, 127, 0.3],
          width: 6,
        }),
        zIndex: 100000,
      };

      // Add fill only for polygons
      if (geometry.getType() === "Polygon") {
        styleConfig.fill = new Fill({
          color: [0, 0, 127, 0.3],
        });
      }

      shadowStyle = new Style(styleConfig);
    }

    // Create clean highlight feature (like old app)
    const highlightFeature = new Feature({
      geometry: geometry.clone(), // Clone to avoid reference issues
    });

    // Create or reuse highlight layer
    if (!this.highlightLayer) {
      this.highlightLayer = new VectorLayer({
        source: new VectorSource({
          features: [],
        }),
        style: shadowStyle, // Set style on layer like old app
      });

      this.highlightLayerId = LayerManager.addLayer(this.highlightLayer, "Graphics", "MyMaps Highlight", {
        index: 100, // Very high index to ensure it's on top
        metadata: {
          isMyMapsHighlight: true,
        },
      });
    }

    // Add highlight feature to layer (style is set on layer level)
    this.highlightLayer.getSource()?.addFeature(highlightFeature);
  }

  public unhighlightFeature(_featureId: string) {
    if (this.highlightLayer) {
      // Clear all features from highlight layer
      this.highlightLayer.getSource()?.clear();

      // Remove and cleanup highlight layer
      if (this.highlightLayerId) {
        LayerManager.removeLayer(this.highlightLayerId);
        this.highlightLayerId = null;
      }
      this.highlightLayer = null;
    }
  }

  public clearAllFeatures() {
    this.vectorSource.clear();
  }

  public loadFeatures(items: MyMapsItem[]) {
    // Verbose MyMaps loading logs commented out to reduce console noise
    // console.log("📥 Loading features", { itemCount: items.length });

    this.clearAllFeatures();

    const geoJsonFormat = new GeoJSON({
      dataProjection: "EPSG:3857",
      featureProjection: "EPSG:3857",
    });

    items.forEach((item) => {
      if (item.featureGeoJSON && item.visible) {
        try {
          // console.log("📍 Loading individual feature", {
          //   id: item.id,
          //   labelVisible: item.labelVisible,
          //   label: item.label,
          //   drawType: item.drawType,
          // });

          const feature = geoJsonFormat.readFeature(item.featureGeoJSON) as Feature;
          feature.setProperties({
            id: item.id,
            label: item.label,
            labelVisible: item.labelVisible,
            labelRotation: item.labelRotation,
            drawType: item.drawType,
            originalDrawType: item.drawType,
          });

          // Apply item's style - handle both new OpenLayers Style objects and legacy StyleJSON
          // Special handling for Callout items - use callout style function
          if (item.drawType === "Callout") {
            // console.log("🎨 Applying Callout style function");
            const labelStyle = item.labelStyle || getDefaultLabelStyle();
            const calloutStyleFn = getCalloutStyle({
              lineColor: typeof labelStyle === "object" && "lineColor" in labelStyle ? labelStyle.lineColor : undefined,
              anchorColor: typeof labelStyle === "object" && "anchorColor" in labelStyle ? labelStyle.anchorColor : undefined,
            });
            feature.setStyle(calloutStyleFn);
          } else if (item.style) {
            let style: Style;

            // Check if it's already a Style object (new approach) or needs conversion (legacy StyleJSON)
            if (item.style instanceof Style) {
              // console.log("🎨 Using stored OpenLayers Style object directly");
              style = item.style;
            } else {
              // console.log("🎨 Converting legacy StyleJSON to OpenLayers Style");
              style = this.styleFromJSON(item.style as StyleJSON, item.pointType);
            }

            feature.setStyle(style);
          }

          this.vectorSource.addFeature(feature);
          // console.log("✅ Feature loaded successfully", { id: item.id });

          // Apply label if it was visible when saved (after feature is added to source)
          if (item.labelVisible && item.label) {
            // console.log("🏷️ Applying saved label to feature", {
            //   id: item.id,
            //   label: item.label,
            // });
            this.setFeatureLabel(item);
          }
        } catch (error) {
          console.error("Failed to load MyMaps feature:", error);
        }
      }
    });

    // console.log("🏁 All features loaded", { totalInSource: this.vectorSource.getFeatures().length });
  }

  private styleFromJSON(styleJson: StyleJSON, pointType?: string): Style {
    if (!styleJson || Object.keys(styleJson).length === 0) return this.getDefaultStyle("#e809e5");

    const styleConfig: {
      fill?: Fill;
      stroke?: Stroke;
      image?: CircleStyle | RegularShape;
    } = {};

    // Fill
    if (styleJson.fill && styleJson.fill.color) {
      styleConfig.fill = new Fill({
        color: styleJson.fill.color,
      });
    }

    // Stroke
    if (styleJson.stroke && styleJson.stroke.color) {
      styleConfig.stroke = new Stroke({
        color: styleJson.stroke.color,
        width: styleJson.stroke.width || 1,
        lineDash: styleJson.stroke.lineDash,
      });
    }

    // Image (CircleStyle or RegularShape for points)
    if (styleJson.image && styleJson.image.radius) {
      const imageFill = styleJson.image.fill
        ? new Fill({
            color: styleJson.image.fill.color,
          })
        : new Fill({ color: "#e809e5" });

      const imageStroke = styleJson.image.stroke
        ? new Stroke({
            color: styleJson.image.stroke.color,
            width: styleJson.image.stroke.width || 1,
            lineDash: styleJson.image.stroke.lineDash,
          })
        : new Stroke({ color: "#e809e5", width: 1 });

      // Handle different point types (matching old app logic)
      if (!pointType || pointType === "circle") {
        styleConfig.image = new CircleStyle({
          radius: styleJson.image.radius,
          fill: imageFill,
          stroke: imageStroke,
        });
      } else if (pointType === "square") {
        styleConfig.image = new RegularShape({
          fill: imageFill,
          stroke: imageStroke,
          points: 4,
          radius: styleJson.image.radius,
          angle: Math.PI / 4,
          rotation: styleJson.image.rotation || 0,
        });
      } else if (pointType === "triangle") {
        styleConfig.image = new RegularShape({
          fill: imageFill,
          stroke: imageStroke,
          points: 3,
          radius: styleJson.image.radius,
          rotation: styleJson.image.rotation || 0,
          angle: 0,
        });
      } else if (pointType === "star") {
        let radius2 = 4;
        if (styleJson.image.radius < 15) radius2 = 4;
        else if (styleJson.image.radius > 15 && styleJson.image.radius < 40) radius2 = 8;
        else if (styleJson.image.radius > 40 && styleJson.image.radius < 70) radius2 = 16;
        else radius2 = 22;

        styleConfig.image = new RegularShape({
          fill: imageFill,
          stroke: imageStroke,
          points: 5,
          radius: styleJson.image.radius,
          radius2: radius2,
          angle: 0,
          rotation: styleJson.image.rotation || 0,
        });
      } else if (pointType === "cross") {
        styleConfig.image = new RegularShape({
          fill: imageFill,
          stroke: imageStroke,
          points: 4,
          radius: styleJson.image.radius,
          radius2: 0,
          angle: 0,
          rotation: styleJson.image.rotation || 0,
        });
      } else if (pointType === "x") {
        styleConfig.image = new RegularShape({
          fill: imageFill,
          stroke: imageStroke,
          points: 4,
          radius: styleJson.image.radius,
          radius2: 0,
          angle: Math.PI / 4,
          rotation: styleJson.image.rotation || 0,
        });
      } else {
        // Default to circle for unknown types
        styleConfig.image = new CircleStyle({
          radius: styleJson.image.radius,
          fill: imageFill,
          stroke: imageStroke,
        });
      }
    }

    return new Style(styleConfig);
  }

  // Public method to get the vector layer (for layer manager integration)
  public getVectorLayer(): VectorLayer<VectorSource> {
    return this.vectorLayer;
  }

  // Public method to get the vector source
  public getVectorSource(): VectorSource {
    return this.vectorSource;
  }

  public cleanup() {
    this.clearDrawing();
    this.clearEditing();

    // Clean up highlight layer
    if (this.highlightLayerId) {
      LayerManager.removeLayer(this.highlightLayerId);
      this.highlightLayerId = null;
    }
    this.highlightLayer = null;

    // Layer removal will be handled by the layer manager in the component
    // Don't remove layer directly here since layer manager should handle it
  }

  // Label functionality - EXACT match to old app implementation
  public setFeatureLabel(itemInfo: MyMapsItem) {
    const feature = this.getFeatureById(itemInfo.id);
    if (!feature) {
      console.warn("❌ Feature not found for ID:", itemInfo.id);
      return;
    }

    const isCallout = itemInfo.drawType === "Callout";
    let style = feature.getStyle() as Style;
    if (!style && !isCallout) {
      style = this.getDefaultStyle("#e809e5");
    }

    if (itemInfo.labelVisible && itemInfo.label) {
      // Store the label in the feature property first
      feature.setProperties({
        labelVisible: true,
        label: itemInfo.label,
        labelRotation: itemInfo.labelRotation || 0,
      });

      if (isCallout) {
        // CALLOUT: Create special style function with text box at end of line
        const labelStyle = (itemInfo.labelStyle as LabelStyle) || getDefaultLabelStyle();

        // Extract label style properties
        const textColor = labelStyle.textColor || "#000000";
        const textSize = labelStyle.textSize || "14px";
        const outlineColor = labelStyle.outlineColor || "#000000";
        const outlineWidth = labelStyle.outlineWidth ?? 1;
        const backgroundColor = labelStyle.backgroundColor || "rgba(255, 255, 255, 0.95)";
        const borderColor = labelStyle.borderColor || "#333333";
        const lineColor = labelStyle.lineColor || "#333333";
        const anchorColor = labelStyle.anchorColor || "#333333";

        // Parse colors to arrays
        const lineColorArray = asArray(lineColor);
        const anchorColorArray = asArray(anchorColor);

        // Create callout style function
        const calloutStyleFunction = (feat: FeatureLike): Style[] => {
          if (!(feat instanceof Feature)) return [];
          const geometry = feat.getGeometry();
          if (!geometry || geometry.getType() !== "LineString") {
            return [];
          }

          const lineGeometry = geometry as LineString;
          const coordinates = lineGeometry.getCoordinates();
          const startPoint = coordinates[0];
          const endPoint = coordinates[coordinates.length - 1];

          // Get the current label rotation from the feature (may have been updated by slider)
          const labelRotation = feat.get("labelRotation") || itemInfo.labelRotation || 0;
          const rotationInRadians = labelRotation * (Math.PI / 180);

          // Style for the tail line
          const lineStyle = new Style({
            stroke: new Stroke({
              color: [lineColorArray[0], lineColorArray[1], lineColorArray[2], 0.8],
              width: 2,
            }),
          });

          // Style for the anchor circle at the start point
          const anchorStyle = new Style({
            geometry: new Point(startPoint),
            image: new CircleStyle({
              radius: 5,
              fill: new Fill({ color: [anchorColorArray[0], anchorColorArray[1], anchorColorArray[2], 0.8] }),
              stroke: new Stroke({ color: [anchorColorArray[0], anchorColorArray[1], anchorColorArray[2], 1], width: 1 }),
            }),
          });

          // Create text style with background for the callout box (with rotation support)
          const textStyle = new Text({
            text: feat.get("label") || itemInfo.label || "",
            font: `bold ${textSize} arial`,
            fill: new Fill({ color: textColor }),
            stroke: new Stroke({ color: outlineColor, width: outlineWidth }),
            textAlign: "center",
            textBaseline: "middle",
            offsetX: 0,
            offsetY: 0,
            overflow: true,
            rotation: rotationInRadians,
            backgroundFill: new Fill({ color: backgroundColor }),
            backgroundStroke: new Stroke({ color: borderColor, width: 2 }),
            padding: [5, 8, 5, 8],
          });

          // Style for the text box at the end point
          const textBoxStyle = new Style({
            geometry: new Point(endPoint),
            text: textStyle,
          });

          return [lineStyle, anchorStyle, textBoxStyle];
        };

        feature.setStyle(calloutStyleFunction);
      } else {
        // Regular label handling - use labelStyle if available
        const labelStyle = (itemInfo.labelStyle as LabelStyle) || getDefaultLabelStyle();
        const isCallout = itemInfo.drawType === "Callout";

        // Extract label style properties - match source app defaults
        const textColor = labelStyle.textColor || (isCallout ? "#000000" : "#ffffff");
        const textSize = labelStyle.textSize || "14px";
        const outlineColor = labelStyle.outlineColor || "#000000";
        const outlineWidth = labelStyle.outlineWidth !== undefined ? labelStyle.outlineWidth : isCallout ? 1 : 2;

        // Apply bearing rotation adjustment for Bearing and Measure tools (like original app)
        let displayRotation = itemInfo.labelRotation || 0;
        const drawType = feature.get("drawType") || feature.get("originalDrawType") || itemInfo.drawType;
        if (drawType === "Bearing" || drawType === "Measure") {
          displayRotation = displayRotation > 180 ? displayRotation + 90 : displayRotation - 90;
        }

        // Convert rotation to radians
        const rotationInRadians = displayRotation * (Math.PI / 180);

        const textStyle = new Text({
          text: feature.get("label") || itemInfo.label || "",
          font: `bold ${textSize} arial`,
          fill: new Fill({ color: textColor }),
          stroke: new Stroke({ color: outlineColor, width: outlineWidth }),
          textAlign: "center",
          textBaseline: "middle",
          offsetY: -8,
          rotation: rotationInRadians,
          overflow: true,
          placement: "point",
        });

        // For MultiPolygon, render a single label at the center instead of one per part
        const geom = feature.getGeometry();
        if (geom instanceof MultiPolygon) {
          const labelStyle = new Style({
            geometry: new Point(geom.getInteriorPoints().getCoordinates()[0]),
            text: textStyle,
          });
          feature.setStyle([style, labelStyle]);
        } else {
          style.setText(textStyle);
          feature.setStyle(style);
        }
      }
    } else {
      feature.setProperties({
        labelVisible: false,
        label: itemInfo.label || "",
        labelRotation: itemInfo.labelRotation || 0,
      });

      if (isCallout) {
        // Reset to base callout style without text
        const labelStyle = (itemInfo.labelStyle as LabelStyle) || getDefaultLabelStyle();
        const calloutStyleFn = getCalloutStyle({
          lineColor: labelStyle.lineColor,
          anchorColor: labelStyle.anchorColor,
        });
        feature.setStyle(calloutStyleFn);
      } else {
        style.setText(new Text({ text: "" }));
        feature.setStyle(style);
      }
    }

    // Force layer to render on top
    this.vectorLayer.setZIndex(9999);
    this.vectorLayer.changed();

    // Trigger a redraw to show the changes
    this.vectorSource.changed();
  }

  // Create text style from feature - EXACT old app implementation
  private createTextStyleFromFeature(feature: Feature, fieldName: string = "label", rotation: number = 0): Text {
    // Apply bearing rotation adjustment for Bearing and Measure tools (like original app)
    const drawType = feature.get("drawType") || feature.get("originalDrawType");
    if (drawType === "Bearing" || drawType === "Measure") {
      // Use the same rotation logic as original app: bearing > 180 ? bearing + 90 : bearing - 90
      rotation = rotation > 180 ? rotation + 90 : rotation - 90;
    }

    // OLD APP EXACT PARAMETERS (from drawingHelpers.js call):
    // helpers.createTextStyle(feature, "label", undefined, undefined, undefined,
    //   "15px", undefined, -8, "bold", undefined, undefined,
    //   true, itemInfo.labelRotation, undefined, undefined,
    //   "#ffffff", 0.4);

    const text = feature.get(fieldName) || "";
    const align = "center"; // default from old app
    const baseline = "middle"; // default from old app
    const size = "15px";
    const offsetX = 0; // default from old app
    const offsetY = -8;
    const weight = "bold";
    const placement = "point"; // default from old app
    const overflow = true; // OLD APP param #12
    const rotationInRadians = rotation * (Math.PI / 180); // OLD APP conversion
    const font = "arial"; // default from old app
    const fillColor = "black"; // default from old app (param #15 undefined)
    const outlineColor = "#ffffff"; // OLD APP param #16 - WHITE OUTLINE!
    const outlineWidth = 0.4; // OLD APP param #17

    // Construct font exactly like old app: "bold 15px arial"
    const fullFont = `${weight} ${size} ${font}`;

    const textStyle = new Text({
      textAlign: align,
      textBaseline: baseline,
      font: fullFont,
      text: text,
      fill: new Fill({ color: fillColor }),
      stroke: new Stroke({ color: outlineColor, width: outlineWidth }),
      offsetX: offsetX,
      offsetY: offsetY,
      placement: placement,
      overflow: overflow,
      rotation: rotationInRadians,
    });

    return textStyle;
  }

  // Create text style matching the old app's exact implementation
  private createTextStyle(text: string, fontSize: string = "15px", fontWeight: string = "bold", rotation: number = 0, offsetY: number = -8): Text {
    // OLD APP EXACT PARAMETERS:
    // helpers.createTextStyle(feature, "label", undefined, undefined, undefined,
    //   "15px", undefined, -8, "bold", undefined, undefined,
    //   true, itemInfo.labelRotation, undefined, undefined,
    //   "#ffffff", 0.4);

    // Convert rotation to radians like the old app
    const rotationInRadians = rotation * (Math.PI / 180);

    // Construct font exactly like old app: "bold 15px arial"
    const fullFont = `${fontWeight} ${fontSize} arial`;

    const textStyle = new Text({
      text: text,
      font: fullFont,
      fill: new Fill({ color: "#000000" }), // Black text (old app default)
      stroke: new Stroke({
        color: "#ffffff", // White outline - EXACT match old app param #16
        width: 0.4, // EXACT match old app param #17
      }),
      textAlign: "center", // Old app centers text
      textBaseline: "middle", // Old app middle baseline
      offsetY: offsetY, // EXACT match old app param #8 (-8)
      rotation: rotationInRadians, // EXACT match old app param #13
      overflow: true, // Allow text overflow
      placement: "point", // Ensure text renders on point features
    });

    return textStyle;
  }

  // Update feature label text only (when user types in input)
  public updateFeatureLabel(featureId: string, newLabel: string) {
    const feature = this.getFeatureById(featureId);
    if (!feature) return;

    feature.setProperties({ label: newLabel });

    // If label is currently visible, update only the label text while preserving style
    if (feature.get("labelVisible")) {
      const featureStyle = feature.getStyle();

      if (typeof featureStyle === "function") {
        // Callout style functions read label from feature properties dynamically,
        // so just trigger a redraw — no style replacement needed.
        this.vectorSource.changed();
      } else if (featureStyle instanceof Style) {
        const textStyle = featureStyle.getText();
        if (textStyle) {
          textStyle.setText(newLabel);
          featureStyle.setText(textStyle);
          feature.setStyle(featureStyle);
          this.vectorSource.changed();
        }
      } else if (Array.isArray(featureStyle)) {
        const styleWithText = featureStyle.find((s) => s instanceof Style && !!s.getText());
        if (styleWithText) {
          const textStyle = styleWithText.getText();
          if (textStyle) {
            textStyle.setText(newLabel);
            styleWithText.setText(textStyle);
            feature.setStyle(featureStyle);
            this.vectorSource.changed();
          }
        }
      } else {
        // Fallback when style isn't resolved to concrete Style object(s) yet
        const fallbackStyle = this.createTextStyle(newLabel, "14px", "bold", feature.get("labelRotation") || 0, -8);
        feature.setStyle(
          new Style({
            text: fallbackStyle,
          }),
        );
        this.vectorSource.changed();
      }
    }
  }

  // Update feature label rotation (when user moves slider)
  public updateFeatureLabelRotation(featureId: string, rotation: number) {
    const feature = this.getFeatureById(featureId);
    if (!feature) return;

    feature.setProperties({ labelRotation: rotation });

    // If label is currently visible, update only rotation while preserving font/size/colors
    if (feature.get("labelVisible")) {
      // Apply bearing rotation adjustment for Bearing and Measure tools (like original app)
      let displayRotation = rotation;
      const drawType = feature.get("drawType") || feature.get("originalDrawType");
      if (drawType === "Bearing" || drawType === "Measure") {
        // Use the same rotation logic as original app: bearing > 180 ? bearing + 90 : bearing - 90
        displayRotation = rotation > 180 ? rotation + 90 : rotation - 90;
      }
      const rotationInRadians = displayRotation * (Math.PI / 180);

      const featureStyle = feature.getStyle();
      if (featureStyle instanceof Style) {
        const textStyle = featureStyle.getText();
        if (textStyle) {
          textStyle.setRotation(rotationInRadians);
          featureStyle.setText(textStyle);
          feature.setStyle(featureStyle);
          this.vectorSource.changed();
        }
      } else if (Array.isArray(featureStyle)) {
        const styleWithText = featureStyle.find((s) => s instanceof Style && !!s.getText());
        if (styleWithText) {
          const textStyle = styleWithText.getText();
          if (textStyle) {
            textStyle.setRotation(rotationInRadians);
            styleWithText.setText(textStyle);
            feature.setStyle(featureStyle);
            this.vectorSource.changed();
          }
        }
      } else {
        const label = feature.get("label") || "";
        const fallbackTextStyle = this.createTextStyle(label, "14px", "bold", displayRotation, -8);
        feature.setStyle(
          new Style({
            text: fallbackTextStyle,
          }),
        );
        this.vectorSource.changed();
      }
    }
  }

  // Update feature style (when user changes symbolizer settings)
  public updateFeatureStyle(featureId: string, styleOrJSON: StyleJSON | Style, pointType?: string) {
    const feature = this.getFeatureById(featureId);
    if (!feature) {
      console.warn(`❌ Feature with id ${featureId} not found for style update`);
      return;
    }

    try {
      let newStyle: Style;

      // Check if it's already a Style object (from new approach) or StyleJSON (legacy)
      if (styleOrJSON instanceof Style) {
        newStyle = styleOrJSON;
      } else {
        newStyle = this.styleFromJSON(styleOrJSON, pointType);
      }

      // Preserve existing text style if feature has a label.
      // Note: some feature types (e.g. callout) use a Style[] array rather than
      // a single Style, so guard against getText not being a function.
      if (feature.get("labelVisible")) {
        const currentStyle = feature.getStyle();
        let currentText: ReturnType<Style["getText"]> | undefined;
        if (currentStyle instanceof Style) {
          currentText = currentStyle.getText();
        } else if (Array.isArray(currentStyle)) {
          const styleWithText = currentStyle.find((s) => s instanceof Style && !!s.getText());
          currentText = styleWithText?.getText();
        }
        if (currentText) {
          newStyle.setText(currentText);
        }
      }

      // Apply new style to feature
      feature.setStyle(newStyle);

      // Trigger map refresh
      this.vectorSource.changed();
    } catch (error) {
      console.error("❌ Error updating feature style:", error);
    }
  }

  // Debug method to check current state
  public debugState() {
    // Debug method for development - can be removed in production
  }
}
