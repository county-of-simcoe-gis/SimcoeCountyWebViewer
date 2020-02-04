import React, { Component } from "react";
import * as helpers from "../../../helpers/helpers";
import Layers from "./Layers.jsx";
import "./GroupItem.css";
class GroupItem extends Component {
  constructor(props) {
    super(props);

    this.state = {
      panelOpen: true,
      visible: true
    };
    window.emitter.addListener("activeTocLayerGroup", (groupName, callback) => {if (groupName === this.props.group.value) this.onActivateLayer(callback)});
  }


  onActivateLayer = (callback) => {
    let panelOpen = this.state.panelOpen;
    if (!panelOpen) {
      panelOpen= !panelOpen;
      this.setState({ panelOpen: panelOpen },() => callback());
    }
  };

  componentDidMount() {
   
    this.setState({ panelOpen: this.props.panelOpen });

  }

  componentWillReceiveProps(nextProps) {
   
  }
 
  
  saveLayerOptions =() => {
    this.layerRef.saveLayerOptions();
  }


  onHeaderClick = () => {
    let panelOpen = this.state.panelOpen;
    panelOpen= !panelOpen;
    this.setState({ panelOpen: panelOpen });
  };
  render() {
    
    if (this.props.group !== undefined){
      return (
        <div  className={"sc-toc-group-list-container"} key={"sc-toc-group-list-container" + this.props.group.value}>
          <div  className={this.state.panelOpen ? "sc-toc-group-list-header open" : "sc-toc-group-list-header"} onClick={this.onHeaderClick}>
            <div className={"sc-toc-group-list-header-label"}>{this.props.group.label + " (" +this.props.group.layers.length + " layers)" }</div>
          </div>
          <div className={this.state.panelOpen ? "sc-toc-group-list-item-container" : "sc-hidden"}>
          
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


