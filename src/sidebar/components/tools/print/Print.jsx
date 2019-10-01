import React, { Component } from "react";
import Select from "react-select";
import Collapsible from 'react-collapsible';
import PanelComponent from "../../../PanelComponent";
import * as helpers from "../../../../helpers/helpers";
import * as printRequest from "./printRequest/printRequest";
import "./Print.css";

const termsOfUse = "This map, either in whole or in part, may not be reproduced without the written authority from" + 
  "© The Corporation of the County of Simcoe." + 
  "This map is intended for personal use, has been produced using data from a variety of sources" + 
  "and may not be current or accurate." + 
  "Produced (in part) under license from:" + 
  "© Her Majesty the Queen in Right of Canada, Department of Natural Resources:" + 
  "© Queens Printer, Ontario Ministry of Natural Resources:" + 
  "© Teranet Enterprises Inc. and its suppliers:" + 
  "© Members of the Ontario Geospatial Data Exchange." + 
  "All rights reserved. THIS IS NOT A PLAN OF SURVEY."

  // IMPORT ALL IMAGES
const images = importAllImages(require.context('./images', false, /\.(gif|png|jpe?g|svg)$/));
function importAllImages(r) {
    let images = {};
    r.keys().map((item, index) => { images[item.replace('./', '')] = r(item); });
    return images;
  }

class Print extends Component {
  state = {
    printSizes: [
      {
        value: "8X11 Portrait",
        label: "8X11 Portrait (Letter)",
      },
      {
        value: "11X8 Landscape",
        label: "11X8 Landscape (Letter)",
      },
      {
        value: "8X11 Portrait Overview",
        label: "8X11 Portrait with Overview",
      },
      {
        value: "Map Only",
        label: "Map Only",
      },
      {
        value: "Map Only Portrait",
        label: "Map Only Portrait",
      },
      {
        value: "Map Only Landscape",
        label: "Map Only Landscape",
      }
    ],
    printFormats: [
      {
        value: "PDF",
        label: "PDF"
      },
      {
        value: "PNG",
        label: "PNG"
      },
      {
        value: "JPG",
        label: "JPG"
      }
    ],
    mapTitle: "County of Simcoe - Web Map",
    printSizeSelectedOption: null,
    printFormatSelectedOption: null,
    forceScale: helpers.getMapScale(),
    mapScaleOption: "forceScale",
    mapOnlyHeight: document.getElementById("map").offsetHeight, 
    mapOnlyWidth: document.getElementById("map").offsetWidth,
    isPrinting: false, 
  };

  componentDidMount() {
    this.setState({ printSizeSelectedOption: this.state.printSizes[0] });
    this.setState({ printFormatSelectedOption: this.state.printFormats[0] });
  }

  onChangePaperSize = selectedOption => {
    this.setState({ printSizeSelectedOption: selectedOption });
  };

  onChangeFormat = selectedOption => {
    this.setState({ printFormatSelectedOption: selectedOption });
  };

  onMapTitleChange = (evt) => {
    this.setState({mapTitle: evt.target.value});
  }

  onForceScaleChange = (evt) => {
    this.setState({forceScale: evt.target.value});
  }

  onMapScaleOptions = (evt) => {
    this.setState({mapScaleOption: evt.target.value})
  }

  onMapOnlyWidth = (evt) => {
    this.setState({mapOnlyWidth: evt.target.value})
  }

  onMapOnlyHeight = (evt) => {
    this.setState({mapOnlyHeight: evt.target.value})
  }

  onClose() {
    // ADD CLEAN UP HERE

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  }

  onDownloadButtonClick = async evt => {
    //this.setState({isPrinting: true});
    const {printSelectedOption} = this.state;
    //console.log(this.state);  

   // helpers.showMessage("Print", "Coming soon!");

    // GET VISIBLE LAYERS
    const printLayers = this.getPrintLayers();

    // =======================
    // SEND PRINT SERVER REQUEST HERE
    // =======================
    const printData = await printRequest.printRequest(printLayers, termsOfUse,  this.state);
    const printAppId = printData.layout.replace(/ /g,"_");
    const outputFormat = printData.outputFormat.toLowerCase();
    // console.log(JSON.stringify(printData)); 
    let interval = 5000;
    let origin = window.location.origin;
    let testOrigin = 'http://localhost:8080'
    let encodedPrintRequest = encodeURIComponent(JSON.stringify(printData))
    let url = `${testOrigin}/print/print/${printAppId}/report.${outputFormat}`;

    //check print Status and retreive print
    let checkStatus = (response) => {

        fetch(`${testOrigin}${response.statusURL}`)
            .then(data => data.json())
            .then((data) => {
                console.log(data);
                if ((data.done === true) && (data.status === "finished")) {
                    interval = 0
                    helpers.showMessage("Print", "Your print has been downloaded", "green", 10000);
                    window.open(`${testOrigin}${data.downloadURL}`);
                    this.setState({isPrinting: false}); // THIS WILL RE-ENABLE BUTTON AND HIDE LOADING MSG
                } else if ((data.done === false) && (data.status === "running")) {
                    setTimeout(() => {
                        if (interval < 30000) {
                            interval += 2500
                            checkStatus(response)
                        } else {
                            interval = 5000
                            checkStatus(response)
                        }
                    }, interval);
                } else if ((data.done === true) && (data.status === "error")) {
                    // be handled as a gracefully displayed error message
                    // console.log(data.error);
                    helpers.showMessage("Print Failed", "please report to admin", "red", 10000);
                }
            })
    }
    //post request to server and check status
    fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: encodedPrintRequest
        })
        .then(response => response.json())
        .then((response) => {
            checkStatus(response)
        })
        .catch(error => console.error('Error:', error))
  };

  getPrintLayers = () => {
    let layers = [];
    window.map.getLayers().forEach(function(layer) {
      if (layer.getVisible()){
        layers.push(layer);
      }
    })
    return layers;
  }

  render() {
    const dropdownStyles = {
      control: provided => ({
        ...provided,
        minHeight: "30px",
        marginBottom: "5px"
      }),
      indicatorsContainer: provided => ({
        ...provided,
        height: "30px"
      }),
      clearIndicator: provided => ({
        ...provided,
        padding: "5px"
      }),
      dropdownIndicator: provided => ({
        ...provided,
        padding: "5px"
      })
    };

    return (
      <PanelComponent
        onClose={this.props.onClose}
        name={this.props.name}
        type="tools"
      >
        <div className="sc-print-container">

          {/* MAP TITLE */}
          <label style={{ fontWeight: "bold" }}>Map Title:</label>
          <input className="sc-print-map-title-input" onChange={this.onMapTitleChange} value={this.state.mapTitle}></input>

          {/* PRINT SIZE */}
          <label style={{ fontWeight: "bold" }}>Select Paper Size:</label>
          <Select
            styles={dropdownStyles}
            isSearchable={false}
            options={this.state.printSizes}
            value={this.state.printSizeSelectedOption}
            onChange={this.onChangePaperSize}
          />

           {/* FORMAT */}
           <label style={{ fontWeight: "bold" }}>Select Output Format:</label>
          <Select
            styles={dropdownStyles}
            isSearchable={false}
            options={this.state.printFormats}
            value={this.state.printFormatSelectedOption}
            onChange={this.onChangeFormat}
          />

          {/* PRINT BUTTON */}
          <button className="sc-button sc-print-button" onClick={this.onDownloadButtonClick} disabled={this.state.isPrinting}>Print</button>
          <div className={this.state.isPrinting ? "sc-print-loading" : "sc-hidden"}>Printing...&nbsp;
            <img src={images['loading20.gif']}></img>
          </div>

          {/* ADVANCED OPTIONS */}
          <Collapsible overflowWhenOpen="auto" className="sc-print-advanced-options-collapsible" openedClassName="sc-print-advanced-options-collapsible open" contentOuterClassName="sc-print-advanced-options-content-outer" trigger={optionsHeader}>
            <label style={{fontSize : "10pt", fontWeight: "bold"}}>Map Scale/Extent:</label>
            <div style={{fontSize : "10pt"}} onChange={this.onMapScaleOptions}>
              <input type="radio" name="mapscale" value="preserveMapScale"></input>
              <label >Preserve Map Scale</label><br></br>
              <input type="radio" name="mapscale" value="preserveMapExtent"></input>
              <label >Preserve Map Extent</label><br></br>
              <input type="radio" name="mapscale" value="forceScale" defaultChecked></input>
              <label >Force Scale:</label>
              <input className="sc-print-advanced-options-force-scale-input" onChange={this.onForceScaleChange} value={this.state.forceScale}></input>
            </div>
            <label style={{fontSize : "10pt", fontWeight: "bold"}}>Map Only - Image Size:</label><br></br>
            <label >Width (px):</label>
            <input className="sc-print-advanced-options-force-scale-input" onChange={this.onMapOnlyWidth} value={this.state.mapOnlyWidth}></input><br></br>
            <label >Height (px):</label>
            <input className="sc-print-advanced-options-force-scale-input" onChange={this.onMapOnlyHeight} value={this.state.mapOnlyHeight}></input>
          </Collapsible>
        </div>
      </PanelComponent>
    );
  }
}

export default Print;

const optionsHeader = <div>Advanced Print Options</div>;


