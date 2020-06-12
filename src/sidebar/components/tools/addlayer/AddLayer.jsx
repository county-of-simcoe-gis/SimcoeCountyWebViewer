import React, { Component } from "react";
import "./AddLayer.css";
import * as addLayerConfig from "./config.json"
import PanelComponent from "../../../PanelComponent";
import Switch from "react-switch";
import * as helpers from "../../../../helpers/helpers";
import Select from "react-select";


class AddLayerForm extends Component {
    constructor(props) {
      super(props);
      this.defaultLayerName = "New Layer";
      this.inputId = "sc-add-layer-input";
      this.state = {
        selectFormatOptions: [],
        selectFormatOption: undefined,
        serverUrl:"",
        selectLayerOptions:[],
        selectLayerOption:undefined,
        selectProjectionOptions:[],
        selectProjectionOption:undefined,
        userEdit_displayName: false,
        layer_displayName:this.defaultLayerName,
        layer_source:undefined,
        layer_format:undefined,
        layer_type:undefined,
        layer_file:undefined,
        layer_name: "",
        layer_extent: undefined,
        selectedFormat:undefined,
        isFile:false,
        hasLayers:false,
        discovery_message:"",
        showExtent:false,
        errorRegister:[], 
        file_formats:[]
      };
      this.defaultLayerOption = {label:"Not Found", value:""};
    }
    componentDidMount() {
        this._setFormatTypes();
        this._setDefaultProjectionOptions();
        this._setLayerGroupOptions();
    }
    _setFormatTypes = () => {
        const items = addLayerConfig.dataTypes;
        const selectedFormat = this.getSelectedFormat(items[0].options[0].value);
        let fileFormats = [];
        addLayerConfig.translations.forEach(item=> {
            if (item.extensions!==undefined) fileFormats.push(...item.extensions.split(","));
        });
        this.setState({
                selectFormatOptions:items[0].options, 
                selectFormatOption:items[0].options[0],
                selectedFormat:selectedFormat,
                isFile:selectedFormat.source==="file",
                showExtent:selectedFormat.type==="static",
                file_formats: fileFormats});
    }
   _setLayerGroupOptions =()=>{
       let groups = window.allLayers;
       let options = [];
       groups.forEach(group =>{
        options.push({label:group[0].groupName, value:group[0].group});
       });
       options = options.concat([]);
       this.setState({selectGroupOptions:options, selectGroupOption:options[0]});
   }
    _setDefaultProjectionOptions = () => {
        const items = addLayerConfig.projections;
        this.setState({selectProjectionOptions:items, selectProjectionOption:items[0]});
    }
    getSelectedFormat = (value) =>{
        const items = addLayerConfig.translations;
        return items.filter(item => item.key === value)[0];
    }
    getFileFormat = (value) =>{
        const items = addLayerConfig.translations.filter(item => item.extensions!==undefined);
        return items.filter(item => item.extensions.indexOf(value) !== -1)[0];
    }
    onClose = () =>{
        this.props.onClose();
    }
    clearLayers = () => {
        this.setState({selectLayerOptions:[], selectLayerOption:this.defaultLayerOption, hasLayers:false,discovery_message:""});
    }
    onLayerSourceChange = (isFile) =>{
        let items = addLayerConfig.dataTypes;
        const filterLabel = (isFile?"File":"URL");
        items = items.filter(item => item.label === filterLabel)[0];
        let options = items.options;
        const selectedFormat = this.getSelectedFormat(options[0].value);
        this.setState({selectFormatOptions: options, selectFormatOption:options[0], selectedFormat: selectedFormat,isFile:selectedFormat.source==="file",showExtent:selectedFormat.type==="static"}, () => {
            if ( this.state.selectLayerOption !== this.defaultLayerOption) this.clearLayers();
        });
    }
    onLayerFormatChange = (selection) =>{
        const selectedFormat = this.getSelectedFormat(selection.value);
        this.setState({selectFormatOption:selection, selectedFormat: selectedFormat}, () => {
            if ( this.state.selectLayerOption !== this.defaultLayerOption) this.clearLayers();
        });
    }
    onLayerSelectChange = (selection) =>{
        let displayName = this.state.layer_displayName;
        if (!this.state.userEdit_displayName) displayName = selection.label;
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
                else selectLayers = [];
                this.setState({selectLayerOptions:selectLayers, selectLayerOption:selectedLayer, hasLayers:selectLayers.length > 0, discovery_message:selectLayers.length > 0?"":"NO LAYERS FOUND"});
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
            metadataUrl: null, // ROOT LAYER INFO FROM GROUP END POINT
            opacity: 1.0, // OPACITY OF LAYER
            minScale: undefined, //MinScaleDenominator from geoserver
            maxScale: undefined, //MaxScaleDenominator from geoserver
            liveLayer: false, // LIVE LAYER FLAG
            wfsUrl: "",
            displayName: this.state.layer_displayName,
            canDownload: false, 
            group: "",
            groupName: ""
          };
        window.emitter.emit("addCustomLayer", newLayer, this.state.selectGroupOption.value);
    }
    isValidLayer = (showError) => {
        let errors = this.state.errorRegister;
        let isValid = false;
        const isNotDefault = this.state.selectLayerOption !== this.defaultLayerOption;
        if (!isNotDefault && !this.state.isFile){
            errors.push({message:"Invalid Layer Selected", field:"sc-input-layers"});
        }
        if (this.state.isFile){
            isValid = true;
        }else{
            isValid = isNotDefault;
        }
        
        if (showError && !isValid) {
            this.setState({errorRegister:errors}, () => {return isValid;});
        }else{
            return isValid;
        }

    }
    isValid = (showErrors, callback) => {
        this.setState({errorRegister:[]}, () => {
            let validLayer = this.isValidLayer(showErrors);
            if (showErrors && !validLayer) helpers.showMessage(this.state.errorRegister,"Error",helpers.messageColors.red,2500);
            callback(validLayer);
        });
    } 
    onLayerFileChange = (file) => {
        let selectedFile = file.target.files[0];
        let displayName = this.state.layer_displayName;
        let file_extension = selectedFile.name.split(".").pop(); 
        const selectedFormat = this.getFileFormat(file_extension.toLowerCase());
        if (!this.state.userEdit_displayName) displayName = selectedFile.name.split('.').slice(0, -1).join('.');
        if (selectedFormat === undefined){
            this.setState({layer_file:selectedFile, layer_displayName:displayName, selectedFormat:selectedFormat, },()=>{
                helpers.showMessage("Error","Unsupported file type.",helpers.messageColors.red);
            });
        }else{
            this.setState({layer_file:selectedFile, layer_displayName:displayName, selectedFormat:selectedFormat});
        }
        
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
    onClose() {
        // CALL PARENT WITH CLOSE
        this.props.onClose();
      }
    
    render() {
        return (
        <PanelComponent onClose={this.props.onClose} name={this.props.name} type="tools">
            
            <div className="sc-add-layer-content">
                <div className="sc-title">Source</div>
                <div className="sc-container">
                    <div className="sc-add-layer-row">
                        <Switch id="sc-add-layer-source"
                                        className="sc-add-layer-source" 
                                        onChange={this.onLayerSourceChange} 
                                        checked={!this.state.isFile?false:true} 
                                        height={20} 
                                        width={160} 
                                        uncheckedIcon={<span className="off">URL</span>}
                                        checkedIcon={<span className="on">FILE</span>}
                                        offColor={"#12128F"}
                                        onColor={"#5E1010"}
                                        />
                    </div>
                    <div className="sc-coordinates-divider"></div>      
                    <div className={!this.state.isFile?"":"sc-hidden"}>
                        <div className="sc-title">URL Type</div>
                        <div className="sc-add-layer-row">
                            <Select 
                                id="sc-input-format" 
                                onChange={this.onLayerFormatChange} 
                                options={this.state.selectFormatOptions} 
                                value={this.state.selectFormatOption}
                                className="sc-add-layer-select" />
                        </div>
                        <div className="sc-coordinates-divider"></div> 
                        <div className="sc-title">URL</div>     
                        <div className="sc-add-layer-row">
                            <input 
                                id="sc-add-layer-server" 
                                type="text"
                                placeholder="https://intra.dev.regionalgis.mto.gov.on.ca/geoserver/ows"
                                className="sc-add-layer-input sc-editable" 
                                onChange={evt => {this.setState({ serverUrl: (evt.target.value).split("?")[0] }, () => {if ( this.state.selectLayerOption !== this.defaultLayerOption) this.clearLayers()});}} 
                                onFocus={evt => {helpers.disableKeyboardEvents(true);}}
                                onBlur={evt => {helpers.disableKeyboardEvents(false);}}
                                value={this.state.serverUrl} />
                        </div>
                        <div className="sc-add-layer-row">
                            <button 
                                id="sc-add-layer-discover" 
                                type="button" 
                                name="check" 
                                className="sc-button"
                                disabled={this.state.serverUrl !== ""?false:true}
                                onClick={this.onCheckForLayers}>Check for layers</button>
                        </div>
                        <div className="sc-coordinates-divider"></div> 
                        <div className={this.state.hasLayers?"sc-title":"sc-hidden"} >Available Layers</div> 
                        <div className={!this.state.hasLayers && this.state.serverUrl !== ""  && this.state.discovery_message !== ""?"sc-add-layer-row center":"sc-hidden"}>{this.state.discovery_message}</div>    
                        <div className={this.state.hasLayers?"sc-add-layer-row":"sc-hidden"}>
                            <Select 
                                id="sc-input-layers" 
                                onChange={this.onLayerSelectChange} 
                                options={this.state.selectLayerOptions} 
                                value={this.state.selectLayerOption} 
                                className="sc-add-layer-select"/>
                        </div>    
                    </div>  
                    <div className={this.state.isFile?"sc-title":"sc-hidden"} >Supported file types</div>
                    <div className={this.state.isFile?"sc-add-layer-row file-extensions":"sc-hidden"}>{this.state.file_formats.join(", ")}</div>
                    <div className={this.state.isFile?"sc-add-layer-row":"sc-hidden"}>
                        <input id="sc-add-layer-file" className="sc-add-layer-input file" type="file" name="file" size="60" onChange={this.onLayerFileChange} />
                        
                    </div> 
                    <div className={this.state.showExtent ?"sc-add-layer-row":"sc-hidden"}>
                    <label htmlFor="sc-add-layer-extent" >Extent:</label>
                    <input 
                        id="sc-add-layer-extent" 
                        type="text"
                        placeholder="TopX, TopY, BottomX, BottomY"
                        className="sc-add-layer-input sc-editable" 
                        onChange={evt => {this.setState({ layer_extent: evt.target.value });}} 
                        onFocus={evt => {helpers.disableKeyboardEvents(true);}}
                        onBlur={evt => {helpers.disableKeyboardEvents(false);}}
                        value={this.state.layer_extent} />
                    </div>

                    <div className="sc-add-layer-row sc-hidden">
                        <label htmlFor="sc-input-projection">Projection:</label>
                        <Select 
                            id="sc-input-projection" 
                            onChange={(selection) => {this.setState({selectProjectionOption:selection});}} 
                            options={this.state.selectProjectionOptions} 
                            value={this.state.selectProjectionOption} 
                            className="sc-add-layer-select" />
                    </div> 
                </div>
                
               
                    
                
                <div className="sc-title">Table of Contents</div>
                <div className="sc-container">
                    <div className="sc-add-layer-row">
                        <label htmlFor="sc-input-group">Add to Group:</label>
                        <Select 
                            id="sc-input-group" 
                            onChange={(selection) => {this.setState({selectGroupOption:selection});}} 
                            options={this.state.selectGroupOptions} 
                            value={this.state.selectGroupOption}
                            className="sc-add-layer-select" />

                    </div>
                    
                    <div className="sc-add-layer-row">
                        <label htmlFor="sc-add-layer-display-name">Layer Name:</label>
                            <input 
                                id="sc-add-layer-display-name" 
                                type="text"
                                className="sc-add-layer-input sc-editable" 
                                onChange={evt => {this.setState({ layer_displayName: evt.target.value, userEdit_displayName: true });}} 
                                onFocus={evt => {helpers.disableKeyboardEvents(true);}}
                                onBlur={evt => {helpers.disableKeyboardEvents(false);}}
                                value={this.state.layer_displayName} />
                    </div>
                </div>
                <div className="sc-add-layer-row right">
                    <div>
                        <button type="button" className="sc-button" disabled={this.state.selectedFormat===undefined} onClick={this.onAddLayerClick}>Add layer</button>
                        <button type="button" className="sc-button" onClick={this.onClose}>Cancel</button>
                    </div>
                </div>
            </div>
          </PanelComponent>
        );
    }
}

export default AddLayerForm;