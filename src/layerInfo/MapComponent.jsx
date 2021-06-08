import React, { Component } from 'react';
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import './mapComponent.css';
import {defaults as defaultControls, ScaleLine, FullScreen} from 'ol/control.js';
import { OSM, TileArcGISRest } from "ol/source.js";
import TileLayer from "ol/layer/Tile.js";
import { Fill, Icon, Stroke, Style, Circle as CircleStyle } from "ol/style.js";
import {Extent} from 'ol/extent';
import {buffer as BufferExtent} from 'ol/extent';
import {fromExtent as PolygonFromExtent} from 'ol/geom/Polygon';
import Feature from 'ol/Feature';
import { Vector as VectorLayer } from "ol/layer";
import {Vector as VectorSource } from "ol/source.js";

const scaleLineControl = new ScaleLine();

// STYLES
const styles = {
  poly: new Style({
    stroke: new Stroke({
      width: 4,
      color: [255, 0, 0, 0.8]
    })
  }),
};

class MapComponent extends Component {

  constructor(props) {
    super(props); 

    this.state = {

    }

  }

  componentDidMount() {

    // TWEEK TO CENTER MAP DEPENDING ON MODE
    const centerCoords = [-8875141.45, 5543492.45];

    var map = new Map({
      controls: defaultControls().extend([
        scaleLineControl,
        new FullScreen()
      ]),
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      target: 'map',
      view: new View({
        center: centerCoords,
        zoom: 8
      })
    });

    window.map = map;

    // CREATE EXTENT
    //var extent = [minlon, minlat, maxlon, maxlat];
    // var extent = [-8969156.9680, 5382677.0565, -8765834.4727, 5702183.8348];
    // var polygon = PolygonFromExtent(extent);
    // var bufferPolygon = BufferExtent(extent, 5000);
    var polygon = PolygonFromExtent(this.props.extent);
    var bufferPolygon = BufferExtent(this.props.extent, 5000);
    var feature = new Feature(polygon);
    var extentLayer = new VectorLayer({
      style: styles.poly,
      source: new VectorSource({
            features: [feature]
    })});
    map.getView().fit(bufferPolygon, map.getSize());
    map.addLayer(extentLayer);

  }

  render() {

    return (
      <div>
        <div id="map"></div>
      </div>
    )
  }
}

export default MapComponent;
