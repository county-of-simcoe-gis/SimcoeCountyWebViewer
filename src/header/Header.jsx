import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './Header.css';
import Search from './Search.jsx';
import * as helpers from '../helpers/helpers';
import FloatingMenu, {FloatingMenuItem} from '../helpers/FloatingMenu.jsx';
import Menu, { SubMenu, Item as MenuItem, Divider } from 'rc-menu';
import Portal from '../helpers/Portal.jsx';

class Header extends Component {
    state = { 

     }

    burgerButtonHandler(){
        // EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
        if (window.sidebarOpen)
          window.emitter.emit('setSidebarVisiblity', "CLOSE");
        else
          window.emitter.emit('setSidebarVisiblity', "OPEN");

          helpers.addAppStat("Burger Button", "Click");
    }

    helpButtonHandler(){
      helpers.showURLWindow("https://maps.simcoe.ca/public_help", false, "full");
    }

    onDotMenuClick = (evt) => {
      var evtClone = Object.assign({}, evt);
      const menu = 
      <Portal>
        <FloatingMenu key={helpers.getUID()} buttonEvent={evtClone} item={this.props.info} onMenuItemClick={this.onMenuItemClick} styleMode="left">
          <MenuItem className="sc-floating-menu-toolbox-menu-item" key="sc-floating-menu-login"><FloatingMenuItem imageName={'lock.png'} label="Login (Sample)"></FloatingMenuItem></MenuItem>
        </FloatingMenu>
      </Portal>;
      ReactDOM.render(menu, document.getElementById("portal-root"));

      helpers.addAppStat("Header Dot Menu", "Click");
    }

    onMenuItemClick = (value) => {
      helpers.showMessage("Coming Soon", "Coming Soon...")
      helpers.addAppStat("Header Dot Menu", value);
    }

    render() { 
        return (
        <div className="header">
          <div id="sc-header-burger-button" onClick={this.burgerButtonHandler}><img src={require("./images/burger-button.png")} alt="Header Logo" /></div>
          <div id="sc-header-bar-button"><img src={require("./images/bar-button.png")} alt="Header Logo" /></div>
          <div id="sc-header-bar-logo"><img src={require("./images/logo.png")} alt="Header Logo" /></div>
          <div id="sc-header-search-container">
            <Search></Search>
          </div>
          {/* <div className="sc-header-dot-menu-container" onClick={this.onDotMenuClick}><img className="sc-header-dot-menu-img" src={images['vertical-dot-menu.png']} alt="dots"></img></div> */}
        </div>
        )};
}
 //
export default Header;

// IMPORT ALL IMAGES
const images = importAllImages(require.context('./images', false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
    let images = {};
    r.keys().map((item, index) => images[item.replace('./', '')] = r(item));
    return images;
  }