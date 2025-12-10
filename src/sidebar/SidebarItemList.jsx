import React, { Component, useRef, useState } from "react";
import * as helpers from "../helpers/helpers";
import "./SidebarItemList.css";
import { useEffect } from "react";
const SidebarItemList = (props) => {
  const [components, setComponents] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [listtype, setListType] = useState(props.listtype);

  const buttonClick = (name) => {
    props.onTabClick(name);
  };
  useEffect(() => {
    return () => {
      setComponents([]);
    };
  }, []);
  useEffect(() => {
    if (props.listtype !== listtype) {
      setListType(props.listtype);
      setIsLoaded(false);
    }
  }, [props.listtype]);

  useEffect(() => {
    helpers.waitForLoad(["settings", "tools", "themes", "security"], Date.now(), 30, () => {
      let listItems = null;
      if (listtype === "tools") {
        let tools = window.config.sidebarToolComponents;
        listItems = tools.filter((item) => item.enabled === undefined || item.enabled);
      } else {
        // IMPORT THEMES FROM CONFIG
        let themes = window.config.sidebarThemeComponents;
        listItems = themes.filter((item) => item.enabled === undefined || item.enabled);
      }
      listItems = listItems.filter((item) => {
        if (item.disable) return false;
        else if (item.secure === undefined || !item.secure) return true;
        else if (item.secure && item.securityKeywords !== undefined) {
          return item.securityKeywords.some((keyword) => window.security.includes(keyword));
        } else return true;
      });
      setComponents(listItems);
      setIsLoaded(true);
    });
  }, [listtype]);
  return (
    <div className="simcoe-sidebarlist-container">
      {
        // CREATE ITEMS FROM CONFIG
        components.map((listItem) => {
          // SKIP IF ITS DISABLED
          if (listItem.disable !== undefined && listItem.disable) return null;
          return (
            <ToolItem
              componentname={listItem.componentName}
              onClick={() => props.onClick(listItem.name, props.listtype)}
              key={helpers.getUID()}
              id={listItem.id}
              name={listItem.name}
              imageName={listItem.imageName}
              description={listItem.description}
              secure={listItem.secure}
              securityKeywords={listItem.securityKeywords}
            />
          );
        })
      }
    </div>
  );
};

export default SidebarItemList;

// ITEM
const ToolItem = (props) => {
  return (
    <div className={"simcoe-sidebarlist-item"} onClick={props.onClick}>
      <img className={props.secure ? "simcoe-tool-secured-icon" : "sc-hidden"} src={images["lock-icon.png"]} alt="secured" />
      <div className="simcoe-sidebarlist-item-iconbackground">
        <div className="simcoe-sidebarlist-item-icon" />
        <img src={images[props.imageName]} alt="Tool Item" />
      </div>
      <div className="simcoe-sidebarlist-item-text-container">
        <div className="simcoe-sidebarlist-item-text-title">{props.name}</div>
        <div className="simcoe-sidebarlist-item-text-description">{props.description}</div>
      </div>
    </div>
  );
};

//IMPORT ALL IMAGES
import { createImagesObject } from "../helpers/imageHelper";
const images = createImagesObject(
  import.meta.glob('./images/*.{png,jpg,jpeg,svg,gif}', { eager: true, query: '?url', import: 'default' })
);
