import React from "react";
import mainConfig from "../config.json";
export const InfoRow = props => {
  // CONVERT URL'S TO LINKS
  let value = props.value;
  if (
    props.value != null &&
    props.value
      .toString()
      .substring(0, 4)
      .toUpperCase() === "HTTP"
    )
    {
      value = (
        <a href={props.value} target="_blank" rel="noopener noreferrer">
          Click To Open
        </a>
      );
    } else if (
      props.value != null &&
      props.value
        .toString()
        .substring(0, 2)
        .toUpperCase() === "\\\\"
      )
      {
        value = (
          <a href={mainConfig.imageViewerUrl + props.value} target="_blank" rel="noopener noreferrer">
            Click To Open
          </a>
        );
      }
    

  return (
    <div className="sc-info-window-row">
      <div className="sc-info-window-label">{props.label}</div>
      <div className={props.imageData ? "sc-hidden" : "sc-info-window-value"}>
        {value}
        {props.children}
      </div>
    </div>
  );
};

export default InfoRow;

export const InfoRowValue = props => {
  return (
    <div
      className={"sc-info-window-value " + props.className}
      onClick={() => {
        props.onClick(props.feature);
      }}
    >
      {props.value}
      {props.children}{" "}
    </div>
  );
};
