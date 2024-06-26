import React, { useEffect, useState } from "react";
import "./LoadingScreen.css";
import * as helpers from "./helpers";
const LoadingScreen = (props) => {
  const [isVisible, setIsVisible] = useState(false);
  const [containerStyle, setContainerStyle] = useState({
    background: "rgba(0,0,0,0.35)",
  });
  const [spinnerStyle, setSpinnerStyle] = useState({
    height: "120px",
    width: "120px",
    border: "16px solid #f3f3f3",
    borderTop: "16px solid #3498db",
  });
  const [messageStyle, setMessageStyle] = useState({
    fontSize: "26px",
    color: "#3498db",
  });

  useEffect(() => {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      setIsVisible(props.visible);
      getStyles((styles) => {
        setSpinnerStyle(styles.spinnerStyle);
        setMessageStyle(styles.messageStyle);
        setContainerStyle(styles.containerStyle);
      });
    });
  }, [props.visible]);

  const hexToRgba = (hex, alpha) => {
    //CONVERT hex to rgb
    const hexRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
    const rgbaString = (r, g, b, a) => `rgba(${r},${g},${b},${a})`;
    var result = hexRegex.exec(hex);
    if (result) {
      const red = parseInt(result[1], 16);
      const green = parseInt(result[2], 16);
      const blue = parseInt(result[3], 16);
      return rgbaString(red, green, blue, alpha);
    } else {
      return "rgba(0,0,0,0.35)";
    }
  };
  const getStyles = (callback) => {
    if (!isVisible)
      callback({
        containerStyle: { display: "none" },
        spinnerStyle: { display: "none" },
        messageStyle: { display: "none" },
      });
    let spinnerSize = 120;
    let spinnerBackColor = "#f3f3f3";
    let spinnerForeColor = "#3498db";
    let fontSize = "26px";
    let messageColor = "#3498db";
    let backgroundColor = "#ffffff";
    let backgroundOpacity = 0.35;

    if (props.spinnerSize !== undefined) spinnerSize = props.spinnerSize;
    if (props.spinnerBackColor !== undefined) spinnerBackColor = props.spinnerBackColor;
    if (props.spinnerForeColor !== undefined) spinnerForeColor = props.spinnerForeColor;
    if (props.fontSize !== undefined) fontSize = props.fontSize;
    if (props.messageColor !== undefined) messageColor = props.messageColor;
    if (props.backgroundColor !== undefined) backgroundColor = props.backgroundColor;
    if (props.backgroundOpacity !== undefined) backgroundOpacity = props.backgroundOpacity;

    let containerBackground = hexToRgba(backgroundColor, backgroundOpacity);
    const styles = {
      containerStyle: {
        background: containerBackground,
      },
      spinnerStyle: {
        height: spinnerSize + "px",
        width: spinnerSize + "px",
        marginTop: "-" + spinnerSize / 3 + "px",
        marginRight: "-" + spinnerSize / 2 + "px",
        border: "16px solid",
        borderColor: `${spinnerForeColor} ${spinnerBackColor} ${spinnerBackColor} ${spinnerBackColor}`,
      },
      messageStyle: {
        fontSize: fontSize,
        color: messageColor,
        marginTop: spinnerSize + 26 + "px",
      },
    };

    if (isVisible) callback(styles);
  };

  if (!window.config.showLoadingScreens) return <div />;

  return (
    <div className={props.visible ? "sc-loading-screen" : "sc-hidden"} style={containerStyle}>
      <div className="spinner" style={spinnerStyle} />
      <div className="message" style={messageStyle}>
        {props.message}
      </div>
    </div>
  );
};

export default LoadingScreen;
