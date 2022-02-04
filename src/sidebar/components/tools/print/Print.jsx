import React, { Component } from "react";
import Select from "react-select";
import Collapsible from "react-collapsible";
import PanelComponent from "../../../PanelComponent";
import * as helpers from "../../../../helpers/helpers";
import * as printRequest from "./printRequest/printRequest";
import printConfig from "./config.json";
import "./Print.css";

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(gif|png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  // eslint-disable-next-line
  r.keys().map((item, index) => {
    images[item.replace("./", "")] = r(item);
  });
  return images;
}

class Print extends Component {
  constructor(props) {
    super(props);
    this.config = printConfig;
    this.state = {
      printUrl: "",
      originUrl: "",
      printSizes: printConfig.printSizes,
      printFormats: printConfig.printFormats,
      mapTitle: printConfig.mapTitle,
      printSizeSelectedOption: null,
      printFormatSelectedOption: null,
      forceScale: helpers.getMapScale(),
      mapScaleOption: "preserveMapScale",
      mapOnlyHeight: document.getElementById("map").offsetHeight,
      mapOnlyWidth: document.getElementById("map").offsetWidth,
      isPrinting: false,
      termsOfUse: printConfig.termsOfUse,
      mapResolutionOption: "120",
    };
  }

  componentDidMount() {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      //const printConfig = printConfig;
      const globalConfig = helpers.getConfig("TOOLS", "Print");
      const mainConfig = window.config;
      if (globalConfig.config !== undefined) this.config = helpers.mergeObj(this.config, globalConfig.config);
      this.setState({
        printUrl: mainConfig.printUrl,
        originUrl: mainConfig.originUrl,
        printSizes: this.config.printSizes,
        printFormats: this.config.printFormats,
        printSizeSelectedOption: this.config.printSizes[0],
        printFormatSelectedOption: this.config.printFormats[0],
        mapTitle: this.config.mapTitle,
        forceScale: helpers.getMapScale(),
        mapScaleOption: "preserveMapScale",
        mapOnlyHeight: document.getElementById("map").offsetHeight,
        mapOnlyWidth: document.getElementById("map").offsetWidth,
        isPrinting: false,
        termsOfUse: this.config.termsOfUse,
        mapResolutionOption: "120",
      });
    });
  }

  onChangePaperSize = (selectedOption) => {
    this.setState({ printSizeSelectedOption: selectedOption });
  };

  onChangeFormat = (selectedOption) => {
    this.setState({ printFormatSelectedOption: selectedOption });
  };

  onMapTitleChange = (evt) => {
    this.setState({ mapTitle: evt.target.value });
  };

  onForceScaleChange = (evt) => {
    this.setState({ forceScale: evt.target.value });
  };
  onMapResolutionOptions = (evt) => {
    this.setState({ mapResolutionOption: evt.target.value });
  };
  onMapScaleOptions = (evt) => {
    if (evt.target.type === "radio") this.setState({ mapScaleOption: evt.target.value });
  };

  onMapOnlyWidth = (evt) => {
    this.setState({ mapOnlyWidth: evt.target.value });
  };

  onMapOnlyHeight = (evt) => {
    this.setState({ mapOnlyHeight: evt.target.value });
  };

  onClose() {
    // ADD CLEAN UP HERE

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  }

  onDownloadButtonClick = async (evt) => {
    // GET VISIBLE LAYERS
    const printLayers = this.getPrintLayers();
    let secureKey = undefined;
    const params = { method: "POST" };
    const headers = { "Content-Type": "application/json" };
    printLayers.forEach((layer) => {
      secureKey = layer.get("secureKey");
      if (secureKey !== undefined) {
        headers[secureKey] = "GIS";
      }
    });
    params["headers"] = headers;

    // =======================
    // SEND PRINT SERVER REQUEST HERE
    // =======================
    const printData = await printRequest.printRequest(printLayers, this.state);
    // console.log(JSON.stringify(printData));

    const printAppId = printData.layout.replace(/ /g, "_");
    const outputFormat = printData.outputFormat;

    let interval = 5000;
    let origin = this.state.originUrl;
    let printUrl = this.state.printUrl;

    //let testOrigin = 'http://localhost:8080'
    let encodedPrintRequest = encodeURIComponent(JSON.stringify(printData));
    let url = `${printUrl}/print/${printAppId}/report.${outputFormat}`;
    // console.log(url);

    //check print Status and retreive print
    let checkStatus = (response) => {
      fetch(`${origin}${response.statusURL}`)
        .then((data) => data.json())
        .then((data) => {
          //console.log(data);
          if (data.done === true && data.status === "finished") {
            interval = 0;
            helpers.showMessage("Print", "Your print has been downloaded", helpers.messageColors.green, 10000);

            //try creating an auto click link, fall back to window.open
            helpers.download(`${origin}${data.downloadURL}`, "file.pdf");

            this.setState({ isPrinting: false }); // THIS WILL RE-ENABLE BUTTON AND HIDE LOADING MSG
          } else if (data.done === false && data.status === "running") {
            setTimeout(() => {
              if (interval < 30000) {
                interval += 2500;
                checkStatus(response);
              } else {
                interval = 5000;
                checkStatus(response);
              }
            }, interval);
          } else if (data.done === true && data.status === "error") {
            console.log(data);
            console.log(JSON.stringify(printData));
            helpers.showMessage("Print Failed", "If this error persists, please use the Feedback button to notify the site admin", helpers.messageColors.red, 15000);
            this.setState({ isPrinting: false });
          }
        });
    };
    //post request to server and check status
    params["body"] = encodedPrintRequest;
    fetch(url, params)
      .then((response) => response.json())
      .then((response) => {
        this.setState({ isPrinting: true });
        checkStatus(response);
      })
      .catch((error) => helpers.showMessage("Print Failed", `There has been a problem with your fetch operation: ${error.message}`, helpers.messageColors.red, 15000));
    helpers.addAppStat("Print Button", "Click");
  };

  getPrintLayers = () => {
    let layers = [];
    window.map.getLayers().forEach(function (layer) {
      if (layer.getVisible()) {
        layers.push(layer);
      }
    });
    return layers;
  };

  render() {
    const dropdownStyles = {
      control: (provided) => ({
        ...provided,
        minHeight: "30px",
        marginBottom: "5px",
      }),
      indicatorsContainer: (provided) => ({
        ...provided,
        height: "30px",
      }),
      clearIndicator: (provided) => ({
        ...provided,
        padding: "5px",
      }),
      dropdownIndicator: (provided) => ({
        ...provided,
        padding: "5px",
      }),
    };

    return (
      <PanelComponent onClose={this.props.onClose} name={this.props.name} helpLink={this.props.helpLink} hideHeader={this.props.hideHeader} type="tools">
        <div className="sc-print-container">
          {/* TAKE SNAPSHOT */}
          <div className="sc-print-screenshot-container sc-border-bottom">
            <div className="sc-button sc-print-screenshot-button" onClick={() => window.emitter.emit("takeScreenshot")} title="Save a Screenshot" alt="Save a Screenshot">
              <div className="sc-print-screenshot-icon">&nbsp;</div>
            </div>
            Is your Print too grainy or low quality? <br /> Click here for a high resolution screenshot
          </div>

          {/* MAP TITLE */}

          <label style={{ fontWeight: "bold" }}>Map Title:</label>
          <input
            className="sc-print-map-title-input"
            onChange={this.onMapTitleChange}
            value={this.state.mapTitle}
            onFocus={(evt) => {
              helpers.disableKeyboardEvents(true);
            }}
            onBlur={(evt) => {
              helpers.disableKeyboardEvents(false);
            }}
          />

          {/* PRINT SIZE */}
          <label style={{ fontWeight: "bold" }}>Select Paper Size:</label>
          <Select styles={dropdownStyles} isSearchable={false} options={this.state.printSizes} value={this.state.printSizeSelectedOption} onChange={this.onChangePaperSize} />

          {/* FORMAT */}
          <label style={{ fontWeight: "bold" }}>Select Output Format:</label>
          <Select styles={dropdownStyles} isSearchable={false} options={this.state.printFormats} value={this.state.printFormatSelectedOption} onChange={this.onChangeFormat} />

          {/* PRINT BUTTON */}
          <button className="sc-button sc-print-button" onClick={this.onDownloadButtonClick} disabled={this.state.isPrinting}>
            Print
          </button>
          <div className={this.state.isPrinting ? "sc-print-loading" : "sc-hidden"}>
            Printing...&nbsp;
            <img src={images["loading20.gif"]} alt="loading" />
          </div>

          {/* ADVANCED OPTIONS */}
          <Collapsible
            overflowWhenOpen="auto"
            className="sc-print-advanced-options-collapsible"
            openedClassName="sc-print-advanced-options-collapsible open"
            contentOuterClassName="sc-print-advanced-options-content-outer"
            trigger={optionsHeader}
          >
            <label style={{ fontSize: "10pt", fontWeight: "bold" }}>Map Scale/Extent:</label>
            <div style={{ fontSize: "10pt" }} onChange={this.onMapScaleOptions}>
              <input type="radio" name="mapscale" id="mapscale-preserveMapScale" value="preserveMapScale" defaultChecked />
              <label htmlFor="mapscale-preserveMapScale">Preserve Map Scale</label>
              <br />
              <input type="radio" name="mapscale" id="mapscale-preserveMapExtent" value="preserveMapExtent" />
              <label htmlFor="mapscale-preserveMapExtent">Preserve Map Extent</label>
              <br />
              <input type="radio" name="mapscale" id="mapscale-forceScale" value="forceScale" />
              <label htmlFor="mapscale-forceScale">Force Scale:</label>
              <input className="sc-print-advanced-options-force-scale-input" onChange={this.onForceScaleChange} value={this.state.forceScale} />
            </div>
            <label style={{ fontSize: "10pt", fontWeight: "bold" }}>Map Only - Image Size:</label>
            <br />
            <label>Width (px):</label>
            <input className="sc-print-advanced-options-force-scale-input" onChange={this.onMapOnlyWidth} value={this.state.mapOnlyWidth} />
            <br />
            <label>Height (px):</label>
            <input className="sc-print-advanced-options-force-scale-input" onChange={this.onMapOnlyHeight} value={this.state.mapOnlyHeight} />
            <br />
            <label style={{ fontSize: "10pt", fontWeight: "bold" }}>Map Output Resolution:</label>
            <div style={{ fontSize: "10pt" }} onChange={this.onMapResolutionOptions}>
              <input type="radio" name="mapresolution" id="mapresolution-veryhigh" value="300" />
              <label htmlFor="mapresolution-veryhigh">Very High - 300 dpi</label>
              <br />
              <input type="radio" name="mapresolution" id="mapresolution-high" value="180" />
              <label htmlFor="mapresolution-high">High - 180 dpi</label>
              <br />
              <input type="radio" name="mapresolution" id="mapresolution-medium" value="120" defaultChecked />
              <label htmlFor="mapresolution-medium">Medium - 120 dpi</label>
              <br />
              <input type="radio" name="mapresolution" id="mapresolution-low" value="90" />
              <label htmlFor="mapresolution-low">Low - 90 dpi</label>
              <br />
              <input type="radio" name="mapresolution" id="mapresolution-verylow" value="60" />
              <label htmlFor="mapresolution-verylow">Very Low - 60 dpi</label>
            </div>
          </Collapsible>
        </div>
      </PanelComponent>
    );
  }
}

export default Print;

const optionsHeader = <div>Advanced Print Options</div>;
