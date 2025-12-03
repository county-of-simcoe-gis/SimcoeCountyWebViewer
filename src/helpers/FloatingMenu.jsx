import React, { useState, useEffect, useRef } from "react";

import Menu from "rc-menu";
import "rc-menu/assets/index.css";
import "./FloatingMenu.css";
import { waitForLoad } from "./helpers";

// PROPER USE OF THIS COMPONENT IS TO USE A PORTAL.  HAVE A LOOK AT MyMapsItem FOR AN EXAMPLE.
const FloatingMenu = (props) => {
  const positionXRef = useRef(props.positionX || props.buttonEvent.pageX);
  const positionYRef = useRef(props.positionY || props.buttonEvent.pageY);
  const isMounted = useRef(false);
  const [isVisible, setIsVisible] = useState(true);
  const [style, setStyle] = useState({
    position: "absolute",
    zIndex: 0,
    top: positionYRef.current,
    left: positionXRef.current,
    backgroundColor: "white",
    width: "180px",
  });
  const container = useRef(null);
  useEffect(() => {
    if (props.positionX !== undefined) positionXRef.current = props.positionX;
    if (props.positionY !== undefined) positionYRef.current = props.positionY;
    if (props.buttonEvent.pageX !== undefined) positionXRef.current = props.buttonEvent.pageX;
    if (props.buttonEvent.pageY !== undefined) positionYRef.current = props.buttonEvent.pageY;
    if (props.isVisible !== undefined) setIsVisible(props.isVisible);
  }, [props.positionX, props.positionY, props.buttonEvent.pageX, props.buttonEvent.pageY, props.isVisible]);

  useEffect(() => {
    isMounted.current = true;
    waitForLoad("settings", Date.now(), 30, () => {
      document.body.addEventListener("click", handleClickAway, true);
    });
    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, []);
  useEffect(() => {
    if (isMounted.current === false) return;
    getStyle((newStyle) => {
      setStyle(newStyle);
    });
  }, [props.autoX, props.autoY, props.buttonEvent.pageX, props.buttonEvent.pageY, props.styleMode, props.positionX, props.positionY, props.yOffset, props.xOffset, props.width]);
  const cleanup = () => {
    document.body.removeEventListener("click", handleClickAway, true);
    container.current = null;
  };
  const handleClickAway = (evt) => {
    if (!isVisible || !isMounted.current) {
      return;
    }
    if (typeof evt.target.className === "string") {
      // IGNORE CLASSNAMES
      let found = false;
      if (props.classNamesToIgnore !== undefined) {
        evt.target.className.split(" ").forEach((className) => {
          if (props.classNamesToIgnore.includes(className)) {
            found = true;
            return;
          }
        });
      }

      if (evt.target.className.indexOf("rc-menu") > -1 || evt.target.className.indexOf("sc-floating-menu-") > -1 || found) return;
    }
    if (container.current !== null && !container.current.contains(evt.target)) {
      setIsVisible(false);
      cleanup();
    }
  };
  const isElementInViewport = (el) => {
    var rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) /*or $(window).height() */ &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    );
  };

  const getStyle = (callback) => {
    if (!isVisible || !isMounted.current) {
      callback({ display: "none" });
      return;
    }
    let yOffset = 0;
    let xOffset = 0;
    let styleLocal = null;
    window.requestAnimationFrame(() => {
      if (props.autoY) {
        if (container.current !== undefined && container.current !== null) {
          const isInViewport = isElementInViewport(container.current);
          if (!isInViewport) {
            yOffset = container.current.offsetHeight;
          }
        }
      }

      if (props.styleMode === "right") {
        xOffset = positionXRef.current;
      } else if (props.styleMode === "left") {
        xOffset = positionXRef.current - 180;
      } else if (props.autoX) {
        if (positionXRef.current < 180) {
          xOffset = positionXRef.current;
        } else {
          xOffset = positionXRef.current - 180;
        }
      } else {
        xOffset = positionXRef.current;
      }

      if (props.yOffset !== undefined) yOffset = props.yOffset;
      if (props.xOffset !== undefined) xOffset = props.xOffset;
      let width = props.width !== undefined ? props.width : "180px";
      styleLocal = {
        position: "absolute",
        zIndex: 1000,
        top: positionYRef.current - yOffset,
        //left: this.state.styleMode === "right" ? this.props.buttonEvent.pageX : this.props.buttonEvent.pageX - 180,
        left: xOffset,
        backgroundColor: "white",
        width: width,
      };

      if (callback) callback(styleLocal);
      else return styleLocal;
    });
  };

  const handleSelect = () => {
    setIsVisible(false);
  };

  const handleClick = (info) => {
    props.onMenuItemClick(info.key);
    setIsVisible(false);
  };

  return (
    <div className="sc-floating-menu-toolbox-menu-container" style={isVisible ? style : { display: "none" }} ref={container}>
      <div className={window.config.showFloatingMenuHeader ? "sc-floating-menu-toolbox-menu-header" : "sc-hidden"} title={props.title}>
        <div className="title">{props.title}</div>
        <div className="close" onClick={handleSelect} alt="Close Menu">
          &nbsp;
        </div>
      </div>
      <Menu onSelect={handleSelect} defaultActiveFirst onClick={handleClick} className="sc-floating-menu-toolbox-menu">
        {props.children}
      </Menu>
    </div>
  );
};

export default FloatingMenu;

// IMPORT ALL IMAGES
import { createImagesObject } from "./imageHelper";
const images = createImagesObject(import.meta.glob("./images/*.{png,jpg,jpeg,svg,gif}", { eager: true, query: "?url", import: "default" }));

export function FloatingMenuItem(props) {
  return (
    <div className="sc-floating-menu-toolbox-menu-icon-label-container">
      <img className="sc-floating-menu-toolbox-menu-icon" src={images[props.imageName]} alt={props.imageName} />
      <label className="sc-floating-menu-toolbox-menu-label">{props.label}</label>
    </div>
  );
}
