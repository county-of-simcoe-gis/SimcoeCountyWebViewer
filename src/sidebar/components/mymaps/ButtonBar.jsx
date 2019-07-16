import React from "react";
import "./ButtonBar.css";
import DrawButton from "./DrawButton.jsx";

const ButtonBar = props => {
  return (
    <div className="sc-mymaps-button-bar">
      <DrawButton
        title="Draw a point on the map"
        imageName="point.png"
        onClick={() => {
          props.onClick("Point");
        }}
        isActive={props.activeButton === "Point" ? true : false}
      />
      <DrawButton
        title="Draw a line on the map"
        imageName="polyline.png"
        onClick={() => {
          props.onClick("LineString");
        }}
        isActive={props.activeButton === "LineString" ? true : false}
      />
      <DrawButton
        title="Draw a polygon on the map"
        imageName="polygon.png"
        onClick={() => {
          props.onClick("Polygon");
        }}
        isActive={props.activeButton === "Polygon" ? true : false}
      />
      <DrawButton
        title="Draw a circle on the map"
        imageName="circle.png"
        onClick={() => {
          props.onClick("Circle");
        }}
        isActive={props.activeButton === "Circle" ? true : false}
      />
      <DrawButton
        title="Draw a rectangle on the map"
        imageName="rectangle.png"
        onClick={() => {
          props.onClick("Rectangle");
        }}
        isActive={props.activeButton === "Rectangle" ? true : false}
      />
      <DrawButton
        title="Draw an arrow on the map"
        imageName="arrow.png"
        onClick={() => {
          props.onClick("Arrow");
        }}
        isActive={props.activeButton === "Arrow" ? true : false}
      />
      <DrawButton
        disabled={false}
        title="Add text on the map"
        imageName="text.png"
        onClick={() => {
          props.onClick("Text");
        }}
        isActive={props.activeButton === "Text" ? true : false}
      />
      <DrawButton
        disabled={false}
        title="Erase items on the map"
        imageName="eraser.png"
        onClick={() => {
          props.onClick("Eraser");
        }}
        isActive={props.activeButton === "Eraser" ? true : false}
      />
      {/* <DrawButton
        disabled={true}
        title="Adjust Map Maps Settings"
        imageName="settings.png"
        onClick={() => {
          props.onClick("Settings");
        }}
        isActive={props.activeButton === "Settings" ? true : false}
      /> */}
      <DrawButton
        title="Cancel current drawing tool"
        imageName="none.png"
        onClick={() => {
          props.onClick("Cancel");
        }}
        isActive={props.activeButton === "Cancel" ? true : false}
      />
    </div>
  );
};

export default ButtonBar;
