import React from 'react';

export const InfoRow = (props) => {

  // CONVERT URL'S TO LINKS
  let value = props.value;
  if (props.value != null && props.value.substring(0, 4).toUpperCase() === "HTTP")
    value = <a href={props.value} target="_blank" rel="noopener noreferrer">{props.value}</a>;

  return (
    <div>
      <div className="sc-info-window-label">{props.label}</div>
      <div className={props.imageData ? "sc-hidden" :"sc-info-window-value"}>{value}{props.children}</div>
    </div>
  )
}

export default InfoRow;


export const InfoRowValue = (props) => {
  return (
    <div className={"sc-info-window-value " + props.className} onClick={() => {props.onClick(props.feature)}}>{props.value}{props.children} </div>
  )
}