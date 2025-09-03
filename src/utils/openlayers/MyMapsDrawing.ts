"use client";

import { Map } from "ol";
import { Vector as VectorSource } from "ol/source";
import { Vector as VectorLayer } from "ol/layer";
import Draw, { createBox } from "ol/interaction/Draw";
import type { Type as GeometryType } from "ol/geom/Geometry";
import { Modify, Translate } from "ol/interaction";
import Collection from "ol/Collection";
import GeoJSON from "ol/format/GeoJSON";
import { fromCircle } from "ol/geom/Polygon";
import { Style, Fill, Stroke, Circle as CircleStyle, Text, RegularShape } from "ol/style";
import { Feature } from "ol";
import { Circle, LineString } from "ol/geom";
import { generateUID, convertLineToArrow, getBearing } from "@/utils/myMapsHelpers";
import type { MyMapsItem, StyleJSON } from "@/types/myMaps";


export class MyMapsDrawingManager {
  private map: Map;
  private vectorSource!: VectorSource;
  private vectorLayer!: VectorLayer<VectorSource>;
  private drawInteraction: Draw | null = null;
  private modifyInteraction: Modify | null = null;
  private translateInteraction: Translate | null = null;
  private layerName = "MyMaps Drawing Layer";
  
  // Highlight layer for hover effects (like old app)
  private highlightLayer: VectorLayer<VectorSource> | null = null;
  
  // Callbacks from MyMaps component
  private onFeatureDrawn: (feature: Feature) => void;
  private onFeatureModified: (feature: Feature) => void;
  private onFeatureClicked: (feature: Feature, coordinate: number[]) => void;
  
  constructor(
    map: Map, 
    callbacks: {
      onFeatureDrawn: (feature: Feature) => void;
      onFeatureModified: (feature: Feature) => void;
      onFeatureClicked: (feature: Feature, coordinate: number[]) => void;
    }
  ) {
    this.map = map;
    this.onFeatureDrawn = callbacks.onFeatureDrawn;
    this.onFeatureModified = callbacks.onFeatureModified;
    this.onFeatureClicked = callbacks.onFeatureClicked;
    
    this.initializeLayer();
    this.setupMapClickHandler();
  }

  private initializeLayer() {
    // Check if layer already exists
    const existingLayer = this.map.getLayers().getArray().find(
      layer => layer.get("name") === this.layerName
    ) as VectorLayer<VectorSource>;

    if (existingLayer) {
      this.vectorSource = existingLayer.getSource()!;
      this.vectorLayer = existingLayer;
    } else {
      this.vectorSource = new VectorSource();
      this.vectorLayer = new VectorLayer({
        source: this.vectorSource,
        // TEMPORARY TEST: Super high z-index to test if layer ordering is the issue
        zIndex: 9999,
      });
      
      this.vectorLayer.setProperties({
        disableParcelClick: true,
        name: this.layerName,
      });
      
      // Add layer directly to map as fallback - layer manager should override z-index
      this.map.addLayer(this.vectorLayer);
    }
  }

  private setupMapClickHandler() {
    this.map.on("singleclick", (evt) => {
      if (this.drawInteraction || this.isEditing()) {
        return;
      }

      // Check if popup is active and prevent map interactions
      const popupActive = (window as unknown as { popupActive?: boolean }).popupActive;
      console.log("🔍 Popup active check:", { popupActive, timestamp: Date.now() });
      
      if (popupActive) {
        console.log("🚫 Popup is active - ignoring map click");
        return;
      }

      console.log("🖱️ Map clicked at pixel:", evt.pixel);
      
      this.map.forEachFeatureAtPixel(
        evt.pixel,
        (feature, layer) => {
          if (layer.get("name") === this.layerName) {
            console.log("🎯 Found MyMaps feature at click:", {
              id: feature.get("id"),
              label: feature.get("label"),
              labelVisible: feature.get("labelVisible"),
              drawType: feature.get("drawType")
            });
            this.onFeatureClicked(feature as Feature, evt.coordinate);
          }
          return;
        },
        {
          layerFilter: (layer) => layer.get("name") === this.layerName,
        }
      );
    });
  }

  public startDrawing(drawType: string, drawColor: string, drawStyle?: Style) {
    this.clearDrawing();

    if (drawType === "Cancel" || drawType === "Eraser") return;

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
      maxPoints: (drawType === "Bearing" || drawType === "Measure") ? 2 : undefined,
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
      
      // Clear drawing after completion
      setTimeout(() => this.clearDrawing(), 100);
    });

    this.map.addInteraction(this.drawInteraction);
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
          bearingLabel: `Bearing: ${bearing}°`
        });
      }
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
        color: this.hexToRgba(drawColor, 0.3),
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
      text: isText ? new Text({
        text: "Enter Custom Text",
        font: "12px Arial",
        fill: new Fill({ color: drawColor }),
        stroke: new Stroke({ color: "#fff", width: 2 }),
      }) : undefined,
    });
  }

  private getDefaultStyle(color: string): Style {
    return new Style({
      fill: new Fill({
        color: this.hexToRgba(color, 0.3),
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

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  public clearDrawing() {
    if (this.drawInteraction) {
      this.map.removeInteraction(this.drawInteraction);
      this.drawInteraction = null;
    }
  }

  public startEditing(mode: "vertices" | "translate") {
    this.clearEditing();

    if (mode === "vertices") {
      this.modifyInteraction = new Modify({
        source: this.vectorSource,
      });
      
      this.modifyInteraction.on("modifyend", (event) => {
        event.features.forEach((feature) => {
          this.onFeatureModified(feature as Feature);
        });
      });
      
      this.map.addInteraction(this.modifyInteraction);
    } else {
      this.translateInteraction = new Translate({
        features: new Collection(this.vectorSource.getFeatures()),
      });
      
      this.translateInteraction.on("translateend", (event) => {
        event.features.forEach((feature) => {
          this.onFeatureModified(feature as Feature);
        });
      });
      
      this.map.addInteraction(this.translateInteraction);
    }
  }

  public clearEditing() {
    if (this.modifyInteraction) {
      this.map.removeInteraction(this.modifyInteraction);
      this.modifyInteraction = null;
    }
    if (this.translateInteraction) {
      this.map.removeInteraction(this.translateInteraction);
      this.translateInteraction = null;
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
    return features.find(feature => feature.get("id") === id) || null;
  }

  public highlightFeature(featureId: string) {
    const feature = this.getFeatureById(featureId);
    if (!feature) return;

    // Remove any existing highlight first
    this.unhighlightFeature(featureId);

    // Get the geometry and clone it to avoid any reference issues
    const geometry = feature.getGeometry();
    if (!geometry) return;

    console.log("🎯 Highlighting feature:", {
      featureId,
      geometryType: geometry.getType(),
      bounds: geometry.getExtent()
    });

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
      const styleConfig: any = {
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

    console.log("🎨 Created shadow style for:", geometry.getType(), {
      hasStroke: !!shadowStyle.getStroke(),
      hasFill: !!shadowStyle.getFill(),
      hasImage: !!shadowStyle.getImage()
    });

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
        zIndex: 100000,
        style: shadowStyle, // Set style on layer like old app
      });
      this.map.addLayer(this.highlightLayer);
    }

    // Add highlight feature to layer (style is set on layer level)
    this.highlightLayer.getSource()?.addFeature(highlightFeature);
    
    console.log("✅ Added highlight feature to layer");
  }

  public unhighlightFeature(featureId: string) {
    if (this.highlightLayer) {
      // Clear all features from highlight layer
      this.highlightLayer.getSource()?.clear();
      
      // Remove and cleanup highlight layer
      this.map.removeLayer(this.highlightLayer);
      this.highlightLayer = null;
    }
  }



  public clearAllFeatures() {
    this.vectorSource.clear();
  }

  public loadFeatures(items: MyMapsItem[]) {
    console.log("📥 Loading features", { 
      itemCount: items.length, 
      items: items.map(item => ({
        id: item.id,
        label: item.label,
        labelVisible: item.labelVisible,
        drawType: item.drawType,
        visible: item.visible
      }))
    });
    
    this.clearAllFeatures();
    
    const geoJsonFormat = new GeoJSON({
      dataProjection: "EPSG:3857",
      featureProjection: "EPSG:3857",
    });

    items.forEach((item) => {
      if (item.featureGeoJSON && item.visible) {
        try {
          console.log("📍 Loading individual feature", {
            id: item.id,
            labelVisible: item.labelVisible,
            label: item.label,
            drawType: item.drawType
          });
          
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
          if (item.style) {
            let style: Style;
            
            // Check if it's already a Style object (new approach) or needs conversion (legacy StyleJSON)
            if (item.style instanceof Style) {
              console.log("🎨 Using stored OpenLayers Style object directly");
              style = item.style;
            } else {
              console.log("🎨 Converting legacy StyleJSON to OpenLayers Style");
              style = this.styleFromJSON(item.style as StyleJSON, item.pointType);
            }
            
            feature.setStyle(style);
          }

          this.vectorSource.addFeature(feature);
          console.log("✅ Feature loaded successfully", { id: item.id });

          // Apply label if it was visible when saved (after feature is added to source)
          if (item.labelVisible && item.label) {
            console.log("🏷️ Applying saved label to feature", { 
              id: item.id, 
              label: item.label 
            });
            this.setFeatureLabel(item);
          }
        } catch (error) {
          console.error("Failed to load MyMaps feature:", error);
        }
      }
    });
    
    console.log("🏁 All features loaded", { 
      totalInSource: this.vectorSource.getFeatures().length 
    });
  }

  private styleFromJSON(styleJson: StyleJSON, pointType?: string): Style {
    if (!styleJson) return this.getDefaultStyle("#e809e5");

    const styleConfig: {
      fill?: Fill;
      stroke?: Stroke;
      image?: CircleStyle | RegularShape;
    } = {};

    // Fill
    if (styleJson.fill && styleJson.fill.color) {
      styleConfig.fill = new Fill({
        color: styleJson.fill.color
      });
    }

    // Stroke  
    if (styleJson.stroke && styleJson.stroke.color) {
      styleConfig.stroke = new Stroke({
        color: styleJson.stroke.color,
        width: styleJson.stroke.width || 1,
        lineDash: styleJson.stroke.lineDash
      });
    }

    // Image (CircleStyle or RegularShape for points)
    if (styleJson.image && styleJson.image.radius) {
      const imageFill = styleJson.image.fill ? new Fill({
        color: styleJson.image.fill.color
      }) : new Fill({ color: '#e809e5' });

      const imageStroke = styleJson.image.stroke ? new Stroke({
        color: styleJson.image.stroke.color,
        width: styleJson.image.stroke.width || 1,
        lineDash: styleJson.image.stroke.lineDash
      }) : new Stroke({ color: '#e809e5', width: 1 });

      // Handle different point types (matching old app logic)
      if (!pointType || pointType === "circle") {
        styleConfig.image = new CircleStyle({
          radius: styleJson.image.radius,
          fill: imageFill,
          stroke: imageStroke
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
          stroke: imageStroke
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
    if (this.highlightLayer) {
      this.map.removeLayer(this.highlightLayer);
      this.highlightLayer = null;
    }
    
    // Layer removal will be handled by the layer manager in the component
    // Don't remove layer directly here since layer manager should handle it
  }

  // Label functionality - EXACT match to old app implementation
  public setFeatureLabel(itemInfo: MyMapsItem) {
    console.log("🏷️ MyMapsDrawing: setFeatureLabel called", {
      id: itemInfo.id,
      labelVisible: itemInfo.labelVisible,
      label: itemInfo.label,
      labelRotation: itemInfo.labelRotation,
      timestamp: Date.now()
    });

    const feature = this.getFeatureById(itemInfo.id);
    if (!feature) {
      console.warn("❌ Feature not found for ID:", itemInfo.id);
      return;
    }

    let style = feature.getStyle() as Style;
    if (!style) {
      console.log("⚠️ No style found, creating default style");
      // If no style exists, create a default one
      style = this.getDefaultStyle("#e809e5");
    }

    if (itemInfo.labelVisible && itemInfo.label) {
      console.log("✅ Creating text style for label:", itemInfo.label);
      
      // CRITICAL FIX: Store the label in the feature property first (like old app)
      feature.setProperties({ 
        labelVisible: true, 
        label: itemInfo.label,
        labelRotation: itemInfo.labelRotation || 0
      });
      
      // Use the OLD APP EXACT pattern - let createTextStyle get text from feature
      const textStyle = this.createTextStyleFromFeature(
        feature,
        "label",  // fieldName - matches old app
        itemInfo.labelRotation || 0
      );

      style.setText(textStyle);
      
      console.log("📝 Text style applied to feature", {
        hasTextStyle: !!style.getText(),
        textContent: style.getText()?.getText?.(),
        featureLabel: feature.get("label")
      });
    } else {
      console.log("❌ Removing label (labelVisible=false or no label text)");
      style.setText(null);
      feature.setProperties({ 
        labelVisible: false,
        label: itemInfo.label || "",
        labelRotation: itemInfo.labelRotation || 0
      });
    }
    
    feature.setStyle(style);
    
    // CRITICAL FIX: Force layer to render on top
    this.vectorLayer.setZIndex(9999);
    this.vectorLayer.changed();
    
    // Trigger a redraw to show the changes
    this.vectorSource.changed();
    
    console.log("🏁 MyMapsDrawing: setFeatureLabel completed", {
      featureId: itemInfo.id,
      finalLabelVisible: feature.get("labelVisible"),
      hasTextInStyle: !!style.getText(),
      textContent: style.getText()?.getText?.(),
      layerZIndex: this.vectorLayer.getZIndex(),
      vectorSourceFeatureCount: this.vectorSource.getFeatures().length,
      timestamp: Date.now()
    });
  }

  // Create text style from feature - EXACT old app implementation
  private createTextStyleFromFeature(
    feature: Feature,
    fieldName: string = "label",
    rotation: number = 0
  ): Text {
    console.log("📝 Creating text style from feature - OLD APP EXACT MATCH", {
      fieldName,
      rotation,
      featureLabel: feature.get(fieldName)
    });
    
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
    const align = "center";  // default from old app
    const baseline = "middle";  // default from old app
    const size = "15px";
    const offsetX = 0;  // default from old app
    const offsetY = -8;
    const weight = "bold";
    const placement = "point";  // default from old app
    const overflow = true;  // OLD APP param #12
    const rotationInRadians = rotation * (Math.PI / 180);  // OLD APP conversion
    const font = "arial";  // default from old app
    const fillColor = "black";  // default from old app (param #15 undefined)
    const outlineColor = "#ffffff";  // OLD APP param #16 - WHITE OUTLINE!
    const outlineWidth = 0.4;  // OLD APP param #17
    
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
    
    console.log("✅ OLD APP EXACT text style created from feature", {
      text: textStyle.getText(),
      font: textStyle.getFont(),
      fillColor: textStyle.getFill()?.getColor(),
      strokeColor: textStyle.getStroke()?.getColor(),
      strokeWidth: textStyle.getStroke()?.getWidth(),
      rotation: textStyle.getRotation(),
      offsetY: textStyle.getOffsetY(),
      overflow: textStyle.getOverflow()
    });
    
    return textStyle;
  }

  // Create text style matching the old app's exact implementation
  private createTextStyle(
    text: string,
    fontSize: string = "15px",
    fontWeight: string = "bold",
    rotation: number = 0,
    offsetY: number = -8
  ): Text {
    console.log("📝 Creating text style - OLD APP EXACT MATCH", {
      text,
      fontSize,
      fontWeight,
      rotation,
      offsetY
    });
    
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
        width: 0.4 // EXACT match old app param #17
      }),
      textAlign: 'center',  // Old app centers text
      textBaseline: 'middle', // Old app middle baseline
      offsetY: offsetY,      // EXACT match old app param #8 (-8)
      rotation: rotationInRadians, // EXACT match old app param #13
      overflow: true, // Allow text overflow
      placement: 'point' // Ensure text renders on point features
    });
    
    console.log("✅ OLD APP EXACT text style created", {
      text: textStyle.getText(),
      font: textStyle.getFont(),
      fillColor: textStyle.getFill()?.getColor(),
      strokeColor: textStyle.getStroke()?.getColor(),
      strokeWidth: textStyle.getStroke()?.getWidth(),
      rotation: textStyle.getRotation(),
      offsetY: textStyle.getOffsetY()
    });
    
    return textStyle;
  }

  // Update feature label text only (when user types in input)
  public updateFeatureLabel(featureId: string, newLabel: string) {
    const feature = this.getFeatureById(featureId);
    if (!feature) return;

    feature.setProperties({ label: newLabel });
    
    // If label is currently visible, update the text style
    if (feature.get("labelVisible")) {
      const style = feature.getStyle() as Style;
      if (style && style.getText()) {
        const currentTextStyle = style.getText()!;
        const newTextStyle = this.createTextStyle(
          newLabel,
          "15px",
          "bold",
          feature.get("labelRotation") || 0,
          -8
        );
        
        style.setText(newTextStyle);
        feature.setStyle(style);
        this.vectorSource.changed();
      }
    }
  }

  // Update feature label rotation (when user moves slider)
  public updateFeatureLabelRotation(featureId: string, rotation: number) {
    const feature = this.getFeatureById(featureId);
    if (!feature) return;

    feature.setProperties({ labelRotation: rotation });
    
    // If label is currently visible, update the rotation
    if (feature.get("labelVisible")) {
      const style = feature.getStyle() as Style;
      if (style && style.getText()) {
        const label = feature.get("label") || "";
        
        // Apply bearing rotation adjustment for Bearing and Measure tools (like original app)
        let displayRotation = rotation;
        const drawType = feature.get("drawType") || feature.get("originalDrawType");
        if (drawType === "Bearing" || drawType === "Measure") {
          // Use the same rotation logic as original app: bearing > 180 ? bearing + 90 : bearing - 90
          displayRotation = rotation > 180 ? rotation + 90 : rotation - 90;
        }
        
        const newTextStyle = this.createTextStyle(
          label,
          "15px", 
          "bold",
          displayRotation,
          -8
        );
        
        style.setText(newTextStyle);
        feature.setStyle(style);
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
        console.log("🎨 Using OpenLayers Style object directly (new approach)");
        newStyle = styleOrJSON;
      } else {
        console.log("🎨 Converting StyleJSON to OpenLayers Style (legacy approach)");
        newStyle = this.styleFromJSON(styleOrJSON, pointType);
      }
      
      // Preserve existing text style if feature has a label
      const currentStyle = feature.getStyle() as Style;
      if (currentStyle && currentStyle.getText() && feature.get("labelVisible")) {
        newStyle.setText(currentStyle.getText());
      }
      
      // Apply new style to feature
      feature.setStyle(newStyle);
      
      // Trigger map refresh
      this.vectorSource.changed();
      
      console.log("✅ Feature style updated successfully:", { 
        featureId, 
        pointType, 
        hasTextStyle: !!newStyle.getText(),
        styleType: styleOrJSON instanceof Style ? "OpenLayers Style" : "StyleJSON"
      });
    } catch (error) {
      console.error("❌ Error updating feature style:", error);
    }
  }

  // Debug method to check current state
  public debugState() {
    // Debug method for development - can be removed in production
  }
}
