import React, { Component } from 'react';
import "./ThemeData.css";
import * as helpers from '../../../../helpers/helpers';
import ThemeDataList from './ThemeDataList.jsx'

class ThemeData extends Component {
  constructor(props){
    super(props);

    this.state = { 
      onlyFeaturesWithinMap: false,
    }
    this.layerRefs = [];

  }
  
  // THIS FUNCTION IS CALLED FROM PARENT THROUGH A REF
  onLayerVisibilityChange = (layer) => {

    // LET ALL THE THEMEDATALIST COMPONENTS KNOW A LAYER HAS CHANGED VISIBLITY
    this.layerRefs.forEach(dataList => {
      if (dataList !== null)
        dataList.onLayerVisibilityChange(layer);  
    });

  }

  onCheckboxChange = (evt) => {
    this.setState({onlyFeaturesWithinMap: evt.target.checked})
  }

  render() { 
    return (
      <div className="sc-theme-data-container">
        <div className="sc-title sc-underline">THEME DATA</div>
        <div className="sc-theme-data-filter-label">
          <label>
            <input type="checkbox" checked={this.state.visible} style={{ verticalAlign: "middle" }} onChange={this.onCheckboxChange} />
            Only show data visible in the map
          </label>
        </div>
        <div>
          {this.props.config.toggleLayers.map(layerConfig => (
            <ThemeDataList
              key={helpers.getUID()}
              config={this.props.config}
              layerConfig={layerConfig}
              ref={data => {
                this.layerRefs.push(data);
              }}
              onlyFeaturesWithinMap={this.state.onlyFeaturesWithinMap}
            />
          ))}
        </div>
      </div>
    );
  }
}
 
export default ThemeData;
