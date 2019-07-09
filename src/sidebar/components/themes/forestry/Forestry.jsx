import React, { Component } from 'react';
import "./Forestry.css";
import PanelComponent from '../../../PanelComponent';
import * as config from './config.json'
import ThemeContainer from '../themeComponents/ThemeContainer.jsx'

class Forestry extends Component {
    state = {  }

    onClose(){
      // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

      // CALL PARENT WITH CLOSE
      this.props.onClose();
    }
    
    render() { 
      return (
        <PanelComponent onClose={this.props.onClose}  name={this.props.name} type="themes">  
            <ThemeContainer config={config.default}></ThemeContainer>
          </PanelComponent>
      );
    }
}
 
export default Forestry;