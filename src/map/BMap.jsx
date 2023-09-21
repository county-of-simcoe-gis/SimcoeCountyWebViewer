import React, { useEffect, useState } from "react";
import * as helpers from "../helpers/helpers";
import BMapItem from "./BMapItem";

const BMap = (props) => {
  const [baseMapType, setBaseMapType] = useState(null);

  useEffect(() => {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      const basemap = window.config.baseMapType !== undefined ? window.config.baseMapType : "Default";
      setBaseMapType(basemap);
    });
  }, []);

  return <div>{baseMapType == null ? null : <BMapItem baseMapType={baseMapType} />}</div>;
};

export default BMap;
