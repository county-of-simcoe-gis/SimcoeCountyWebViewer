import React, { Component } from 'react';
import * as helpers from '../helpers/helpers';
import "./SidebarItemList.css";
import ComponentsConfig from '../config.json';

class SidebarItemList extends Component {
        
  constructor(props){
    super(props);

    // BIND THIS TO THE CLICK FUNCTION
    this.buttonClick = this.buttonClick.bind(this);

    this.state = {
        components: []
    }
  }

  buttonClick(name){
    //PARENT HANDLES THE REST
    this.props.onTabClick(name);
  }

  render() { 

    // GET LIST OF COMPONENTS FROM CONFIG
    let listItems = null;
    if (this.props.listtype === "tools"){
        listItems = ComponentsConfig.sidebarToolComponents;
    }
    else{
        listItems = ComponentsConfig.sidebarThemeComponents;
    }

    if (listItems === undefined)
                return <div></div>
                
    return ( 
      <React.Fragment>{
          // CREATE ITEMS FROM CONFIG
          listItems.map(listItem => 

              (
              <ToolItem componentname={listItem.componentName} 
              onClick={()=>this.props.onClick(listItem.name, this.props.listtype)} 
              key={helpers.getUID()} 
              id={listItem.id} 
              name={listItem.name} 
              imageName={listItem.imageName} 
              description={listItem.description} />
              )
          )}
              
      </React.Fragment>   
    )
  }
}
 
export default SidebarItemList;

// ITEM
class ToolItem extends Component {
    state = {  }
    
    render() { 
        return ( 
            
        <div className="simcoe-sidebarlist-item" onClick={this.props.onClick}>
            <div className="simcoe-sidebarlist-item-iconbackground">
                <div className="simcoe-sidebarlist-item-icon"></div>
                <img src={images[this.props.imageName]} alt="Tool Item"/>
                
                {/* THIS WORKS IN DEV BUT PRODUCTION (NPM RUN BUILD) WEBPACK DOES NOT LIKE IT!!!!  
                //IMAGE ICONS FOR THE TOOLS LIST ARE NOW STORED IN SIDEBAR IMAGES FOLDER */}
                    {/* <img src={require(`${this.props.imageURL}`)} ></img> */}
                </div>
            <div className="simcoe-sidebarlist-item-text-container">
                <div className="simcoe-sidebarlist-item-text-title">{this.props.name}</div>
                <div className="simcoe-sidebarlist-item-text-description">{this.props.description}</div>
            </div>
        </div> 
    );
    }
}

//IMPORT ALL IMAGES
const images = importAllImages(require.context('./images', false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
    let images = {};
    r.keys().map((item, index) => images[item.replace('./', '')] = r(item));
    return images;
  }