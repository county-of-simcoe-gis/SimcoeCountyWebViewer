import React, { Component } from "react";
import { CompactPicker } from "react-color";
import * as helpers from "../../../helpers/helpers";
import * as drawingHelpers from "../../../helpers/drawingHelpers";
import "./MyMapsSymbolizer.css";
import ColorPicker from "./ColorPicker";
import { 
  PointType, StyleSize, FillColor, StrokeType, StrokeColor, StrokeWidth, Rotation,
  LabelTextColor, LabelFontSize, LabelOutlineColor, LabelOutlineWidth, 
  CalloutBackgroundColor, CalloutBorderColor, CalloutLineColor, CalloutAnchorColor 
} from "./MyMapsSymbolizerComponents";

class MyMapsSymbolizer extends Component {
  constructor(props) {
    super(props);

    this.pointStyleOptions = [
      { value: "circle", label: "Circle" },
      { value: "cross", label: "Cross" },
    ];
    this.dropDown = React.createRef();
    this.colorPickerButtonId = "sc-mymaps-color-picker-button";

    // SIZE
    this.sliderRadiusMin = 1;
    this.sliderRadiusMax = 100;

    // FILL OPACITY
    this.sliderFillOpacityMin = 0;
    this.sliderFillOpacityMax = 1;

    // STROKE OPACITY
    this.sliderStrokeOpacityMin = 0;
    this.sliderStrokeOpacityMax = 1;

    // STROKE WIDTH
    this.sliderStrokeWidthMin = 1;
    this.sliderStrokeWidthMax = 10;

    // ANGLE
    this.sliderRotationMin = 0;
    this.sliderRotationMax = 6.28319;

    let fillColor = [0, 0, 0, 0.8];
    if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint")
      fillColor = this.props.item.style.image_.fill_ === null ? [0, 0, 0, 0.8] : this.props.item.style.image_.fill_.color_;
    else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon")
      fillColor = this.props.item.style.fill_ === null ? [0, 0, 0, 0] : this.props.item.style.fill_.color_;

    let strokeColor = [0, 0, 0, 0.8];
    let strokeWidth = 1;
    if (this.props.item.geometryType === "Point") {
      strokeColor = this.props.item.style.image_.stroke_.color_;
      strokeWidth = this.props.item.style.image_.stroke_.width_;
    } else {
      if (this.props.item.style !== null) {
        strokeColor = this.props.item.style.stroke_.color_;
        strokeWidth = this.props.item.style.stroke_.width_;
      }
    }

    const pointType = this.props.item.pointType !== undefined ? this.props.item.pointType : "circle";
    const strokeType = this.props.item.strokeType !== undefined ? this.props.item.strokeType : "normal";

    // Get label style from item or use defaults
    const labelStyle = this.props.item.labelStyle || drawingHelpers.getDefaultLabelStyle(this.props.item.drawType);

    this.state = {
      fillColorPickerVisible: false,
      selectedPointStyleDropDown: pointType,
      selectedStrokeTypeDropDown: strokeType,
      selectedPolygonStyleDropDown: "circle",
      selectedPolygonStrokeDropDown: "normal",
      strokeColor: {
        r: strokeColor[0],
        g: strokeColor[1],
        b: strokeColor[2],
        a: strokeColor[3],
      },
      strokeWidth: strokeWidth,
      strokeAlpha: strokeColor[3],
      fillColor: {
        r: fillColor[0],
        g: fillColor[1],
        b: fillColor[2],
        a: fillColor[3],
      },
      fillAlpha: fillColor[3],
      radius: this.props.item.style !== null && this.props.item.style.image_ !== null ? this.props.item.style.image_.radius_ : 0,
      rotation: this.props.item.style !== null && this.props.item.style.image_ !== null ? this.props.item.style.image_.rotation_ : 0,
      // Label style state
      textColor: labelStyle.textColor || "#000000",
      textSize: labelStyle.textSize || "14px",
      labelOutlineColor: labelStyle.outlineColor || "#000000",
      labelOutlineWidth: labelStyle.outlineWidth || 1,
      // Callout-specific
      backgroundColor: labelStyle.backgroundColor || "rgba(255, 255, 255, 0.95)",
      borderColor: labelStyle.borderColor || "#333333",
      lineColor: labelStyle.lineColor || "#333333",
      anchorColor: labelStyle.anchorColor || "#333333",
    };
  }

  // POINT TYPES
  onPointStyleDropDown = (evt) => {
    this.setState({ selectedPointStyleDropDown: evt.target.value });

    const style = drawingHelpers.getPointStyle(
      evt.target.value,
      this.state.radius,
      [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
      this.state.strokeWidth,
      [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
      this.state.rotation,
      this.state.selectedStrokeTypeDropDown
    );
    console.log(style);
    this.props.onPointStyleDropDown(this.props.item.id, style, evt.target.value);
  };

  // POINT OUTLINE TYPE
  //onStrokeTypeDropDown
  onStrokeTypeDropDown = (evt) => {
    this.setState({ selectedStrokeTypeDropDown: evt.target.value });

    let style = null;
    if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint") {
      style = drawingHelpers.getPointStyle(
        this.state.selectedPointStyleDropDown,
        this.state.radius,
        [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
        this.state.strokeWidth,
        [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
        this.state.rotation,
        evt.target.value
      );
    } else if (this.props.item.geometryType === "LineString" || this.props.item.geometryType === "MultiLineString") {
      style = drawingHelpers.getLineStringStyle([this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha], this.state.strokeWidth, evt.target.value);
    } else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon") {
      style = drawingHelpers.getPolygonStyle(
        [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
        this.state.strokeWidth,
        [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
        evt.target.value
      );
    }
    console.log(style);
    this.props.onStrokeTypeDropDown(this.props.item.id, style, evt.target.value);
    console.log(this.props.item);
  };

  // RADIUS/SIZE SLIDER
  onRadiusSliderChange = (evt) => {
    this.setState({ radius: evt.target.value });
    const style = drawingHelpers.getPointStyle(
      this.state.selectedPointStyleDropDown,
      evt.target.value,
      [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
      this.state.strokeWidth,
      [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
      this.state.rotation,
      this.state.selectedStrokeTypeDropDown
    );
    this.props.onRadiusSliderChange(this.props.item.id, style);
  };

  // STROKE WIDTH SLIDER
  onStrokeWidthSliderChange = (evt) => {
    this.setState({ strokeWidth: evt.target.value });
    let style = null;

    if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint") {
      style = drawingHelpers.getPointStyle(
        this.state.selectedPointStyleDropDown,
        this.state.radius,
        [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
        evt.target.value,
        [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
        this.state.rotation,
        this.state.selectedStrokeTypeDropDown
      );
    } else if (this.props.item.geometryType === "LineString" || this.props.item.geometryType === "MultiLineString") {
      style = drawingHelpers.getLineStringStyle(
        [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
        evt.target.value,
        this.state.selectedStrokeTypeDropDown
      );
    } else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon") {
      style = drawingHelpers.getPolygonStyle(
        [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
        evt.target.value,
        [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
        this.state.selectedStrokeTypeDropDown
      );
    }

    this.props.onStrokeWidthSliderChange(this.props.item.id, style);
  };

  // OPACITY FILL SLIDER
  onFillOpacitySliderChange = (evt) => {
    this.setState({ fillAlpha: evt.target.value });
    let style = null;

    if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint") {
      style = drawingHelpers.getPointStyle(
        this.state.selectedPointStyleDropDown,
        this.state.radius,
        [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
        this.state.strokeWidth,
        [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, evt.target.value],
        this.state.rotation,
        this.state.selectedStrokeTypeDropDown
      );
    } else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon") {
      style = drawingHelpers.getPolygonStyle(
        [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
        this.state.strokeWidth,
        [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, evt.target.value],
        this.state.selectedStrokeTypeDropDown
      );
    }

    this.props.onFillOpacitySliderChange(this.props.item.id, style);
  };

  // OPACITY STROKE SLIDER
  onStrokeOpacitySliderChange = (evt) => {
    this.setState({ strokeAlpha: evt.target.value });
    let style = null;

    if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint") {
      style = drawingHelpers.getPointStyle(
        this.state.selectedPointStyleDropDown,
        this.state.radius,
        [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, evt.target.value],
        this.state.strokeWidth,
        [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
        this.state.rotation,
        this.state.selectedStrokeTypeDropDown
      );
    } else if (this.props.item.geometryType === "LineString" || this.props.item.geometryType === "MultiLineString") {
      style = drawingHelpers.getLineStringStyle(
        [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, evt.target.value],
        this.state.strokeWidth,
        this.state.selectedStrokeTypeDropDown
      );
    } else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon") {
      style = drawingHelpers.getPolygonStyle(
        [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, evt.target.value],
        this.state.strokeWidth,
        [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
        this.state.selectedStrokeTypeDropDown
      );
    }

    this.props.onStrokeOpacitySliderChange(this.props.item.id, style);
  };

  // ROTATION SLIDER
  onRotationSliderChange = (evt) => {
    this.setState({ rotation: evt.target.value });
    const style = drawingHelpers.getPointStyle(
      this.state.selectedPointStyleDropDown,
      this.state.radius,
      [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
      this.state.strokeWidth,
      [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
      evt.target.value,
      this.state.selectedStrokeTypeDropDown
    );
    this.props.onRotationSliderChange(this.props.item.id, style);
  };

  // FILL COLOR PICKER
  onFillColorPickerChange = (color) => {
    this.setState({ fillColor: color.rgb });
    let style = null;
    if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint") {
      style = drawingHelpers.getPointStyle(
        this.state.selectedPointStyleDropDown,
        this.state.radius,
        [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
        this.state.strokeWidth,
        [color.rgb.r, color.rgb.g, color.rgb.b, this.state.fillAlpha],
        this.state.rotation,
        this.state.selectedStrokeTypeDropDown
      );
    } else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon") {
      style = drawingHelpers.getPolygonStyle(
        [this.state.strokeColor.r, this.state.strokeColor.g, this.state.strokeColor.b, this.state.strokeAlpha],
        this.state.strokeWidth,
        [color.rgb.r, color.rgb.g, color.rgb.b, this.state.fillAlpha],
        this.state.selectedStrokeTypeDropDown
      );
    }

    this.props.onFillColorPickerChange(this.props.item.id, style);
  };

  // STROKE COLOR PICKER
  onStrokeColorPickerChange = (color) => {
    this.setState({ strokeColor: color.rgb });

    let style = null;
    if (this.props.item.geometryType === "Point" || this.props.item.geometryType === "MultiPoint") {
      style = drawingHelpers.getPointStyle(
        this.state.selectedPointStyleDropDown,
        this.state.radius,
        [color.rgb.r, color.rgb.g, color.rgb.b, this.state.strokeAlpha],
        this.state.strokeWidth,
        [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
        this.state.rotation,
        this.state.selectedStrokeTypeDropDown
      );
    } else if (this.props.item.geometryType === "LineString" || this.props.item.geometryType === "MultiLineString") {
      style = drawingHelpers.getLineStringStyle([color.rgb.r, color.rgb.g, color.rgb.b, this.state.strokeAlpha], this.state.strokeWidth, this.state.selectedStrokeTypeDropDown);
    } else if (this.props.item.geometryType === "Polygon" || this.props.item.geometryType === "MultiPolygon") {
      style = drawingHelpers.getPolygonStyle(
        [color.rgb.r, color.rgb.g, color.rgb.b, this.state.strokeAlpha],
        this.state.strokeWidth,
        [this.state.fillColor.r, this.state.fillColor.g, this.state.fillColor.b, this.state.fillAlpha],
        this.state.selectedStrokeTypeDropDown
      );
    }

    this.props.onStrokeColorPickerChange(this.props.item.id, style);
  };

  // FILL BUTTON COLOR PICKER
  onFillColorPickerButton = (evt) => {
    if (this.state.fillColorPickerVisible) this.setState({ fillColorPickerVisible: false });
    else this.setState({ fillColorPickerVisible: true });

    const compactPicker = <CompactPicker color={this.state.fillColor} onChangeComplete={this.onFillColorPickerChange} />;
    const colorPicker = new ColorPicker(evt, compactPicker, this.colorPickerButtonId);
    colorPicker.show();
  };

  // OUTLINE BUTTON COLOR PICKER
  onStrokeColorPickerButton = (evt) => {
    if (this.state.outlineColorPickerVisible) this.setState({ outlineColorPickerVisible: false });
    else this.setState({ outlineColorPickerVisible: true });

    const compactPicker = <CompactPicker color={this.state.strokeColor} onChangeComplete={this.onStrokeColorPickerChange} />;
    const colorPicker = new ColorPicker(evt, compactPicker, this.colorPickerButtonId);
    colorPicker.show();
  };

  // LABEL STYLE HANDLERS
  onTextColorChange = (color) => {
    this.setState({ textColor: color.hex });
    this.props.onLabelStyleChange && this.props.onLabelStyleChange(this.props.item.id, { textColor: color.hex });
  };

  onTextColorPickerButton = (evt) => {
    const compactPicker = <CompactPicker color={this.state.textColor} onChangeComplete={this.onTextColorChange} />;
    const colorPicker = new ColorPicker(evt, compactPicker, "sc-mymaps-text-color-picker");
    colorPicker.show();
  };

  onFontSizeChange = (evt) => {
    const newSize = evt.target.value;
    this.setState({ textSize: newSize });
    this.props.onLabelStyleChange && this.props.onLabelStyleChange(this.props.item.id, { textSize: newSize });
  };

  onLabelOutlineColorChange = (color) => {
    this.setState({ labelOutlineColor: color.hex });
    this.props.onLabelStyleChange && this.props.onLabelStyleChange(this.props.item.id, { outlineColor: color.hex });
  };

  onLabelOutlineColorPickerButton = (evt) => {
    const compactPicker = <CompactPicker color={this.state.labelOutlineColor} onChangeComplete={this.onLabelOutlineColorChange} />;
    const colorPicker = new ColorPicker(evt, compactPicker, "sc-mymaps-label-outline-color-picker");
    colorPicker.show();
  };

  onLabelOutlineWidthChange = (evt) => {
    const width = parseFloat(evt.target.value);
    this.setState({ labelOutlineWidth: width });
    this.props.onLabelStyleChange && this.props.onLabelStyleChange(this.props.item.id, { outlineWidth: width });
  };

  // CALLOUT-SPECIFIC HANDLERS
  onBackgroundColorChange = (color) => {
    this.setState({ backgroundColor: color.hex });
    this.props.onLabelStyleChange && this.props.onLabelStyleChange(this.props.item.id, { backgroundColor: color.hex });
  };

  onBackgroundColorPickerButton = (evt) => {
    const compactPicker = <CompactPicker color={this.state.backgroundColor} onChangeComplete={this.onBackgroundColorChange} />;
    const colorPicker = new ColorPicker(evt, compactPicker, "sc-mymaps-bg-color-picker");
    colorPicker.show();
  };

  onBorderColorChange = (color) => {
    this.setState({ borderColor: color.hex });
    this.props.onLabelStyleChange && this.props.onLabelStyleChange(this.props.item.id, { borderColor: color.hex });
  };

  onBorderColorPickerButton = (evt) => {
    const compactPicker = <CompactPicker color={this.state.borderColor} onChangeComplete={this.onBorderColorChange} />;
    const colorPicker = new ColorPicker(evt, compactPicker, "sc-mymaps-border-color-picker");
    colorPicker.show();
  };

  onLineColorChange = (color) => {
    this.setState({ lineColor: color.hex });
    this.props.onLabelStyleChange && this.props.onLabelStyleChange(this.props.item.id, { lineColor: color.hex });
  };

  onLineColorPickerButton = (evt) => {
    const compactPicker = <CompactPicker color={this.state.lineColor} onChangeComplete={this.onLineColorChange} />;
    const colorPicker = new ColorPicker(evt, compactPicker, "sc-mymaps-line-color-picker");
    colorPicker.show();
  };

  onAnchorColorChange = (color) => {
    this.setState({ anchorColor: color.hex });
    this.props.onLabelStyleChange && this.props.onLabelStyleChange(this.props.item.id, { anchorColor: color.hex });
  };

  onAnchorColorPickerButton = (evt) => {
    const compactPicker = <CompactPicker color={this.state.anchorColor} onChangeComplete={this.onAnchorColorChange} />;
    const colorPicker = new ColorPicker(evt, compactPicker, "sc-mymaps-anchor-color-picker");
    colorPicker.show();
  };

  render() {
    // ADJUST THE COLOR FOR HTML
    const rgbFill = "rgb(" + this.state.fillColor.r + "," + this.state.fillColor.g + "," + this.state.fillColor.b + ")";
    const rgbStroke = "rgb(" + this.state.strokeColor.r + "," + this.state.strokeColor.g + "," + this.state.strokeColor.b + ")";
    const geometryType = this.props.item.geometryType;

    return (
      <div className={this.props.visible ? "sc-fieldset" : "sc-hidden"}>
        <legend>
          <img src={images["symbolizer.png"]} alt="symbolizer" />
          Symbolizer
        </legend>
        <div className="sc-mymaps-symbolizer-container">
          {/* POINT TYPE */}
          <PointType
            key={helpers.getUID()}
            visible={geometryType === "Point" ? true : false}
            selectedPointStyleDropDown={this.state.selectedPointStyleDropDown}
            onPointStyleDropDown={this.onPointStyleDropDown}
          />

          {/* PRINTING WILL NOT SUPPORT THIS??? */}
          {/* <PolygonType
            visible={geometryType === "Polygon" ? true : false}
            selectedPolygonStyleDropDown={this.state.selectedPolygonStyleDropDown}
            onPolygonStyleDropDown={this.onPolygonStyleDropDown}
          /> */}

          {/* STYLE SIZE */}
          <StyleSize
            visible={geometryType === "Point" ? true : false}
            sliderRadiusMin={this.sliderRadiusMin}
            sliderRadiusMax={this.sliderRadiusMax}
            radius={this.state.radius}
            onRadiusSliderChange={this.onRadiusSliderChange}
          />

          {/* FILL COLOR */}
          <FillColor
            visible={geometryType === "Point" || geometryType === "Polygon" || geometryType === "MultiPolygon" ? true : false}
            colorPickerButtonId={this.colorPickerButtonId}
            onFillColorPickerButton={this.onFillColorPickerButton}
            sliderFillOpacityMin={this.sliderFillOpacityMin}
            sliderFillOpacityMax={this.sliderFillOpacityMax}
            fillAlpha={this.state.fillAlpha}
            onFillOpacitySliderChange={this.onFillOpacitySliderChange}
            rgbFill={rgbFill}
            isPolygon={this.props.item.geometryType === "Polygon" || geometryType === "MultiPolygon" ? true : false}
          />

          {/* STROKE TYPE */}
          <StrokeType selectedStrokeTypeDropDown={this.state.selectedStrokeTypeDropDown} onStrokeTypeDropDown={this.onStrokeTypeDropDown} />

          {/* STROKE COLOR */}
          <StrokeColor
            colorPickerButtonId={this.colorPickerButtonId}
            rgbStroke={rgbStroke}
            onStrokeColorPickerButton={this.onStrokeColorPickerButton}
            sliderStrokeOpacityMin={this.sliderStrokeOpacityMin}
            sliderStrokeOpacityMax={this.sliderStrokeOpacityMax}
            strokeAlpha={this.state.strokeAlpha}
            onStrokeOpacitySliderChange={this.onStrokeOpacitySliderChange}
          />

          {/* STROKE WIDTH */}
          <StrokeWidth
            sliderStrokeWidthMin={this.sliderStrokeWidthMin}
            sliderStrokeWidthMax={this.sliderStrokeWidthMax}
            strokeWidth={this.state.strokeWidth}
            onStrokeWidthSliderChange={this.onStrokeWidthSliderChange}
          />

          {/* ROTATION */}
          <Rotation
            visible={geometryType === "Point" ? true : false}
            sliderRotationMin={this.sliderRotationMin}
            sliderRotationMax={this.sliderRotationMax}
            rotation={this.state.rotation}
            onRotationSliderChange={this.onRotationSliderChange}
          />

          {/* LABEL STYLE SECTION - only show when label is visible */}
          {this.props.item.labelVisible && (
            <>
              <div className="sc-mymaps-symbolizer-divider">Label Style</div>
              
              {/* Text Color */}
              <LabelTextColor
                visible={true}
                colorPickerButtonId="sc-mymaps-text-color-picker"
                textColor={this.state.textColor}
                onTextColorPickerButton={this.onTextColorPickerButton}
              />

              {/* Font Size */}
              <LabelFontSize
                visible={true}
                fontSize={this.state.textSize}
                onFontSizeChange={this.onFontSizeChange}
              />

              {/* Label Outline Color */}
              <LabelOutlineColor
                visible={true}
                colorPickerButtonId="sc-mymaps-label-outline-color-picker"
                outlineColor={this.state.labelOutlineColor}
                onOutlineColorPickerButton={this.onLabelOutlineColorPickerButton}
              />

              {/* Label Outline Width */}
              <LabelOutlineWidth
                visible={true}
                outlineWidth={this.state.labelOutlineWidth}
                onOutlineWidthChange={this.onLabelOutlineWidthChange}
              />

              {/* Callout-specific controls */}
              {this.props.item.drawType === "Callout" && (
                <>
                  <div className="sc-mymaps-symbolizer-divider">Callout Style</div>
                  
                  <CalloutBackgroundColor
                    visible={true}
                    colorPickerButtonId="sc-mymaps-bg-color-picker"
                    backgroundColor={this.state.backgroundColor}
                    onBackgroundColorPickerButton={this.onBackgroundColorPickerButton}
                  />

                  <CalloutBorderColor
                    visible={true}
                    colorPickerButtonId="sc-mymaps-border-color-picker"
                    borderColor={this.state.borderColor}
                    onBorderColorPickerButton={this.onBorderColorPickerButton}
                  />

                  <CalloutLineColor
                    visible={true}
                    colorPickerButtonId="sc-mymaps-line-color-picker"
                    lineColor={this.state.lineColor}
                    onLineColorPickerButton={this.onLineColorPickerButton}
                  />

                  <CalloutAnchorColor
                    visible={true}
                    colorPickerButtonId="sc-mymaps-anchor-color-picker"
                    anchorColor={this.state.anchorColor}
                    onAnchorColorPickerButton={this.onAnchorColorPickerButton}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
}

export default MyMapsSymbolizer;

// IMPORT ALL IMAGES
import { createImagesObject } from "../../../helpers/imageHelper";
const images = createImagesObject(
  import.meta.glob('./images/*.{png,jpg,jpeg,svg,gif}', { eager: true, query: '?url', import: 'default' })
);
