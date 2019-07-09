import React, { Component } from 'react';
import "./UrlWindow.css";

class URLWindow extends Component {
    constructor(props){
        super(props)

        this.state = {  
            hide: false
        }
    }
    

    onCloseClick = (value => {
        this.setState({hide: true});
    });
    
    componentDidMount(){
      document.addEventListener("keydown", this.escFunction, false);
    }

    escFunction = event => {
      if(event.keyCode === 27) {
        this.setState({hide: true});
      }
    }
    
    render() { 
        //className={this.state.hide ? "sc-hidden" :"sc-url-window-map-container"}
        return ( 
        <div id="sc-url-window-container" className={this.state.hide ? "sc-hidden" : this.props.mode === "full" ? "full" : "" }>
          <div className="sc-url-window-header">
            <div className="sc-url-window-header-title">Information</div>
            <div className="sc-url-window-header-close-button">
              <button className="sc-button sc-button-blue sc-url-window-header-close-x" onClick={this.onCloseClick}>X</button>
            </div>
          </div>
          <div id="sc-url-window-content" className={this.props.showFooter ? "sc-url-window-content with-footer" : "sc-url-window-content"}>
            <iframe className="sc-url-window-iframe" src={this.props.url} frameBorder="0" title="Information"></iframe>
          </div>
          <div className={this.props.showFooter ? "sc-url-window-footer" : "sc-hidden"}>
            <button className="sc-button" onClick={this.onCloseClick}>Close Window</button>
            <button id="sc-url-window-dont-show-this-again" className="sc-button">Don't Show this Again</button>
          </div>
        </div> );
    }
}
 
export default URLWindow;