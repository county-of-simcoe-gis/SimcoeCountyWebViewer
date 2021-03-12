import React, { Component } from "react";
import "./LHRS.css";
import * as helpers from "../../../../helpers/helpers";
import PanelComponent from "../../../PanelComponent";
import { LHRSPoint,LHRSInputRow,LHRSRow } from "./LHRSSubComponents.jsx";
import { transform } from "ol/proj.js";
import Select from "react-select";
import Switch from "react-switch";
import { Vector as VectorLayer } from "ol/layer";
import { Icon,Style, Stroke} from "ol/style.js";
import { Vector as VectorSource } from "ol/source.js";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { unByKey } from "ol/Observable.js";
import mainConfig from "../../../../config.json";


class LHRS extends Component {
 
  constructor(props) {
    super(props);
    this._isMounted = false;
    this.state = {
      liveWebMercatorCoords: null,
      liveLatLongCoords: null,
      inputLatLongXCoordsA: null,
      inputLatLongYCoordsA: null,
      inputLatLongXCoordsB: null,
      inputLatLongYCoordsB: null,
      selectLHRSVersions: [],
      selectLHRSVersion: undefined,
      snappingDistance: 50,
      selectedPoint:"pointA",
      selectedPointLabel:"Point A",
      //values for input boxes
      inputALabel:"",
      inputAValue:null,
      inputAType:"",
      inputAReadOnly:false,
      inputAPlaceholer:"",
      inputAHidden:false,
      inputBLabel:"",
      inputBValue:null,
      inputBType:"",
      inputBReadOnly:false,
      inputBPlaceholer:"",
      inputBHidden:false,
      selectLHRSActions: [],
      selectLHRSAction: undefined,
      //values for point a
      a_valid:false,
      a_lat: null,
      a_long: null,
      a_hwy: null, 
      a_m_distance:null, 
      a_basepoint: null, 
      a_offset: null,
      a_snapped_distance: null,
      //values for point b
      b_valid:false,
      b_lat: null,
      b_long: null,
      b_hwy: null, 
      b_m_distance:null, 
      b_basepoint: null, 
      b_offset: null,
      b_snapped_distance: null,

      linearFeatureLength: null,
      allowMapActions: true
    };
    
    this.vectorLayerA = new VectorLayer({
      name: "sc-lhrs-marker-a",
      source: new VectorSource({
        features: []
      }),
      style: new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: images["marker-a.png"]
        })
      }),
      zIndex: 500
    });
    this.vectorLayerB = new VectorLayer({
      name: "sc-lhrs-marker-b",
      source: new VectorSource({
        features: []
      }),
      style: new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: images["marker-b.png"]
        })
      }),
      zIndex: 500
    });
    this.vectorLayerLinear = new VectorLayer({
      name: "sc-lhrs-section",
      source: new VectorSource({
        features: []
      }),
      style:new Style({
        stroke: new Stroke({
          color: [0, 255, 255, 0.8],
          width: 6
        })
      }),
      zIndex: 499
    });
   
    window.map.addLayer(this.vectorLayerA);
    window.map.addLayer(this.vectorLayerB);
    window.map.addLayer(this.vectorLayerLinear);
    
  }

  componentDidMount() {
    this._isMounted = true;
    
    // LISTEN FOR MAP TO MOUNT
    window.emitter.addListener("mapLoaded", () => this.onMapLoad());

    // DISABLE PROPERTY CLICK
    window.disableParcelClick = true;

    // REGISTER MAP EVENTS
    this.onPointerMoveEvent = window.map.on("pointermove", this.onPointerMoveHandler);
    this.onMapClickEvent = window.map.on("click", this.onMapClick);
    this.onMapMoveEvent = window.map.on("moveend", this.onMapMoveEnd);
    this._getLHRSVersions();
    this._getLHRSActions();

    if (this._isMounted) this.forceUpdate();
  }

  _getLHRSVersions = () => {
    const apiUrl = mainConfig.apiUrl + 'getLHRSVersion';
    helpers.getJSON( apiUrl, result => {
      let items = [];
     
      result.forEach(version => {
        const obj = { label: version.lhrs_version_title, value: version.lhrs_version };
        items.push(obj);
      });
     
     
      this.setState({ selectLHRSVersions: items, selectLHRSVersion: items[0] });
    });
  }
  _getPoint = (pointName) => {
    let pointObj = {
      point:pointName,
      lat:null,
      long:null,
      hwy: null, 
      m_distance:null, 
      basepoint: null, 
      offset: null,
      snapped_distance: null,
      valid: false
    };
    switch(pointName){
      case "pointA":        
        pointObj = {
          point:"pointA",
          lat: this.state.a_lat,
          long: this.state.a_long,
          hwy: this.state.a_hwy, 
          m_distance:this.state.a_m_distance, 
          basepoint: this.state.a_basepoint, 
          offset: this.state.a_offset,
          snapped_distance: this.state.a_snapped_distance,
          valid:this.state.a_valid
        };
        break;
      case "pointB":
        pointObj = {
          point:"pointB",
          lat: this.state.b_lat,
          long: this.state.b_long,
          hwy: this.state.b_hwy, 
          m_distance:this.state.b_m_distance, 
          basepoint: this.state.b_basepoint, 
          offset: this.state.b_offset,
          snapped_distance: this.state.b_snapped_distance,
          valid:this.state.b_valid
        };
        break;
      default:
        break;
    }
    return pointObj;
  }
  _setPoint = (pointObj) => {  
    if (pointObj.valid || (pointObj.lat!==null && pointObj.long!==null)){
      this.updatePoint(pointObj.point,pointObj.lat,pointObj.long);
    }else{
      if (pointObj.point==="pointA"){
        this.vectorLayerA.getSource().clear();
      }else{
        this.vectorLayerB.getSource().clear();
      }
    }
    this.updateLHRSActions(pointObj);
    switch(pointObj.point){
      case "pointA":
        this.setState({a_lat: pointObj.lat,
                      a_long: pointObj.long,
                      a_hwy: pointObj.hwy, 
                      a_m_distance:pointObj.m_distance, 
                      a_basepoint: pointObj.basepoint, 
                      a_offset: pointObj.offset,
                      a_snapped_distance: pointObj.snapped_distance,
                      a_valid: pointObj.valid,
                      inputLatLongXCoordsA: pointObj.lat, 
                      inputLatLongYCoordsA: pointObj.long
                    },()=>{
                     
                      if ((this.state.b_valid && this.state.a_valid) && (this.state.a_hwy === this.state.b_hwy)) {
                        this.calcLinearFeature(this.state.a_hwy, this.state.a_m_distance,this.state.b_m_distance);
                      }else{
                        this.vectorLayerLinear.getSource().clear();
                        this.zoomToPoint(pointObj.lat, pointObj.long);
                      }
                    });
        break;
      case "pointB":
        this.setState({b_lat: pointObj.lat,
                      b_long: pointObj.long,
                      b_hwy: pointObj.hwy, 
                      b_m_distance:pointObj.m_distance, 
                      b_basepoint: pointObj.basepoint, 
                      b_offset: pointObj.offset,
                      b_snapped_distance: pointObj.snapped_distance,
                      b_valid: pointObj.valid,
                      inputLatLongXCoordsB: pointObj.lat, 
                      inputLatLongYCoordsB: pointObj.long
                    }, ()=>{
                        if ((this.state.b_valid && this.state.a_valid) && (this.state.a_hwy === this.state.b_hwy)) {
                          this.calcLinearFeature(this.state.a_hwy, this.state.a_m_distance,this.state.b_m_distance);
                        }else{
                          this.vectorLayerLinear.getSource().clear();
                          this.zoomToPoint(pointObj.lat, pointObj.long);
                        }
                      });
        break;
      default:
        break;
    }
  }
  updateLHRSActions = (pointObj) => {
    const optionalItem = {label:"Enter Distance from Point A", value:"enterDistanceFromA"};
    const isOptionalItem = (item)=>{
        return item.value !== optionalItem.value;
      }
    if (pointObj.point === "pointA" ) {
      let items = this.state.selectLHRSActions;
      
      if (pointObj.valid) {
        if (items.filter(item => isOptionalItem(item)).length === items.length){
          items.push(optionalItem);
          
          //fix to get select box to update on the fly
          items = items.concat([]);
          
          this.setState({ selectLHRSActions: items});
        } 
      }else{
        if (items.filter(item => isOptionalItem(item)).length !== items.length){
          items = items.filter(item => isOptionalItem(item));
          
          //fix to get select box to update on the fly
          items = items.concat([]);

          this.setState({ selectLHRSActions: items});
        } 
      }
    }
  }
  _getLHRSActions = () => {
      let items = [
                      {label:"Select Point", value:"selectPoint"},
                      {label:"Enter Lat/Long", value:"enterLatLong"},
                      {label:"Enter Hwy/Distance", value:"enterHwy"},
                      {label:"Enter Basepoint/Offset", value:"enterBasepoint"}
                    ];      
      this.setState({ selectLHRSActions: items, selectLHRSAction: items[0]}, ()=> {this.updateActionValues();});
  }
  onActionChange = (selection) => {
    this.setState({ selectLHRSAction: selection}, ()=> {this.updateActionValues();});
  }
  
  executeAction = () => {
      if (this.state.inputAValue !== null && this.state.inputBValue !== null) {
        let action = this.state.selectLHRSAction.value;
        switch (action){
          case "selectPoint":
            if (!isNaN(parseFloat(this.state.inputAValue)) && !isNaN(parseFloat(this.state.inputBValue))){
              this.calcByLatLong(this.state.inputAValue,this.state.inputBValue, this.state.selectedPoint);
            }else{
              helpers.showMessage("Error", "Invalid Lat/Long.", helpers.messageColors.red, 2000);
            }
            break;
          case "enterLatLong":
            if (!isNaN(parseFloat(this.state.inputAValue)) && !isNaN(parseFloat(this.state.inputBValue))){
              this.calcByLatLong(this.state.inputAValue,this.state.inputBValue,this.state.selectedPoint);
            }else{
              helpers.showMessage("Error", "Invalid Lat/Long.", helpers.messageColors.red, 2000);
            }
            break;
          case "enterHwy":
            if (!isNaN(parseFloat(this.state.inputBValue))){
              this.calcByHwy(this.state.inputAValue,this.state.inputBValue,this.state.selectedPoint);
            }else{
              helpers.showMessage("Error", "Invalid Distance.", helpers.messageColors.red, 2000);
            }
            break;
          case "enterBasepoint":
            if (!isNaN(parseFloat(this.state.inputAValue)) && !isNaN(parseFloat(this.state.inputBValue))){
              this.calcByBasepoint(this.state.inputAValue,this.state.inputBValue,this.state.selectedPoint);
            }else{
              helpers.showMessage("Error", "Invalid Basepoint/Offset.", helpers.messageColors.red, 2000);
            }
            break;
          case "enterDistanceFromA":
            if (!isNaN(parseFloat(this.state.inputAValue))){
              this.calcByHwy(this.state.a_hwy,parseFloat(this.state.a_m_distance) + parseFloat(this.state.inputAValue),"pointB");
            }else{
              helpers.showMessage("Error", "Invalid Distance.", helpers.messageColors.red, 2000);
            }
            break;
          default:
            break;
        }
      }else{
        this.glowContainers();
      }
  }
  allowMapActions = () => {
    if (this.state.allowMapActions){
      this.onPointerMoveEvent = window.map.on("pointermove", this.onPointerMoveHandler);
      this.onMapClickEvent = window.map.on("click", this.onMapClick);
    }else{
      unByKey(this.onPointerMoveEvent);
      unByKey(this.onMapClickEvent);
    }
  } 
  updateActionValues = () => {
      let action = this.state.selectLHRSAction.value;
      let selectedPoint = this.state.selectedPoint;
      let pointObj = this._getPoint(selectedPoint);
      let inputALabel = "";
      let inputAValue = "";
      let inputAType = "";
      let inputAReadOnly = false;
      let inputAPlaceholer = "";
      let inputAHidden = false;
      let inputBLabel = "";
      let inputBValue = "";
      let inputBType = "";
      let inputBReadOnly = false;
      let inputBPlaceholer = "";
      let inputBHidden = false;
      let allowMapActions = true;
      switch(action){
        case "selectPoint":
          inputALabel = "Lat";
          inputAValue = selectedPoint==="pointA"?this.state.inputLatLongXCoordsA:this.state.inputLatLongXCoordsB;
          inputAType = "lat";
          inputAReadOnly = true;
          inputAPlaceholer = "(listening for input)";
          inputAHidden = false;
          inputBLabel = "Long";
          inputBValue = selectedPoint==="pointA"? this.state.inputLatLongYCoordsA : this.state.inputLatLongYCoordsB;
          inputBType = "long";
          inputBReadOnly = true;
          inputBPlaceholer = "(listening for input)";
          allowMapActions =true;
          inputBHidden = false;
          break;
        case "enterLatLong":
          inputALabel = "Lat";
          inputAValue = pointObj.lat;
          inputAType = "lat";
          inputAReadOnly = false;
          inputAPlaceholer = "(Enter Latitude)";
          inputAHidden = false;
          inputBLabel = "Long";
          inputBValue = pointObj.long;
          inputBType = "long";
          inputBReadOnly = false;
          inputBPlaceholer = "(Enter Longitude)";
          allowMapActions =false;
          inputBHidden = false;
          break;
        case "enterHwy":
          inputALabel = "Hwy";
          inputAValue = pointObj.hwy;
          inputAType = "hwy";
          inputAReadOnly = false;
          inputAPlaceholer = "(Enter Hwy)";
          inputAHidden = false;
          inputBLabel = "M Dist. (km)";
          inputBValue = pointObj.m_distance;
          inputBType = "m_distance";
          inputBReadOnly = false;
          inputBPlaceholer = "(Enter Distance)";
          allowMapActions =false;
          inputBHidden = false;
          break;
        case "enterBasepoint":
          inputALabel = "Basepoint";
          inputAValue = pointObj.basepoint;
          inputAType = "basepoint";
          inputAReadOnly = false;
          inputAPlaceholer = "(Enter Basepoint)";
          inputAHidden = false;
          inputBLabel = "Offset (km)";
          inputBValue = pointObj.offset;
          inputBType = "offset";
          inputBReadOnly = false;
          inputBPlaceholer = "(Enter Offset)";
          allowMapActions =false;
          inputBHidden = false;
          break;
        case "enterDistanceFromA":
          let defaultDistance = null;
          if (this.state.b_m_distance !== null) defaultDistance = this.state.b_m_distance-this.state.a_m_distance;
          inputALabel = "M Dist. From A (km)";
          inputAValue = defaultDistance;
          inputAType = "m_distance";
          inputAReadOnly = false;
          inputAPlaceholer = "(Enter Distance from A)";
          inputAHidden = false;
          inputBLabel = "";
          inputBValue = "";
          inputBType = "";
          inputBReadOnly = "";
          inputBPlaceholer = "";
          inputBHidden = true;
          allowMapActions =false;
          selectedPoint = "pointB";
          break;
        default:
          break;
      }
      this.setState({
                    inputALabel:inputALabel,
                    inputAValue:inputAValue,
                    inputAType:inputAType,
                    inputAReadOnly:inputAReadOnly,
                    inputAPlaceholer:inputAPlaceholer,
                    inputAHidden:inputAHidden,
                    inputBLabel:inputBLabel,
                    inputBValue:inputBValue,
                    inputBType:inputBType,
                    inputBReadOnly:inputBReadOnly,
                    inputBPlaceholer:inputBPlaceholer,
                    inputBHidden:inputBHidden,
                    allowMapActions:allowMapActions,
                    selectedPoint:selectedPoint
                    }, () => {this.allowMapActions();this.executeAction();});
      
  }
  calcByBasepoint = (basepoint, offset, pointName) => {
    let pointObj = this._getPoint(pointName);
    let data = {
      "version": this.state.selectLHRSVersion.value,
      "snappingDistance": this.state.snappingDistance,
      "basepoint":basepoint,
      "offset":offset
    };
    helpers.postJSON(mainConfig.apiUrl + "postGetLHRSByBPoint/", data, retResult => {
      if (retResult.result !== undefined) {
        var result = retResult.result;
        pointObj.lat = parseFloat(result.latitude_in).toFixed(7);
        pointObj.long = parseFloat(result.longitude_in).toFixed(7); 
        pointObj.hwy = result.hwy;
        pointObj.m_distance = result.m_distance; 
        pointObj.basepoint = result.basepoint; 
        pointObj.offset = result.lhrs_offset;
        pointObj.snapped_distance = result.snapping_distance;
        pointObj.valid = true;
        
      }else{

        pointObj.lat = null;
        pointObj.long=null; 
        pointObj.m_distance=null; 
        pointObj.hwy=null;
        pointObj.basepoint=basepoint; 
        pointObj.offset=offset;
        pointObj.snapped_distance=null;
        pointObj.valid = false;
        helpers.showMessage("Not Found", "No LHRS Data Found.", helpers.messageColors.green, 1500, true);
      }
      this._setPoint(pointObj);
    });
  }
  calcByHwy = (hwy,m_distance,pointName) => {
    let pointObj = this._getPoint(pointName);
    let data = {
      "version": this.state.selectLHRSVersion.value,
      "snappingDistance": this.state.snappingDistance,
      "hwy":hwy,
      "distance":m_distance
    };
    helpers.postJSON(mainConfig.apiUrl + "postGetLHRSByMDistance/", data, retResult => {
      if (retResult.result !== undefined) {
        var result = retResult.result;
        pointObj.lat = parseFloat(result.latitude_in).toFixed(7);
        pointObj.long = parseFloat(result.longitude_in).toFixed(7); 
        pointObj.hwy = result.hwy;
        pointObj.m_distance = result.m_distance; 
        pointObj.basepoint = result.basepoint; 
        pointObj.offset = result.lhrs_offset;
        pointObj.snapped_distance = result.snapping_distance;
        pointObj.valid = true;
      }else{
        pointObj.lat = null;
        pointObj.long=null; 
        pointObj.m_distance=m_distance; 
        pointObj.hwy=hwy;
        pointObj.basepoint=null; 
        pointObj.offset=null;
        pointObj.snapped_distance=null;
        pointObj.valid = false;
        helpers.showMessage("Not Found", "No LHRS Data Found.", helpers.messageColors.green, 1500, true);
      }
      this._setPoint(pointObj);
    });
  }
  calcByLatLong = (lat,long,pointName) =>{
      let pointObj = this._getPoint(pointName);
      let data = {
                  "version": this.state.selectLHRSVersion.value,
                  "snappingDistance": this.state.snappingDistance,
                  "long":long,
                  "lat":lat
                };
      helpers.postJSON(mainConfig.apiUrl + "postGetLHRSByXY/", data, retResult => {
        if (retResult.result !== undefined) {
            var result = retResult.result;
            pointObj.lat =  parseFloat(result.latitude_in).toFixed(7);
            pointObj.long = parseFloat(result.longitude_in).toFixed(7); 
            pointObj.hwy = result.hwy;
            pointObj.m_distance=result.m_distance; 
            pointObj.basepoint=result.basepoint; 
            pointObj.offset=result.lhrs_offset;
            pointObj.snapped_distance=result.snapping_distance;
            pointObj.valid = true;
            
        }else{
              pointObj.lat = lat;
              pointObj.long=long; 
              pointObj.hwy = null;
              pointObj.m_distance=null; 
              pointObj.basepoint=null; 
              pointObj.offset=null;
              pointObj.snapped_distance=null;
              pointObj.valid = false;
              helpers.showMessage("Not Found", "Location selected is outside the defined snapping threshold.\nPlease pick a location within the defined threshold or increase the defined threshold.", helpers.messageColors.green, 2500,true);
          }
          this._setPoint(pointObj);
        });
  }
  calcLinearFeature = async (hwy,fromDistance,toDistance) => {
    let data = {
                "version": this.state.selectLHRSVersion.value,
                "snappingDistance": this.state.snappingDistance,
                "hwy":hwy,
                "fromDistance":fromDistance,
                "toDistance":toDistance
              };
    this.vectorLayerLinear.getSource().clear();
    helpers.postJSON(mainConfig.apiUrl + "postGetLHRSLinearByMDistance/", data, retResult => {
      if (retResult.result !== undefined) {
          var result = retResult.result;
          if (result.geom !== undefined && result.geom !== null && result.section_length > 0){
            var feature = helpers.getFeatureFromGeoJSON(result.geom);
            let labelText = result.section_length + " km";
            feature.setProperties({featureId:helpers.getUID(), label: labelText, clickable: true, labelVisible: true });
            this.vectorLayerLinear.getSource().addFeature(feature);
            let style = this.vectorLayerLinear.getStyle();
            const textStyle = helpers.createTextStyle(feature,"label", undefined,undefined,undefined,"16px");
            style.setText(textStyle);
            this.vectorLayerLinear.setStyle(style);
            
            this.setState({linearFeatureLength:result.section_length},() => {
              window.map.getView().fit(feature.getGeometry().getExtent(), window.map.getSize(), { duration: 1000 });
              window.map.getView().setZoom(window.map.getView().getZoom() - 1);
            });
          }
      }
    });
  }
  onMapMoveEnd = evt => {
    return;
  }
  updateCoordinates = (webMercatorCoords) => {
    const latLongCoords = transform(webMercatorCoords, "EPSG:3857", "EPSG:4326");
    if (this.state.selectedPoint === "pointA"){
      this.setState(
          { 
            inputLatLongXCoordsA: latLongCoords[1].toFixed(7), 
            inputLatLongYCoordsA: latLongCoords[0].toFixed(7)
          }, () => {this.updateActionValues();}
      );
    }else{
      this.setState(
          { 
            inputLatLongXCoordsB: latLongCoords[1].toFixed(7), 
            inputLatLongYCoordsB: latLongCoords[0].toFixed(7)
          },() => {this.updateActionValues();}
      );
    }
    //this.glowContainers();
  }
  onMapClick = evt => {
      const webMercatorCoords = evt.coordinate;
      this.updateCoordinates(webMercatorCoords);
      this.createPoint(webMercatorCoords, false);
  }

  zoomToPoint = (lat, long) =>{
    if (lat !== null && long !== null){
      const webMercatorCoords = transform([long,lat],  "EPSG:4326","EPSG:3857");
      window.map.getView().animate({ center: webMercatorCoords},{duration:100});
    }
  }

  updatePoint = (pointName, lat, long) => {
    const webMercatorCoords =transform([long,lat],  "EPSG:4326","EPSG:3857");
    this.createPoint(webMercatorCoords, false, pointName);
  }
  createPoint = (webMercatorCoords, zoom = false, pointName = null) => {
    // CREATE POINT
    if (pointName === null) pointName = this.state.selectedPoint;
    const pointFeature = new Feature({
      geometry: new Point(webMercatorCoords)
    });
    pointFeature.setProperties({featureId:helpers.getUID(),  clickable: true });
    if (pointName==="pointA"){
      this.vectorLayerA.getSource().clear();
      this.vectorLayerA.getSource().addFeature(pointFeature);
    }else{
      this.vectorLayerB.getSource().clear();
      this.vectorLayerB.getSource().addFeature(pointFeature);
    }
    

    // ZOOM TO IT
    if (zoom) window.map.getView().animate({ center: webMercatorCoords},{duration:100});
  }
  glowContainers() {
    helpers.glowContainer("sc-lhrs-input-a", "green");
    helpers.glowContainer("sc-lhrs-input-b", "green");
  }
  // POINTER MOVE HANDLER
  onPointerMoveHandler = evt => {
    const webMercatorCoords = evt.coordinate;
    const latLongCoords = transform(webMercatorCoords, "EPSG:3857", "EPSG:4326");
    
    this.setState({
      liveWebMercatorCoords: webMercatorCoords,
      liveLatLongCoords: latLongCoords
    });
  }
  componentWillUnmount() {
    // UNREGISTER EVENTS
    if (this.state.allowMapActions){
      unByKey(this.onPointerMoveEvent);
      unByKey(this.onMapClickEvent);
    }
    // REMOVE THE LAYER
    window.map.removeLayer(this.vectorLayerA);
    window.map.removeLayer(this.vectorLayerB);
    window.map.removeLayer(this.vectorLayerLinear);
    this._isMounted = false;
  }

  onClose() {
    // CALL PARENT WITH CLOSE
    this.props.onClose();
  }

  onVersionChange = selection => {
    this.setState({ selectLHRSVersion: selection}, () => {
      if (this.state.a_valid){
        this.calcByHwy(this.state.a_hwy,this.state.a_m_distance, "pointA");;
      }
      if (this.state.b_valid){
        this.calcByHwy(this.state.b_hwy,this.state.b_m_distance, "pointB");;
      }
    });
  }
  
  onPointSwitchChange = () => {
    if(this.state.selectedPoint==="pointA") {
      this.setState({selectedPoint:"pointB", selectedPointLabel:"Point B"}, () => {this.updateActionValues();}); 
    }else{
      this.setState({selectedPoint:"pointA", selectedPointLabel:"Point A"}, () => {this.updateActionValues();}); 
    }
  }

  render() {
    return (
      <PanelComponent onClose={this.props.onClose} name={this.props.name} helpLink={this.props.helpLink} allowClick={true} type="tools">
        <div className="sc-lhrs-container">
          <div className="sc-container">
        
              <div className="sc-lhrs-row sc-arrow">
                <label>LHRS Version:</label>
                <span>
                  <Select id="sc-lhrs-version-select" 
                      onChange={this.onVersionChange} 
                      options={this.state.selectLHRSVersions} 
                      value={this.state.selectLHRSVersion} /> 
                  </span>
              </div>
              <div className="sc-lhrs-row sc-arrow">
                <label>Snapping Dist.(m):</label>
                <span> 
                  <input id="sc-lhrs-snapping-distance-select" 
                  type="text"
                  className="sc-lhrs-input sc-lhrs-input-sm sc-editable" 
                  onChange={evt => {
                    this.setState({ snappingDistance: evt.target.value }, ()=> {this.executeAction();});
                  }} 
                  value={this.state.snappingDistance} />
                </span>
              </div>
              
            <div className="sc-container">
              
                <div className="sc-lhrs-row sc-arrow">
                  <label>LHRS Entry:</label>
                  <span> 
                    <Select id="sc-lhrs-action-select" onChange={this.onActionChange} options={this.state.selectLHRSActions} value={this.state.selectLHRSAction} />
                  </span>
                </div>
                <div className={"sc-lhrs-row sc-arrow" + (this.state.a_valid ? "" : " sc-hidden")} title="Select a second point to create a linear feature">
                <label>Point:</label>
                  <span>
                      <Switch className="sc-lhrs-point-switch" 
                              onChange={this.onPointSwitchChange} 
                              checked={this.state.selectedPoint==="pointA"?false:true} 
                              height={20} 
                              width={160} 
                              uncheckedIcon={<span className="off">Point A</span>}
                              checkedIcon={<span className="on">Point B</span>}
                              offColor={"#12128F"}
                              onColor={"#5E1010"}
                               />
                    
                  </span>
                  
                </div>
                <LHRSInputRow label={this.state.inputALabel} 
                      value={this.state.inputAValue} 
                      onChange={evt => {this.setState({inputAValue:evt.target.value});}}
                      onFocus={evt => {helpers.disableKeyboardEvents(true);}}
                      onBlur={evt => {this.executeAction(); helpers.disableKeyboardEvents(false);}}
                      onEnterKey={evt => {this.executeAction();}}
                      inputId={"sc-lhrs-input-a"} 
                      hidden={this.state.inputAHidden}
                      readOnly={this.state.inputAReadOnly}
                      placeholer={this.state.inputAPlaceholer} />
                <LHRSInputRow label={this.state.inputBLabel} 
                      value={this.state.inputBValue} 
                      onChange={evt => {this.setState({inputBValue:evt.target.value});}}
                      onFocus={evt => {helpers.disableKeyboardEvents(true);}}
                      onBlur={evt => {this.executeAction(); helpers.disableKeyboardEvents(false);}}
                      onEnterKey={evt => {this.executeAction();}}
                      inputId={"sc-lhrs-input-b"} 
                      hidden={this.state.inputBHidden}
                      readOnly={this.state.inputBReadOnly}
                      placeholer={this.state.inputBPlaceholer} />
              </div>
              <div >
              <div className="sc-title sc-lhrs-title">Captured / Selected Coordinates</div>
                <div className={((this.state.a_valid && this.state.b_valid && this.state.linearFeatureLength !==null) ? "" : " sc-hidden")}>
                  <div className="sc-title sc-lhrs-title">Section</div>
                  <LHRSRow label="Length (km)" 
                  value={this.state.linearFeatureLength} 
                  onChange={() => {}}
                  inputId="sc-lhrs-section-length" 
                  readOnly={true}
                  placeholer="" />
                </div>
              
             
              <div className="sc-title sc-lhrs-title">Point A</div>
              <LHRSPoint 
                  lat={this.state.a_lat}
                  long={this.state.a_long}
                  hwy={this.state.a_hwy}
                  m_distance={this.state.a_m_distance}
                  basepoint={this.state.a_basepoint}
                  offset={this.state.a_offset}
                  snapped_distance={this.state.a_snapped_distance}
              />
            </div>
            <div className={(this.state.a_valid ? "" : " sc-hidden")}>
              <div className="sc-title sc-lhrs-title">Point B</div>
              <LHRSPoint 
                lat={this.state.b_lat}
                long={this.state.b_long}
                hwy={this.state.b_hwy}
                m_distance={this.state.b_m_distance}
                basepoint={this.state.b_basepoint}
                offset={this.state.b_offset}
                snapped_distance={this.state.b_snapped_distance}
              />
            </div>
            
          </div>
          
        </div>
      </PanelComponent>
    );
  }
}

export default LHRS;
// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}

