import React, { Component } from 'react';
import ThemeBaseLayers from './ThemeBaseLayers.jsx'
import ThemeLayers from '../themeComponents/ThemeLayers.jsx'
import ThemeData from '../themeComponents/ThemeData.jsx'
import "./ThemeContainer.css";

class ThemeContainer extends Component {
  state = { }
  
  // CALLED FROM LAYERS.  CALL THEME DATA THROUGH A REF TO PASS ON THE CHANGE FOR VISIBLITY
  onLayerVisibilityChange = (layer) => {
    this.data.onLayerVisibilityChange(layer);
  }

  componentDidMount(){
    // DISABLE PARCEL CLICK
    if (this.props.config.disableParcelClick !== undefined && this.props.config.disableParcelClick)
      window.disableParcelClick = true;
  }

  componentWillUnmount(){
    // RE-ENABLE PARCEL CLICK
    window.disableParcelClick = false;
  }

  render() { 
    return ( 
      <div className="sc-theme-container">
        <ThemeBaseLayers config={this.props.config}></ThemeBaseLayers>
        <ThemeLayers config={this.props.config} onLayerVisiblityChange={(layer) => {this.onLayerVisibilityChange(layer)}}></ThemeLayers>
        <ThemeData config={this.props.config} ref={data => {this.data = data}}></ThemeData>
      </div>
     );
  }
}
 
export default ThemeContainer;