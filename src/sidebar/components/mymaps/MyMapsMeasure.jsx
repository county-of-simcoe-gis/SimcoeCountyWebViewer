import React, { Component } from "react";
import "./MyMapsMeasure.css";
import { getArea, getLength } from "ol/sphere.js";
import * as helpers from "../../../helpers/helpers";

class MyMapsMeasure extends Component {
  constructor(props) {
    super(props);
    this.state = {
      units: "meters",
      result: "",
      autoFormat: true,
    };
  }

  componentDidMount = () => {
    if (this.props.item.geometryType === "Polygon")
      this.setState({ units: "acres" }, () => {
        this.updateResults();
      });
    else {
      this.setState({ units: "meters" }, () => {
        this.updateResults();
      });
    }
  };

  onUnitChange = (evt) => {
    this.setState({ units: evt.target.value }, () => {
      this.updateResults();
    });
  };

  updateResults = () => {
    if (this.props.item.geometryType === "LineString") {
      this.setState({ result: this.formatLength(helpers.getFeatureFromGeoJSON(this.props.item.featureGeoJSON).getGeometry()) });
    } else if (this.props.item.geometryType === "Polygon") {
      this.setState({ result: this.formatArea(helpers.getFeatureFromGeoJSON(this.props.item.featureGeoJSON).getGeometry()) });
    }
  };

  convertFromMetersLine = (distance) => {
    if (this.state.units === "meters") return distance;
    else if (this.state.units === "kilometers") return distance / 1000;
    else if (this.state.units === "miles") return distance / 1609.34;
    else if (this.state.units === "feet") return distance * 3.281;
    else if (this.state.units === "yards") return distance / 0.9144;
    else if (this.state.units === "nauticalMiles") {
      return distance / 1852;
    }
  };

  convertFromMetersPolygon = (area) => {
    if (this.state.units === "square meters") return area;
    else if (this.state.units === "acres") return area / 4046.856;
    else if (this.state.units === "square feet") return area * 10.764;
    else if (this.state.units === "square kilometers") return area / 1000000;
    else if (this.state.units === "square miles") return area * 0.000000038610215855;
    else if (this.state.units === "hectares") return area / 10000;
  };

  // Format length output.
  formatLength = (line) => {
    var length = this.convertFromMetersLine(getLength(line));
    if (this.state.autoFormat) {
      return this.numberWithCommas(Number(Math.round(length + "e" + 3) + "e-" + 3));
    } else {
      return length;
    }
  };

  // Format area output.
  formatArea = (polygon) => {
    var area = this.convertFromMetersPolygon(getArea(polygon));
    if (this.state.autoFormat) {
      return this.numberWithCommas(Number(Math.round(area + "e" + 3) + "e-" + 3));
    } else {
      return area;
    }
  };

  onAutoFormatChange = (evt) => {
    this.setState({ autoFormat: evt.target.checked }, () => {
      this.updateResults();
    });
  };

  numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  render() {
    return (
      <div className={this.props.visible ? "sc-fieldset" : "sc-hidden"}>
        <legend>
          <img src={images["measure.png"]} alt="measure" />
          &nbsp; Measure
        </legend>
        <div className="sc-mymaps-measure-container">
          <label>Measurement Units:</label>
          <label className="sc-mymaps-measure-auto-format-label">
            Auto Format
            <input type="checkbox" checked={this.state.autoFormat} onChange={this.onAutoFormatChange} />
          </label>
          <select className={this.props.item.geometryType === "LineString" ? "sc-mymaps-measure-units" : "sc-hidden"} name="lineUnits" value={this.state.units} onChange={this.onUnitChange}>
            <option value="meters">Meters</option>
            <option value="kilometers">Kilometers</option>
            <option value="feet">Feet</option>
            <option value="miles">Miles</option>
            <option value="yards">Yards</option>
            <option value="nauticalMiles">Nautical Miles</option>
          </select>
          <select className={this.props.item.geometryType === "Polygon" ? "sc-mymaps-measure-units" : "sc-hidden"} name="lineUnits" value={this.state.units} onChange={this.onUnitChange}>
            <option value="acres">Acres</option>
            <option value="hectares">Hectares</option>
            <option value="square meters">Square Meters</option>
            <option value="square feet">Feet</option>
            <option value="square kilometers">Square Kilometers</option>
            <option value="square miles">Square Miles</option>
          </select>
          <input className="sc-mymaps-measure-result" readOnly value={this.state.result} />
        </div>
      </div>
    );
  }
}

export default MyMapsMeasure;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
