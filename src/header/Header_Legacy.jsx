// import React, { Component } from 'react';
// import './Header.css';
// import Search from './Search.jsx';
// import * as helpers from '../helpers/helpers';

// class Header extends Component {
//     state = { 

//      }

//     basicButtonHandler(){
//         // EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
//         window.emitter.emit('setSidebarVisiblity', "CLOSE");
//         console.log("CLOSE");
//     }

//     advancedButtonHandler(){
//         // EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
//         window.emitter.emit('setSidebarVisiblity', "OPEN");
//     }

//     helpButtonHandler(){
//       helpers.showURLWindow("https://maps.simcoe.ca/public_help", false, "full");
//     }

//     onDotMenuClick = (evt) => {
//       helpers.showMessage("Coming Soon", "Coming Soon...")
//     }

//     render() { 
//         return (
//         <div className="header">
//             <table>
//                 <tbody>
//                     <tr>
//                         <td id="sc-header-left">
//                             <div id="sc-header-bar-button"><img src={require("./images/bar-button.png")} alt="Header Logo" /></div>
//                             <div id="sc-header-bar-logo"><img src={require("./images/logo.png")} alt="Header Logo" /></div>
//                         </td>
//                         <td id="sc-header-center">
//                             <Search></Search>
//                         </td>
//                         <td id="sc-header-right">
//                             <div>
//                                 <button id="sc-header-basic-button" className="sc-header-right-buttons" onClick={this.basicButtonHandler}>Basic</button>
//                                 <button id="sc-header-advanced-button" className="sc-header-right-buttons"onClick={this.advancedButtonHandler}>Advanced</button>
//                                 {/* <button id="sc-header-help-button" className="sc-header-right-buttons" onClick={this.helpButtonHandler}>Help</button> */}
//                                 <div className="sc-header-dot-menu-container" onClick={this.onDotMenuClick}><img src={images['dotdotdot-vertical.png']} alt="dots"></img></div>
//                             </div> 
//                         </td>
//                     </tr>
//                 </tbody>
//             </table>
//         </div>
//         )};
// }
//  //
// export default Header;

// // IMPORT ALL IMAGES
// const images = importAllImages(require.context('./images', false, /\.(png|jpe?g|svg|gif)$/));
// function importAllImages(r) {
//     let images = {};
//     r.keys().map((item, index) => images[item.replace('./', '')] = r(item));
//     return images;
//   }