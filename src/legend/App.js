import React, { Component } from "react";
// import Masonry from "react-masonry-component";
import Masonry from "react-masonry-css";
import "./Global.css";
import styles from "./App.module.css";
import "./App.css";
import * as legendHelpers from "./helpers";
import * as helpers from "../helpers/helpers";

import Header from "./Header";
import GroupItem from "./GroupItem";
import Select from "react-select";
import cx from "classnames";
import mainConfig from "./config.json";
import ReactGA from "react-ga4";
import xml2js from "xml2js";

if (mainConfig.googleAnalyticsID !== undefined && mainConfig.googleAnalyticsID !== "") {
  ReactGA.initialize(mainConfig.googleAnalyticsID);
  ReactGA.send({ hitType: "pageview", page: window.location.pathname + window.location.search });
}

const mainGroupUrl = mainConfig.geoserverLayerGroupsUrl;

// THIS APP ACCEPTS LIST OF GROUPS
//http://localhost:3001/?All_Layers=1&Popular=1

const params = legendHelpers.getParams(window.location.href);

class LegendApp extends Component {
  constructor(props) {
    super(props);

    this.state = {
      groups: [],
      selectedGroups: [],
      justifyCenter: false,
      hideNewWindow: false,
      hideShare: false,
      hidePrint: false,
    };
  }

  componentDidMount() {
    if (this.props.groups !== undefined) {
      this.setState({
        groups: this.props.groups,
        selectedGroups: this.props.selectedGroups === undefined ? [] : this.props.selectedGroups,
        hideNewWindow: true,
        hideShare: true,
      });
    } else {
      this.getGroups(mainGroupUrl, (result) => {
        let selectedGroups = [];
        const groups = result[0];
        let groupsObj = [];
        groups.forEach((group) => {
          const onOrOff = params[group.value.split(":")[1]];
          let layers = [];
          group.layers.forEach((layer) => {
            const layerObj = {
              imageUrl: layer.styleUrl,
              layerName: layer.name.split(":")[1],
              tocDisplayName: layer.tocDisplayName,
            };
            layers.push(layerObj);
          });
          const groupObj = {
            label: group.label,
            value: group.value.split(":")[1],
            layers: layers,
          };
          if (onOrOff === "1") selectedGroups.push(groupObj);
          groupsObj.push(groupObj);
        });

        // ADD NEW FEATURE TO STATE
        this.setState({ groups: groupsObj, selectedGroups });
      });
    }
  }

  handleChange = (selectedGroups) => {
    if (selectedGroups === null) selectedGroups = [];
    this.setState({ selectedGroups });
  };

  // GET GROUPS FROM GET CAPABILITIES
  getGroups(url, callback) {
    const layerIndexStart = 100;
    const urlType = "group";
    let defaultGroup = null;
    let isDefault = false;
    let groups = [];
    const remove_underscore = (name) => {
      return helpers.replaceAllInString(name, "_", " ");
    };

    helpers.httpGetText(url, (result) => {
      var parser = new xml2js.Parser();

      // PARSE TO JSON
      parser.parseString(result, (err, result) => {
        let groupLayerList =
          urlType === "root"
            ? result.WMS_Capabilities.Capability[0].Layer[0].Layer
            : urlType === "group"
            ? result.WMS_Capabilities.Capability[0].Layer[0].Layer[0].Layer
            : result.WMS_Capabilities.Capability[0].Layer[0].Layer;
        let parentGroup =
          urlType === "root"
            ? result.WMS_Capabilities.Capability[0].Layer[0].Layer[0]
            : urlType === "group"
            ? result.WMS_Capabilities.Capability[0].Layer[0].Layer[0]
            : result.WMS_Capabilities.Capability[0].Layer[0].Layer[0];

        groupLayerList.forEach((layerInfo) => {
          if (layerInfo.Layer !== undefined) {
            const groupName = layerInfo.Name[0];
            const groupDisplayName = layerInfo.Title[0];
            const groupUrl = url.split("/geoserver/")[0] + "/geoserver/" + helpers.replaceAllInString(groupName, ":", "/") + "/ows?service=wms&version=1.3.0&request=GetCapabilities";
            const fullGroupUrl = url.split("/geoserver/")[0] + "/geoserver/" + helpers.replaceAllInString(groupName, ":", "/") + "/ows?service=wms&version=1.3.0&request=GetCapabilities";

            let layerList = [];
            if (layerInfo.Layer !== undefined) {
              const groupLayerList = layerInfo.Layer;

              let layerIndex = groupLayerList.length + layerIndexStart;
              const tmpGroupObj = {
                value: groupName,
                label: remove_underscore(groupDisplayName),
                url: groupUrl,
                wmsGroupUrl: fullGroupUrl,
              };

              const buildLayers = (layers) => {
                if (layers === undefined) return;
                layers.forEach((currentLayer) => {
                  if (!this.isDuplicate(layerList, currentLayer.Name[0])) {
                    this.buildLayerByGroup(tmpGroupObj, currentLayer, layerIndex, (result) => {
                      layerList.push(result);
                    });
                    layerIndex--;

                    buildLayers(currentLayer.Layer);
                  }
                });
              };

              buildLayers(layerInfo.Layer);
            }

            const groupObj = {
              value: groupName,
              label: remove_underscore(groupDisplayName),
              url: groupUrl,
              defaultGroup: isDefault,
              wmsGroupUrl: fullGroupUrl,
              layers: layerList,
            };
            if (groupObj.layers.length >= 1) {
              groups.push(groupObj);
              if (isDefault) {
                defaultGroup = groupObj;
                isDefault = false;
              }
            }
          }
        });
      });
      if (defaultGroup === undefined || defaultGroup === null) defaultGroup = groups[0];

      callback([groups, defaultGroup]);
    });
  }

  _getStaticImageLegend(keywords) {
    if (keywords === undefined) return false;
    const keyword = keywords.find((item) => {
      return item.indexOf("STATIC_IMAGE_LEGEND") !== -1;
    });
    if (keyword !== undefined) return true;
    else return false;
  }

  buildLayerByGroup(group, layer, layerIndex, callback) {
    if (layer.Layer === undefined) {
      const layerNameOnly = layer.Name[0];
      let layerTitle = layer.Title[0];
      if (layerTitle === undefined) layerTitle = layerNameOnly;
      let keywords = [];
      if (layer.KeywordList !== undefined && layer.KeywordList.length > 0) keywords = layer.KeywordList[0].Keyword;

      let styleUrl = layer.Style[0].LegendURL[0].OnlineResource[0].$["xlink:href"].replace("http:", "https:");
      let legendSizeOverride = this._getStaticImageLegend(keywords);

      if (legendSizeOverride && styleUrl !== "") {
        const legendSize = layer.Style !== undefined ? layer.Style[0].LegendURL[0].$ : [20, 20];
        styleUrl = styleUrl.replace("width=20", `width=${legendSize.width}`).replace("height=20", `height=${legendSize.height}`);
      }
      const serverUrl = group.wmsGroupUrl.split("/geoserver/")[0] + "/geoserver";
      const wfsUrlTemplate = (serverUrl, layerName) => `${serverUrl}/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=${layerName}&outputFormat=application/json&cql_filter=`;
      const wfsUrl = wfsUrlTemplate(serverUrl, layer.Name[0]);

      const metadataUrlTemplate = (serverUrl, layerName) => `${serverUrl}/rest/layers/${layerName}.json`;
      const metadataUrl = metadataUrlTemplate(serverUrl, layer.Name[0]);

      // TOC DISPLAY NAME
      const tocDisplayName = layerTitle;

      const returnLayer = {
        name: layerNameOnly, // FRIENDLY NAME
        height: 30, // HEIGHT OF DOM ROW FOR AUTOSIZER
        drawIndex: layerIndex, // INDEX USED BY VIRTUAL LIST
        index: layerIndex, // INDEX USED BY VIRTUAL LIST
        styleUrl: styleUrl, // WMS URL TO LEGEND SWATCH IMAGE
        showLegend: false, // SHOW LEGEND USING PLUS-MINUS IN TOC
        legendHeight: -1, // HEIGHT OF IMAGE USED BY AUTOSIZER
        legendImage: null, // IMAGE DATA, STORED ONCE USER VIEWS LEGEND
        metadataUrl: metadataUrl, // ROOT LAYER INFO FROM GROUP END POINT
        wfsUrl: wfsUrl,
        tocDisplayName: tocDisplayName, // DISPLAY NAME USED FOR TOC LAYER NAME
        group: group.value,
        groupName: group.label,
        serverUrl: serverUrl + "/", // BASE URL FOR GEOSERVER
      };
      callback(returnLayer);
    }
  }

  isDuplicate(layerList, newLayerName) {
    let returnValue = false;
    layerList.forEach((layer) => {
      if (layer.name === newLayerName) {
        returnValue = true;
      }
    });
    return returnValue;
  }

  render() {
    const childElements = this.state.selectedGroups.map((group) => {
      return <GroupItem key={helpers.getUID()} group={group} center={this.state.justifyCenter} />;
    });

    const breakpointColumnsObj = {
      default: 4,
      2460: 3,
      1640: 2,
      900: 1,
    };

    return (
      <div className={styles.mainContainer} id="sc-legend-app-main-container">
        <Header
          onShareClick={this.onShareClick}
          hide={{
            print: this.state.hidePrint,
            newWindow: this.state.hideNewWindow,
            share: this.state.hideShare,
          }}
        />
        <div style={{ marginLeft: "5px" }}>
          <label>Groups:</label>
          <div className={`no-print ${styles.selectContainer}`}>
            <Select
              isMulti
              name="groups"
              options={this.state.groups}
              className="basic-multi-select"
              classNamePrefix="select"
              onChange={this.handleChange}
              selectedOption={this.state.selectedGroups}
              value={this.state.selectedGroups}
            />
          </div>
        </div>

        <div className={styles.justifyButtons}>
          <div
            className={`no-print ${this.state.justifyCenter ? styles.justifyButtonContainer : cx(styles.justifyButtonContainer, styles.activeButton)}`}
            onClick={() => this.setState({ justifyCenter: false })}
          >
            <img className={styles.justifyImage} src={images["left-justify.png"]} alt="left-justify" title="Left Justify"></img>
          </div>

          <div
            className={`no-print ${this.state.justifyCenter ? cx(styles.justifyButtonContainer, styles.activeButton) : styles.justifyButtonContainer}`}
            onClick={() => this.setState({ justifyCenter: true })}
          >
            <img className={styles.justifyImage} src={images["center-justify.png"]} alt="right-justify" title="Center Justify"></img>
          </div>
        </div>
        <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
          {childElements}
        </Masonry>
        <div className="footer">
          <div style={{ float: "left" }}>
            Layer info page generated using{" "}
            <a href={window.config.originUrl} target="_blank" rel="noopener noreferrer">
              {window.config.originUrl.split("//")[1]}
            </a>{" "}
            interactive mapping.
            <br />
          </div>
          <div style={{ float: "right" }}>{"Generated on: " + legendHelpers.formatDate()}</div>
        </div>
      </div>
    );
  }
}

export default LegendApp;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  // eslint-disable-next-line
  r.keys().map((item, index) => {
    images[item.replace("./", "")] = r(item);
  });
  return images;
}
