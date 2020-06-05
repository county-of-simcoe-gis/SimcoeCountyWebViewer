import React, { Component } from 'react';
import "./ShowMessage.css";
class ShowMessage extends Component {
    constructor(props){
        super(props)

        this.myRef = React.createRef();

        this.state = {  
            hide: false,
            color: this.props.color ? this.props.color : "green",
        }
    }
    

    onCloseClick = (value => {
        this.setState({hide: true});
    });

    getClassName = () => {
      if (this.state.hide)
        return "sc-hidden"
      else if (window.sidebarOpen)
        return "sc-show-message-container " + this.state.color;
      else
        return "sc-show-message-container closed " + this.state.color;
    }

    render() { 
        
      const style = this.getClassName();
        return ( 
        <div ref={this.myRef} id="sc-show-message-container" className={style}>
            <div className="sc-show-message-title">{this.props.title}</div>
            <div className="sc-show-message-content">{this.props.message}</div>
            <button className={this.props.hideButton? "sc-hidden":"sc-button sc-show-message-close-button"} onClick={this.onCloseClick}>Close Message</button>
        </div> );
    }
}
 
export default ShowMessage;