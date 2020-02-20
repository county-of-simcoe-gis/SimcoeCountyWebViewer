import React, { Component } from "react";
import { AutoSizer } from "react-virtualized";
import * as helpers from "../../../helpers/helpers";
import Layers from "./Layers.jsx";
import "./GroupItem.css";
class GroupItem extends Component {
  constructor(props) {
    super(props);

    this.state = {
      panelOpen: true,
      visible: true,
      newProps : false,
      userPanelOpen: false,
      activeLayerCount : 0
    };
    window.emitter.addListener("activeTocLayerGroup", (groupName, callback) => {if (groupName === this.props.group.value) this.onActivateLayer(callback)});
    window.emitter.addListener("updateActiveTocLayers", () => { this.setActiveLayerCount()});

  }

  setActiveLayerCount = () => {
    let activeLayerCount = this.props.group.layers.filter(layer => {
      if (layer.layer.getVisible()){
        return layer;
      } 
    }).length;

    this.setState({activeLayerCount: activeLayerCount})
  }

  onActivateLayer = (callback) => {
    let panelOpen = this.state.panelOpen;
    this.setActiveLayerCount();
    if (!panelOpen) {
      panelOpen= !panelOpen;
      this.setState({ panelOpen: panelOpen, userPanelOpen:panelOpen },() => {
          callback();} );
    }
  };

  componentDidMount() {
    this.setState({ panelOpen: this.props.panelOpen, userPanelOpen:this.props.panelOpen},
      () =>{
        this.setActiveLayerCount();
      });
    
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ newProps: true },() => {
        this.setOpenState(nextProps.panelOpen);
        this.setActiveLayerCount();
      }
    );
  }
  
  saveLayerOptions =() => {
    this.layerRef.saveLayerOptions();
  }

  containsLayers = () =>{
    return this.props.group.layers.filter(layer => {
      if (this.props.searchText === "") return layer;
  
      if (layer.displayName.toUpperCase().indexOf(this.props.searchText.toUpperCase()) !== -1){
        
        return layer;
      } 
    });
    
  }
  isVisible = () => {
    if (this.containsLayers().length > 0){
      return true;
    }
    else{
      return false;
    }
  }

  setOpenState = (state) => {
    if (!this.state.newProps){
      this.setState({ panelOpen: state });
    } else {
      if (this.isVisible() && this.props.searchText !== "" ){
        this.setState({ panelOpen: true });
      }
      else{
        this.setState({ panelOpen: this.state.userPanelOpen });
      }
    }
  }
  
  onHeaderClick = () => {
    let panelOpen = this.state.panelOpen;
    let userPanelOpen = this.state.userPanelOpen
    panelOpen= !panelOpen;
    userPanelOpen = !userPanelOpen
    if (this.props.searchText !== ""){
      this.setState({ panelOpen: panelOpen, newProps: false });
    }else{
      this.setState({ panelOpen: panelOpen, userPanelOpen:userPanelOpen, newProps: false });
    }
    
  };
  render() {
    
    if (this.props.group !== undefined && this.isVisible()){
     return(
      
            <div  className={"sc-toc-group-list-container"} key={"sc-toc-group-list-container" + this.props.group.value} >
            <div  className={this.state.panelOpen ? "sc-toc-group-list-header open" : "sc-toc-group-list-header"} onClick={this.onHeaderClick}>
              <div className={"sc-toc-group-list-header-label"}>&nbsp;&nbsp;{this.props.group.label}<div className={"sc-toc-groups-active-layers"}><span className={"sc-toc-groups-active-layers-badge"}>{this.state.activeLayerCount}</span></div></div>
            </div>
           
                
                <div className={this.state.panelOpen ? "sc-toc-group-list-item-container" : "sc-hidden"} key={helpers.getUID()}>
                
                <Layers
                    ref={ref => {
                      this.layerRef = ref;
                      }}
                    key={"layer-list" + this.props.group.value }
                    group={this.props.group}
                    searchText={this.props.searchText}
                    sortAlpha={this.props.sortAlpha}
                    
                  />
            
                </div>
              
            </div>
         
     );
    }else{
      return (<div></div>);
    }
  }
}

export default GroupItem;


