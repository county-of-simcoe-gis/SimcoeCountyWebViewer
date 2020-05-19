import React, { Component } from "react";
import ReactDOM from "react-dom";
import * as helpers from "../../../helpers/helpers";
import FloatingMenu, { FloatingMenuItem } from "../../../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../../../helpers/Portal.jsx";
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
      activeLayerCount: 0
    };
    this._isMounted = false;
    window.emitter.addListener("activeTocLayerGroup", (groupName, callback) => {if (groupName === this.props.group.value) this.onActivateLayer(callback)});
    window.emitter.addListener("updateActiveTocLayers",(groupName) => {if (groupName === this.props.group.value || groupName === null) this.setActiveLayerCount()});
  }

  setActiveLayerCount = () => {
    let activeCount = (this.props.group.layers.filter(layer => layer.layer.getVisible())).length;
    this.setState({activeLayerCount: activeCount});
  };
  
  onActivateLayer = (callback) => {
    let panelOpen = this.state.panelOpen;
    this.setActiveLayerCount();
    if (!panelOpen) {
      panelOpen= !panelOpen;
      this.setState({ panelOpen: panelOpen, userPanelOpen:panelOpen },() => {
          callback();} );
    }
  };

  onMenuItemClick = (action, group) => {
    if (action === "sc-floating-menu-disable-layers") {
      window.emitter.emit("turnOffLayers", group);
    } else if (action === "sc-floating-menu-enable-layers") {
      window.emitter.emit("turnOnLayers", group);
    } 
    helpers.addAppStat("Group Options", action);
  };
 // ELLIPSIS/OPTIONS BUTTON
 onGroupOptionsClick = (evt, group) => {
  var evtClone = Object.assign({}, evt);
  const menu = (
      <Portal>
        <FloatingMenu
          key={helpers.getUID()}
          buttonEvent={evtClone}
          autoY={true}
          onMenuItemClick={action => this.onMenuItemClick(action, group)}
          styleMode={helpers.isMobile() ? "left" : "right"}
        >
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-enable-layers">
            <FloatingMenuItem label="Turn On All Layers" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-disable-layers">
            <FloatingMenuItem label="Turn Off All Layers" />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
  };
  componentDidMount() {
    this._isMounted = true;
    this.setState({ panelOpen: this.props.panelOpen, userPanelOpen:this.props.panelOpen},
      () =>{
        this.setActiveLayerCount();
      });
    if (this._isMounted) this.forceUpdate();
  }
  componentWillUnmount() {
    this._isMounted = false;
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
      if (this.props.searchText === "") return true;
      return layer.displayName.toUpperCase().indexOf(this.props.searchText.toUpperCase()) !== -1; 
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
            <div  className={(this.state.panelOpen ? "sc-toc-group-list-header open" : "sc-toc-group-list-header") + (this.state.activeLayerCount>0 ? " active" : "")} onClick={this.onHeaderClick}>
              <div className={"sc-toc-group-list-header-label"}>&nbsp;&nbsp;{this.props.group.label} <span>- ({this.state.activeLayerCount}/{this.props.group.layers.length})</span>
              </div>
              
            </div>
            <div className="sc-toc-group-toolbox" title="Group Options" onClick={evt => this.onGroupOptionsClick(evt, this.props.group.value)}>
                <img src={images["group-more-options.png"]} alt="More Group Options" />
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
                    onLayerChange={() => this.setActiveLayerCount()}
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


// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}