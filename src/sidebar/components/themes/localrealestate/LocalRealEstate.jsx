import React, { Component } from 'react';
import "./LocalRealEstate.css";
import PanelComponent from '../../../PanelComponent';

class LocalRealEstate extends Component {
    state = {  }

    // componentDidMount(){
    //   // LISTEN FOR CLOSE FROM OTHER COMPONENTS (e.g. MENU BUTTON)
    //   window.emitter.addListener('closeThemes', (type) => {
    //     console.log("Closing Real Estate")
    //       this.onClose()
    //   });
    // }

    onClose(){
      // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

      // CALL PARENT WITH CLOSE
      this.props.onClose();
    }

    render() { 
        return ( 
            <PanelComponent onClose={this.props.onClose} name={this.props.name} type="themes">
                <div>Real Estate Theme (Coming Soon)</div>
            </PanelComponent>
        );
    }
}
 
export default LocalRealEstate;