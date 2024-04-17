// REACT
//https://medium.com/nerd-for-tech/simple-drag-and-drop-in-react-without-an-external-library-ebf1c1b809e
import React, { useState, useEffect, useRef } from "react";
import * as helpers from "../../../../helpers/helpers";
import { List, arrayMove } from "react-movable";
import LayerItem from "./LayerItem.jsx";
import "./Layers.css";
// CUSTOM
import "./Layers.css";
const Layers = (layersProps) => {
  const storageKey = "Layers";
  const lastPositionRef = useRef(null);
  const virtualId = "sc-toc-list-layers-sortablevirtuallist-virtual-layers";
  const [recalcId, setRecalcId] = useState("");
  const [layers, setLayers] = useState([]);
  const [allLayers, setAllLayers] = useState([]);

  useEffect(() => {
    // LISTEN FOR SEARCH RESULT
    const activeTocLayerListener = (layerItem) => {
      if (layersProps.visible) onActivateLayer(layerItem);
    };
    window.emitter.addListener("activeTocLayer", activeTocLayerListener);
    window.addEventListener("resize", updateRecalcId);
    return () => {
      window.emitter.removeListener("activeTocLayer", activeTocLayerListener);
      window.removeEventListener("resize", updateRecalcId);
    };
  }, []);

  useEffect(() => {
    if (layersProps.group.layers && layersProps.group.layers.length > 0) {
      setAllLayers(layersProps.group.layers);
      setLayers(
        layersProps.group.layers.filter((layer) => {
          if (layersProps.searchText === "") return true;
          else if (layer.tocDisplayName.toUpperCase().indexOf(layersProps.searchText.toUpperCase()) !== -1) return true;
          else return false;
        })
      );
    }
  }, [layersProps.searchText, layersProps.group]);

  const updateRecalcId = () => {
    if (!layersProps.visible) return;
    try {
      lastPositionRef.current = document.getElementById(virtualId).scrollTop;
    } catch (e) {
      return;
    }
    setRecalcId(helpers.getUID());
    setTimeout(() => {
      document.getElementById(virtualId).scrollTop += lastPositionRef.current;
    }, 10);
  };

  const onActivateLayer = (layerItem) => {
    if (!layersProps.visible) return;
    const elementId = layerItem.fullName + "_" + layerItem.layerGroup + "-container";

    allLayers.forEach((layer) => {
      if (layer.name === layerItem.fullName) {
        document.getElementById(virtualId).scrollTop = 0;

        var i = 0;
        var elemFound = false;
        for (i = 1; i <= 100; i++) {
          if (elemFound) return;
          // eslint-disable-next-line
          ((index) => {
            setTimeout(() => {
              if (elemFound) return;

              const elem = document.getElementById(elementId);
              if (elem !== null) {
                elemFound = true;
                elem.scrollIntoView();
                return;
              } else {
                document.getElementById(virtualId).scrollTop += i * 5;
              }
            }, i * 100);
          })(i);
        }
      }
    });
  };

  if (layersProps.group.layers === undefined) return <div />;
  else
    return (
      <div className="sc-toc-layer-container">
        <List
          values={layers}
          onChange={({ oldIndex, newIndex }) => {
            if (layersProps.sortAlpha) return;
            const oldIndexAllLayers = allLayers.indexOf(layers[oldIndex]);
            const newIndexAllLayers = allLayers.indexOf(layers[newIndex]);

            setLayers(arrayMove(layers, oldIndex, newIndex));
            layersProps.onSortEnd({ oldIndex: oldIndexAllLayers, newIndex: newIndexAllLayers });
          }}
          lockVertically={true}
          beforeDrag={() => {
            if (layersProps.sortAlpha) return;
          }}
          renderList={({ children, props }) => (
            <ul id={virtualId} {...props}>
              {children}
            </ul>
          )}
          renderItem={({ value, props, isDragged, isSelected }) => (
            <li id={virtualId + "-listitem"} className={`${virtualId}-listitem${isDragged || isSelected ? " sc-dragged" : ""}`} {...props}>
              <LayerItem
                key={layersProps.id + "-" + helpers.getHash(value.name)}
                id={layersProps.id + "-" + helpers.getHash(value.name)}
                layerInfo={value}
                onLegendToggle={layersProps.onLegendToggle}
                group={layersProps.group}
                onLayerChange={layersProps.onLayerChange}
                onCheckboxChange={layersProps.onCheckboxChange}
                searchText={layersProps.searchText}
                onLayerOptionsClick={layersProps.onLayerOptionsClick}
              />
            </li>
          )}
        />
      </div>
    );
};

export default Layers;
