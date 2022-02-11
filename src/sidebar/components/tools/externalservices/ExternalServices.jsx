import React, { Component } from "react";
import "./ExternalServices.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import * as config from "./config.json";
import GeoJSON from "ol/format/GeoJSON.js";
import { Vector as VectorLayer } from "ol/layer.js";
import { Vector as VectorSource } from "ol/source.js";
import { Icon, Style } from "ol/style.js";
import Point from "ol/geom/Point";
import Feature from "ol/Feature";
import { unByKey } from "ol/Observable.js";

const parcelURLTemplate = (mainURL, x, y) => `${mainURL}&cql_filter=INTERSECTS(geom,%20POINT%20(${x}%20${y}))`;

class ExternalServices extends Component {
  constructor(props) {
    super(props);

    this.state = {
      groups: config.groups,
      coords: [0, 0],
      address: "",
    };
  }

  componentDidMount() {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      this.mapClickListener = this.onMapClickEvent = window.map.on("click", this.onMapClick);
      this.createPointLayer();
      window.disableParcelClick = true;
    });
  }

  // POINT LAYER TO STORE SEARCH RESULTS
  createPointLayer = () => {
    var iconStyle = new Style({
      image: new Icon({
        src: images["marker.png"],
      }),
    });

    const center = window.map.getView().getCenter();
    this.setState({ coords: helpers.toLatLongFromWebMercator(center) });
    const feature = new Feature(new Point(center));
    this.vectorLayer = new VectorLayer({
      zIndex: 10000,
      source: new VectorSource({
        features: [feature],
      }),
      style: iconStyle,
    });

    window.map.addLayer(this.vectorLayer);
    this.updateFeature(center);
  };

  onMapClick = (evt) => {
    this.updateFeature(evt.coordinate);
  };

  updateFeature = (coords) => {
    const latLongCoords = helpers.toLatLongFromWebMercator(coords);
    this.setState({ coords: latLongCoords });
    const feature = new Feature(new Point(coords));
    this.vectorLayer.getSource().clear();
    this.vectorLayer.getSource().addFeature(feature);

    const parcelURL = parcelURLTemplate(window.config.parcelLayer.url, coords[0], coords[1]);
    helpers.getJSON(parcelURL, (result) => {
      if (result.features.length === 0) return;

      const geoJSON = new GeoJSON().readFeatures(result);
      const feature = geoJSON[0];

      if (feature !== undefined) {
        const arn = feature.get("arn");
        const infoURL = window.config.propertyReportUrl + arn;
        helpers.getJSON(infoURL, (result) => {
          const address = result.Address;
          this.setState({ address });
        });
      } else this.setState({ address: null });
    });
  };

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)
    window.map.removeLayer(this.vectorLayer);
    window.disableParcelClick = false;
    unByKey(this.mapClickListener);

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  render() {
    return (
      <PanelComponent onClose={this.onClose} name={this.props.name} helpLink={this.props.helpLink} hideHeader={this.props.hideHeader} type="tools">
        <div className="sc-tool-external-services-container" style={{ fontSize: "11pt" }}>
          Explore a selected location using a variety of external service providers (i.e. Google Maps, Yahoo and Bing). Simply click on a location and select the desired link that appears.
          <div>
            {this.state.groups.map((group) => (
              <ExternalServicesGroup key={helpers.getUID()} group={group} coords={this.state.coords} address={this.state.address}></ExternalServicesGroup>
            ))}
          </div>
        </div>
      </PanelComponent>
    );
  }
}

export default ExternalServices;

const ExternalServicesGroup = (props) => {
  const { group, coords, address } = props;
  const links = group.links;
  return (
    <div className="sc-tool-external-services-item-group">
      <div className="sc-container sc-tool-external-services-item-header">
        <div className="sc-tool-external-services-item-header">
          <img className="sc-tool-external-services-item-image" src={images[group.icon]} alt={group.groupName}></img>
          <span className="">{group.groupName}</span>
        </div>
      </div>
      <div className="sc-tool-external-services-item-links">
        {links.map((link) => (
          <ExternalServicesLink key={helpers.getUID()} link={link} coords={coords} address={address}></ExternalServicesLink>
        ))}
      </div>
    </div>
  );
};

const ExternalServicesLink = (props) => {
  const { link, coords, address } = props;

  // eslint-disable-next-line
  const template = (x, y, address) => eval("`" + link.url + "`");
  return (
    <div className="sc-tool-external-services-item-link">
      <a href={template(coords[0], coords[1], address)} target="_blank" rel="noopener noreferrer">
        {link.name}
      </a>
    </div>
  );
};

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
