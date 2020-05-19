import React, { Component } from "react";
import "./AddLayer.css";
import Switch from "react-switch";
import * as helpers from "../../../../helpers/helpers";
import Select from "react-select";
import FormatType from "ol/format/FormatType";


class AddLayerForm extends Component {
    constructor(props) {
      super(props);
  
      this.inputId = "sc-toc-add-layer-input";
      this.state = {
        selectFormatOptions: [],
        selectFormatOption: undefined,
        serverUrl:"",
        selectLayerOptions:[],
        selectLayerOption:undefined,
        selectProjectionOptions:[],
        selectProjectionOption:undefined,
        layer_displayName:"",
        layer_source:undefined,
        layer_format:undefined,
        layer_type:undefined,
        layer_file:undefined,
        layer_name: "",
        layer_extent: undefined,
        selectedFormat:undefined,
        errorRegister:[]
      };
      this.layer_translation = [
          {key:"wms", source:"WMS", method:"raster", type:"WMS", urlSuffix:"/{z}/{x}/{y}.png"},
          {key:"wmts",source:"WMTS",method:"raster",type: "WMTS"},
          {key:"stamen",source:"service",method:"raster",type: "Stamen"},
          {key:"osm",source:"service",method:"raster",type: "OSM"},
          {key:"xyz",source:"service",method:"raster",type: "XYZ", urlSuffix:"/{z}/{x}/{y}.png"},
          {key:"static",source:"file",method:"raster",type: "static"},
          {key:"remote_gml3",source:"remote",method:"vector",type: "GML3"},
          {key:"remote_gml2",source:"remote",method:"vector",type: "GML2"},
          {key:"remote_gpx",source:"remote",method:"vector",type: "GPX"},
          {key:"remote_kml",source:"remote",method:"vector",type: "KML"},
          {key:"remote_osmxml",source:"remote",method:"vector",type: "OSMXML"},
          {key:"remote_esrijson",source:"remote",method:"vector",type: "EsriJSON"},
          {key:"remote_geojson",source:"remote",method:"vector",type: "GeoJSON"},
          {key:"remote_topojson",source:"remote",method:"vector",type: "TopoJSON"},
          {key:"remote_igc",source:"remote",method:"vector",type: "IGC"},
          {key:"remote_polyline",source:"remote",method:"vector",type: "Polyline"},
          {key:"remote_wkt",source:"remote",method:"vector",type: "WKT"},
          {key:"remote_mvt",source:"remote",method:"vector",type: "MVT"},
          {key:"local_gml3",source:"file",method:"vector",type: "GML3"},
          {key:"local_gml2",source:"file",method:"vector",type: "GML2"},
          {key:"local_gpx",source:"file",method:"vector",type: "GPX"},
          {key:"local_kml",source:"file",method:"vector",type: "KML"},
          {key:"local_osmxml",source:"file",method:"vector",type: "OSMXML"},
          {key:"local_esrijson",source:"file",method:"vector",type: "EsriJSON"},
          {key:"local_geojson",source:"file",method:"vector",type: "GeoJSON"},
          {key:"local_topojson",source:"file",method:"vector",type: "TopoJSON"},
          {key:"local_igc",source:"file",method:"vector",type: "IGC"},
          {key:"local_polyline",source:"file",method:"vector",type: "Polyline"},
          {key:"local_wkt",source:"file",method:"vector",type: "WKT"},
          {key:"local_mvt",source:"file",method:"vector",type: "MVT"},
          {key:"wfs_gml3",source:"wfs",method:"vector",type: "GML3"},
          {key:"wfs_gml2",source:"wfs",method:"vector",type: "GML2"},
          {key:"wfs_gpx",source:"wfs",method:"vector",type: "GPX"},
          {key:"wfs_kml",source:"wfs",method:"vector",type: "KML"},
          {key:"wfs_osmxml",source:"wfs",method:"vector",type: "OSMXML"},
          {key:"wfs_esrijson",source:"wfs",method:"vector",type: "EsriJSON"},
          {key:"wfs_geojson",source:"wfs",method:"vector",type: "GeoJSON"},
          {key:"wfs_topojson",source:"wfs",method:"vector",type: "TopoJSON"},
          {key:"wfs_igc",source:"wfs",method:"vector",type: "IGC"},
          {key:"wfs_polyline",source:"wfs",method:"vector",type: "Polyline"},
          {key:"wfs_wkt",source:"wfs",method:"vector",type: "WKT"},
          {key:"wfs_mvt",source:"wfs",method:"vector",type: "MVT"},
  
      ];
      this.defaultLayerOption = {label:"Not Found", value:""};
    }
    componentDidMount() {
        this._setDefaultFormatOptions();
        this._setDefaultProjectionOptions();
    }
   componentWillReceiveProps(){
        if (this.props.isOpen) {
            //Get defaults when panel is opened
            this._setDefaultFormatOptions();
            this._setDefaultProjectionOptions();
        }else{
            //Reset State when panel is hidden
            this.setState({selectFormatOptions: [],
                selectFormatOption: undefined,
                serverUrl:"",
                file:undefined,
                selectLayerOptions:[],
                selectLayerOption:undefined,
                selectProjectionOptions:[],
                selectProjectionOption:undefined,
                layer_displayName:"",
                layer_source:undefined,
                layer_format:undefined,
                layer_type:undefined,
                layer_extent:[],
                selectedFormat:undefined,
                errorRegister:[]});
        }
   }
    _setDefaultFormatOptions = () => {
        const items = [
            {label:"Raster Layers", options:[
                {label:"Web Map Service (WMS)", value:"wms"},
                {label:"Web Map Tile Service (WMTS)", value:"wmts"},
                {label:"Stamen", value:"stamen"},
                {label:"OpenStreetMap", value:"osm"},
                {label:"Tile with XYZ format", value:"xyz"},
                {label:"Static Image", value:"static"}
            ]},
            {label:"WFS Vector Layers", options: [
                {label:"GML3 (default for WFS)", value:"wfs_gml3"},
                {label:"GML2", value:"wfs_gml2"},
                {label:"GPX", value:"wfs_gpx"},
                {label:"KML", value:"wfs_kml"},
                {label:"OSMXML", value:"wfs_osmxml"},
                {label:"EsriJSON", value:"wfs_esrijson"},
                {label:"GeoJSON", value:"wfs_geojson"},
                {label:"TopoJSON", value:"wfs_topojson"},
                {label:"IGC", value:"wfs_igc"},
                {label:"Polyline", value:"wfs_polyline"},
                {label:"WKT", value:"wfs_wkt"},
                {label:"Mapbox", value:"wfs_mvt"}
            ]},
            {label:"Remote Vector Layers", options: [
                {label:"GML3 (default for WFS)", value:"remote_gml3"},
                {label:"GML2", value:"remote_gml2"},
                {label:"GPX", value:"remote_gpx"},
                {label:"KML", value:"remote_kml"},
                {label:"OSMXML", value:"remote_osmxml"},
                {label:"EsriJSON", value:"remote_esrijson"},
                {label:"GeoJSON", value:"remote_geojson"},
                {label:"TopoJSON", value:"remote_topojson"},
                {label:"IGC", value:"remote_igc"},
                {label:"Polyline", value:"remote_polyline"},
                {label:"WKT", value:"remote_wkt"},
                {label:"Mapbox", value:"remote_mvt"}
            ]},
            {label:"Local Vector Layers", options: [
                {label:"GML3 (default for WFS)", value:"local_gml3"},
                {label:"GML2", value:"local_gml2"},
                {label:"GPX", value:"local_gpx"},
                {label:"KML", value:"local_kml"},
                {label:"OSMXML", value:"local_osmxml"},
                {label:"EsriJSON", value:"local_esrijson"},
                {label:"GeoJSON", value:"local_geojson"},
                {label:"TopoJSON", value:"local_topojson"},
                {label:"IGC", value:"local_igc"},
                {label:"Polyline", value:"local_polyline"},
                {label:"WKT", value:"local_wkt"},
                {label:"Mapbox", value:"local_mvt"}
            ]}
            

            
        ];

        const selectedFormat = this.layer_translation.filter(item => item.key === items[0].options[0].value)[0];
        this.setState({selectFormatOptions:items, selectFormatOption:items[0].options[0],selectedFormat:selectedFormat});
    }

    _setDefaultProjectionOptions = () => {
        const items = [
                        {label:"WGS 84 / Pseudo-Mercator", value:"EPSG:3857"},
                        {label:"WGS 84 (long/lat)", value:"EPSG:4326"},
                        {label:"HD72 EOV", value:"EPSG:23700"}
                    ];
        this.setState({selectProjectionOptions:items, selectProjectionOption:items[0]});
    }

    onClose = () =>{
        this.props.onClose();
    }

    clearLayers = () => {
        this.setState({selectLayerOptions:[], selectLayerOption:this.defaultLayerOption});
    }

    onLayerFormatChange = (selection) =>{
        const selectedFormat = this.layer_translation.filter(item => item.key === selection.value)[0];
        this.setState({selectFormatOption:selection, selectedFormat: selectedFormat}, () => {if ( this.state.selectLayerOption !== this.defaultLayerOption) this.clearLayers()});
    }
    onLayerSelectChange = (selection) =>{
        let displayName = this.state.layer_displayName;
        if (displayName.length < 1) displayName = selection.label;
        this.setState({selectLayerOption:selection,layer_name:selection.value,layer_displayName:displayName});
    }
    onCheckForLayers = () => {
        let selectedLayer = this.defaultLayerOption;
        let selectLayers = [];
        //CLEAR LAYERS LIST AND ATTEMPT TO REPOPULATE
        this.setState({selectLayerOptions:selectLayers, selectLayerOption:selectedLayer}, () =>{
            helpers.getCapabilities(this.state.serverUrl, this.state.selectedFormat.source, (layers) =>{
                selectLayers = layers;
                if (selectLayers !== undefined && selectLayers.length > 0) selectedLayer = selectLayers[0];
                this.setState({selectLayerOptions:selectLayers, selectLayerOption:selectedLayer});
            });
        });
    }

    addLayer = (layer) => {
        const styleUrl = layer.Style !== undefined ? layer.Style[0].LegendURL[0].OnlineResource[0].$["xlink:href"].replace("http", "https") : ""; 
        layer.setVisible(true);
        layer.setOpacity(1);
        layer.setProperties({ name: this.state.layer_name, displayName:  this.state.layer_displayName, disableParcelClick: true });
        const newLayer = {
            name: this.state.layer_name, // FRIENDLY NAME
            height: 30, // HEIGHT OF DOM ROW FOR AUTOSIZER
            drawIndex: undefined, // INDEX USED BY VIRTUAL LIST
            index: undefined, // INDEX USED BY VIRTUAL LIST
            styleUrl: styleUrl, // WMS URL TO LEGEND SWATCH IMAGE
            showLegend: false, // SHOW LEGEND USING PLUS-MINUS IN TOC
            legendHeight: -1, // HEIGHT OF IMAGE USED BY AUTOSIZER
            legendImage: null, // IMAGE DATA, STORED ONCE USER VIEWS LEGEND
            visible: true, // LAYER VISIBLE IN MAP, UPDATED BY CHECKBOX
            layer: layer, // OL LAYER OBJECT
            metadataUrl: "", // ROOT LAYER INFO FROM GROUP END POINT
            opacity: 1.0, // OPACITY OF LAYER
            minScale: undefined, //MinScaleDenominator from geoserver
            maxScale: undefined, //MaxScaleDenominator from geoserver
            liveLayer: false, // LIVE LAYER FLAG
            wfsUrl: "",
            displayName: this.state.layer_displayName,
            tocDisplayName: this.state.layer_displayName, // DISPLAY NAME USED FOR TOC LAYER NAME
            canDownload: false, 
            group: "",
            groupName: ""
          };
        window.emitter.emit("addCustomLayer", newLayer);
    }


    isValidLayer = (showError) => {
        let errors = this.state.errorRegister;
        let isValid = false;
        const isNotDefault = this.state.selectLayerOption !== this.defaultLayerOption;
        if (!isNotDefault){
            errors.push({message:"Invalid Layer Selected", field:"sc-input-layers"});
        }

        isValid = isNotDefault;
        if (showError && !isValid) {
            this.setState({errorRegister:errors}, () => {return isValid;});
        }else{
            return isValid;
        }

    }
    isValid = (showErrors, callback) => {
        this.setState({errorRegister:[]}, () => {
            let validLayer = this.isValidLayer(showErrors);
            if (showErrors && !validLayer) console.log(this.state.errorRegister);
            callback(validLayer);
        });
    } 
    onAddLayerClick = () => {
        const format = this.state.selectedFormat;
        this.isValid(true, (isValid) =>{
            if (isValid){
                switch (format.method){
                    case "raster":
                        helpers.getRasterLayer(
                            this.state.serverUrl,
                            this.state.layer_name, 
                            format.type,
                            this.state.layer_displayName,
                            this.state.selectProjectionOption.value,
                            this.state.layer_file,
                            this.state.layer_extent,
                            this.addLayer);
                        break;
                    case "vector":
                        helpers.getVectorLayer(
                            this.state.serverUrl,
                            this.state.layer_name,
                            format.type,
                            this.state.layer_displayName,
                            this.state.selectProjectionOption.value,
                            format.source,
                            this.state.layer_file,
                            false,
                            this.addLayer);
                        break;
                    default:
                        break;
                }
            }
        });
        
    }

    render() {
        return (
            <div >
                <div className="sc-toc-add-layer-header">
                    <h4 className="sc-toc-add-layer-title">Add layer</h4>
                    <button type="button" className="sc-toc-add-layer-close sc-button" onClick={this.onClose}>&times;</button>
                  
                </div>
                <div className="sc-toc-add-layer-body">
                    <div className="sc-toc-add-layer-row">
                        <label htmlFor="sc-toc-add-layer-display-name">Display name:</label>
                        <input 
                            id="sc-toc-add-layer-display-name" 
                            type="text"
                            className="sc-toc-add-layer-input input" 
                            onChange={evt => {this.setState({ layer_displayName: evt.target.value });}} 
                            onFocus={evt => {helpers.disableKeyboardEvents(true);}}
                            onBlur={evt => {helpers.disableKeyboardEvents(false);}}
                            value={this.state.layer_displayName} />
                    </div>
                    <div className="sc-toc-add-layer-row">
                        <label htmlFor="sc-input-format">Layer Format:</label>
                        <Select 
                            id="sc-input-format" 
                            onChange={this.onLayerFormatChange} 
                            options={this.state.selectFormatOptions} 
                            value={this.state.selectFormatOption}
                            className="sc-toc-add-layer-select" />

                    </div>
                    <div className="sc-toc-add-layer-row">
                        <label htmlFor="sc-input-projection">Projection:</label>
                        <Select 
                            id="sc-input-projection" 
                            onChange={(selection) => {this.setState({selectProjectionOption:selection});}} 
                            options={this.state.selectProjectionOptions} 
                            value={this.state.selectProjectionOption} 
                            className="sc-toc-add-layer-select" />
                    </div> 
                    <div className="sc-toc-add-layer-row">
                        <label htmlFor="sc-toc-add-layer-server">Server URL:</label><br />
                        <input 
                            id="sc-toc-add-layer-server" 
                            type="text"
                            placeholder="https://intra.dev.regionalgis.mto.gov.on.ca/geoserver/ows"
                            className="sc-toc-add-layer-input input" 
                            onChange={evt => {this.setState({ serverUrl: evt.target.value }, () => {if ( this.state.selectLayerOption !== this.defaultLayerOption) this.clearLayers()});}} 
                            onFocus={evt => {helpers.disableKeyboardEvents(true);}}
                            onBlur={evt => {helpers.disableKeyboardEvents(false);}}
                            value={this.state.serverUrl} />
                        <button 
                            type="button" 
                            name="check" 
                            className="sc-button"
                            onClick={this.onCheckForLayers}>Check for layers</button>
                    </div> 
                    
                    <div className="sc-toc-add-layer-row">
                        <label htmlFor="sc-input-layers" >Layer Name:</label>
                        <Select 
                            id="sc-input-layers" 
                            onChange={this.onLayerSelectChange} 
                            options={this.state.selectLayerOptions} 
                            value={this.state.selectLayerOption} 
                            className="sc-toc-add-layer-select"/>
                    </div> 
                    <div className="sc-hidden sc-toc-add-layer-row">
                        <label htmlFor="sc-toc-add-layer-file">File:</label>
                        <input id="sc-toc-add-layer-file" className="sc-toc-add-layer-input input"  type="file" name="file" size="60" />
                    </div> 
                    <div className="sc-hidden sc-toc-add-layer-row">
                        <label htmlFor="sc-toc-add-layer-extent" >Extent:</label>
                        <input 
                            id="sc-toc-add-layer-extent" 
                            type="text"
                            placeholder="TopX, TopY, BottomX, BottomY"
                            className="sc-toc-add-layer-input input" 
                            onChange={evt => {this.setState({ layer_extent: evt.target.value });}} 
                            onFocus={evt => {helpers.disableKeyboardEvents(true);}}
                            onBlur={evt => {helpers.disableKeyboardEvents(false);}}
                            value={this.state.layer_extent} />
                    </div>
                </div>
                <div className="sc-toc-add-layer-footer">
                  <button type="button" className="sc-button" onClick={this.onAddLayerClick}>Add layer</button>
                  <button type="button" className="sc-button" onClick={this.onClose}>Cancel</button>
                </div>
          </div>
        );
    }
}

export default AddLayerForm;