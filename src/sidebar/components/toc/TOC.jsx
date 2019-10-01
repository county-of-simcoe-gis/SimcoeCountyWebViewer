// REACT
import React, { Component } from "react";
import ReactDOM from "react-dom";
import ReactTooltip from "react-tooltip";
import Select from "react-select";
import Slider, { createSliderWithTooltip } from "rc-slider";
import "rc-slider/assets/index.css";
import Switch from "react-switch";
import { isMobile } from "react-device-detect";

// CUSTOM
import "./TOC.css";
import * as helpers from "../../../helpers/helpers";
import * as TOCHelpers from "./TOCHelpers.jsx";
import Layers from "./Layers.jsx";
import FloatingMenu, { FloatingMenuItem } from "../../../helpers/FloatingMenu.jsx";
import Menu, { SubMenu, Item as MenuItem, Divider } from "rc-menu";
import Portal from "../../../helpers/Portal.jsx";

// SLIDER
const SliderWithTooltip = createSliderWithTooltip(Slider);

class TOC extends Component {
  constructor(props) {
    super(props);
    this.state = {
      layerGroups: [],
      selectedGroup: {},
      layerList: [],
      isLoading: false,
      searchText: "",
      sortAlpha: this.getInitialSort(),
      defaultGroup: undefined
    };
  }

  getInitialSort = () => {
    if (isMobile) return true;
    else return false;
  };

  componentDidMount() {
    this.refreshTOC();
  }

  refreshTOC = callback => {
    const groupInfo = TOCHelpers.getGroups();
    this.setState(
      {
        layerGroups: groupInfo[0],
        selectedGroup: groupInfo[1],
        defaultGroup: groupInfo[1]
      },
      () => {
        if (callback !== undefined) callback();
      }
    );
  };

  onGroupDropDownChange = selectedGroup => {
    this.setState({ selectedGroup: selectedGroup });
  };

  onSearchLayersChange = evt => {
    const searchText = evt.target.value;
    this.setState({ searchText: searchText });
  };

  onSortSwitchChange = sortAlpha => {
    this.setState({ sortAlpha: sortAlpha });

    if (sortAlpha) {
      helpers.showMessage("Sorting", "Layer re-ordering disabled.", "yellow");
    }

    helpers.addAppStat("TOC Sort", sortAlpha);
  };

  reset = () => {
    const defaultGroup = this.state.defaultGroup;
    this.setState({ sortAlpha: false, selectedGroup: defaultGroup }, () => {
      this.refreshTOC(() => {
        setTimeout(() => {
          this.layerRef.resetLayers();
        }, 100);
      });
    });

    helpers.addAppStat("TOC Reset", "Button");
  };

  onToolsClick = evt => {
    var evtClone = Object.assign({}, evt);
    const menu = (
      <Portal>
        <FloatingMenu key={helpers.getUID()} buttonEvent={evtClone} item={this.props.info} onMenuItemClick={action => this.onMenuItemClick(action)} styleMode="right" yOffset={90}>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-expand">
            <FloatingMenuItem imageName={"plus16.png"} label="Expand Layers" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-collapse">
            <FloatingMenuItem imageName={"minus16.png"} label="Collapse Layers" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-visility">
            <FloatingMenuItem imageName={"layers-off.png"} label="Turn off Layers" />
          </MenuItem>
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-legend">
            <FloatingMenuItem imageName={"legend16.png"} label="Show Legend" />
          </MenuItem>
        </FloatingMenu>
      </Portal>
    );

    ReactDOM.render(menu, document.getElementById("portal-root"));
  };

  onMenuItemClick = action => {
    if (action === "sc-floating-menu-expand") {
      this.layerRef.toggleAllLegends("OPEN");
    } else if (action === "sc-floating-menu-collapse") {
      this.layerRef.toggleAllLegends("CLOSE");
    } else if (action === "sc-floating-menu-legend") {
      helpers.showMessage("Legend", "Coming Soon");
    } else if (action === "sc-floating-menu-visility") {
      this.layerRef.turnOffLayers();
    }

    helpers.addAppStat("TOC Tools", action);
  };

  onSaveClick = () => {
    this.layerRef.saveLayerOptions();
  };

  render() {
    const groupsDropDownStyles = {
      control: provided => ({
        ...provided,
        minHeight: "30px"
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
      <div>
        <div className={this.state.isLoading ? "sc-toc-main-container-loading" : "sc-toc-main-container-loading sc-hidden"}>
          <img className="sc-toc-loading" src={images["loading.gif"]} alt="loading" />
        </div>
        <div className={this.state.isLoading ? "sc-toc-main-container sc-hidden" : "sc-toc-main-container"}>
          <div className="sc-toc-search-container">
            <input id="sc-toc-search-textbox" className="sc-toc-search-textbox" placeholder="Filter Layers..." onChange={this.onSearchLayersChange} />
            <div data-tip="Save Layer Visibility" data-for="sc-toc-save-tooltip" className="sc-toc-search-save-image" onClick={this.onSaveClick}>
              <ReactTooltip id="sc-toc-save-tooltip" className="sc-toc-save-tooltip" multiline={false} place="right" type="dark" effect="solid" />
            </div>
          </div>
          <div className="sc-toc-groups-container">
            <div id="sc-toc-groups-dropdown" title="Click here for more layers">
              <Select styles={groupsDropDownStyles} isSearchable={false} onChange={this.onGroupDropDownChange} options={this.state.layerGroups} value={this.state.selectedGroup} placeholder="Click Here for more Layers..." />
            </div>
          </div>
          <div>
            <Layers ref={ref => (this.layerRef = ref)} group={this.state.selectedGroup} searchText={this.state.searchText} sortAlpha={this.state.sortAlpha} />
          </div>

          <div className="sc-toc-footer-container">
            <label className={this.state.sortAlpha ? "sc-toc-sort-switch-label on" : "sc-toc-sort-switch-label"}>
              Sort A-Z
              <Switch className="sc-toc-sort-switch" onChange={this.onSortSwitchChange} checked={this.state.sortAlpha} height={20} width={48} />
            </label>
            &nbsp;
            <button className="sc-button sc-toc-footer-button" onClick={this.reset}>
              Reset
            </button>
            &nbsp;
            <button className="sc-button sc-toc-footer-button tools" onClick={this.onToolsClick}>
              Additional Tools
            </button>
            {/* <button id="sc-toc-button-expand" className="sc-button sc-toc-footer-button" onClick={this.onLayersExpand}>Expand</button>&nbsp;
              <button id="sc-toc-button-collapse" className="sc-button sc-toc-footer-button" onClick={this.onLayersExpand}>Collapse</button>&nbsp;
              <button className="sc-button sc-toc-footer-button" onClick={this.refreshTOC}>Reset</button>&nbsp;
              <button className="sc-button sc-toc-footer-button">Legend</button>&nbsp; */}
          </div>
        </div>
      </div>
    );
  }
}

export default TOC;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
