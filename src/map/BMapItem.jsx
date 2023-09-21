import React from "react";
import BasemapSwitcher from "./BasemapSwitcher";
import BasicBasemapSwitcher from "./BasicBasemapSwitcher";
import { BasemapSwitcherProvider } from "./BasemapSwitcherContext";

const BMapItem = (props) => {
  return (
    <div>
      <BasemapSwitcherProvider>{props.baseMapType.toLowerCase() == "basic" ? <BasicBasemapSwitcher></BasicBasemapSwitcher> : <BasemapSwitcher></BasemapSwitcher>}</BasemapSwitcherProvider>
    </div>
  );
};

export default BMapItem;
