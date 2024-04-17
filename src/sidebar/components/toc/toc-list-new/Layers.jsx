// REACT
//https://medium.com/nerd-for-tech/simple-drag-and-drop-in-react-without-an-external-library-ebf1c1b809e
import React, { useState, useEffect, useRef } from "react";
import * as helpers from "../../../../helpers/helpers";
import { debounce } from "../../../../helpers/react";

import LayerItem from "./LayerItem.jsx";
import "./Layers.css";
// CUSTOM
import "./Layers.css";
import { preventDefault } from "ol/events/Event.js";
const Layers = (props) => {
  const storageKey = "Layers";
  const lastPositionRef = useRef(null);
  const virtualId = "sc-toc-list-layers-sortablevirtuallist-virtual-layers";
  const [recalcId, setRecalcId] = useState("");
  const [layers, setLayers] = useState([]);
  const [allLayers, setAllLayers] = useState([]);
  const startYRef = useRef();
  const draggedElementRef = useRef();
  const dragItemRef = useRef();
  const dragOverItemRef = useRef();
  const [dragItem, setDragItem] = useState();
  const [dragOverItem, setDragOverItem] = useState();

  useEffect(() => {
    // LISTEN FOR SEARCH RESULT
    const activeTocLayerListener = (layerItem) => {
      if (props.visible) onActivateLayer(layerItem);
    };
    window.emitter.addListener("activeTocLayer", activeTocLayerListener);
    window.addEventListener("resize", updateRecalcId);
    return () => {
      window.emitter.removeListener("activeTocLayer", activeTocLayerListener);
      window.removeEventListener("resize", updateRecalcId);
    };
  }, []);

  useEffect(() => {
    if (props.group.layers && props.group.layers.length > 0) {
      setAllLayers(props.group.layers);
      setLayers(
        props.group.layers.filter((layer) => {
          if (props.searchText === "") return true;
          else if (layer.tocDisplayName.toUpperCase().indexOf(props.searchText.toUpperCase()) !== -1) return true;
          else return false;
        })
      );
    }
  }, [props.searchText, props.group]);

  const updateRecalcId = () => {
    if (!props.visible) return;
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
    if (!props.visible) return;
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

  const handleDragStart = (e) => {
    startYRef.current = e.clientY;
    draggedElementRef.current = e.target;
    e.dataTransfer.effectAllowed = "move";
    // e.dataTransfer.setDragImage(e.target.firstChild.firstChild, 10, 10);
    var di = new Image();
    // di.src = toDataURL(&quot;image/png&quot;);
    e.dataTransfer.setDragImage(di, 10, 10);
    dragItemRef.current = e.target.id;
    setDragItem(e.target.id);
  };
  const handleDragLeave = (callback) => {
    callback(dragOverItemRef.current);
  };
  const handleDragEnter = (e) => {
    e.preventDefault();
    if (e.currentTarget.id === dragItemRef.current || dragOverItemRef.current === e.currentTarget.id) return;
    dragOverItemRef.current = e.currentTarget.id;
    setDragOverItem(e.currentTarget.id);
  };
  const handleDragEnd = () => {
    const oldIndex = allLayers.indexOf(allLayers.find((layer) => props.id + "-" + helpers.getHash(layer.name) + "-container" === dragItemRef.current));
    const newIndex = allLayers.indexOf(allLayers.find((layer) => props.id + "-" + helpers.getHash(layer.name) + "-container" === dragOverItemRef.current));
    const oldIndexFiltered = layers.indexOf(layers.find((layer) => props.id + "-" + helpers.getHash(layer.name) + "-container" === dragItemRef.current));
    const newIndexFiltered = layers.indexOf(layers.find((layer) => props.id + "-" + helpers.getHash(layer.name) + "-container" === dragOverItemRef.current));
    const newLayers = [...layers];
    const movedLayer = newLayers.splice(oldIndexFiltered, 1);
    newLayers.splice(newIndexFiltered, 0, movedLayer[0]);
    // setLayers(newLayers);

    props.onSortEnd({ oldIndex: oldIndex, newIndex: newIndex });
    draggedElementRef.current.style.transform = "";
    dragItemRef.current = null;
    dragOverItemRef.current = null;
    setDragOverItem(null);
    setDragItem(null);
  };
  const handleDragCancel = () => {
    draggedElementRef.current.style.transform = "";
    dragItemRef.current = null;
    dragOverItemRef.current = null;
    setDragOverItem(null);
    setDragItem(null);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    const deltaY = e.clientY - startYRef.current;
    draggedElementRef.current.style.transform = `translateY(${deltaY}px)`;
  };

  if (props.group.layers === undefined) return <div />;
  else
    return (
      <div className="sc-toc-layer-container">
        <ul id={virtualId}>
          {layers.map((layer) => (
            <LayerListItem
              key={props.id + "-" + helpers.getHash(layer.name) + "-container"}
              id={props.id + "-" + helpers.getHash(layer.name) + "-container"}
              parent={props.id}
              layer={layer}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
              onDragExit={handleDragCancel}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              currentSelection={dragOverItem}
              draggedItem={dragItem}
              onLegendToggle={props.onLegendToggle}
              group={props.group}
              onLayerChange={props.onLayerChange}
              onCheckboxChange={props.onCheckboxChange}
              searchText={props.searchText}
              onLayerOptionsClick={props.onLayerOptionsClick}
            />
          ))}
        </ul>
      </div>
    );
};

export default Layers;

const LayerListItem = (props) => {
  const [open, setOpen] = useState(false);
  const { layer, parent } = props;

  useEffect(() => {
    if (props.id !== props.currentSelection) setOpen(false);
  }, [props.currentSelection]);
  const handleDragEnter = (e) => {
    e.preventDefault();
    if (props.id !== props.draggedItem) setOpen(true);
    props.onDragEnter(e);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
  };
  const handleDragEnd = () => {
    setOpen(false);
    props.onDragEnd();
  };
  const handleDragExit = () => {
    setOpen(false);
    props.onDragExit();
  };

  return (
    <li
      className={`sc-toc-layer-list-item sc-draggable`}
      key={props.id}
      onDragStart={(e) => props.onDragStart(e)}
      onDragEnter={(e) => handleDragEnter(e)}
      onDragEnd={() => handleDragEnd()}
      onDragExit={() => handleDragExit()}
      onDragOver={(e) => props.onDragOver(e)}
      onDragLeave={(e) => handleDragLeave(e)}
      id={props.id}
      draggable
      style={{
        minHeight: "30px",
        transition: "padding 50ms linear 50ms",
        padding: open ? "0px 0px 30px 0px" : "",
        border: "1px dashed #000",
      }}
    >
      <LayerItem
        key={parent + "-" + helpers.getHash(layer.name)}
        id={parent + "-" + helpers.getHash(layer.name)}
        layerInfo={layer}
        onLegendToggle={props.onLegendToggle}
        group={props.group}
        onLayerChange={props.onLayerChange}
        onCheckboxChange={props.onCheckboxChange}
        searchText={props.searchText}
        onLayerOptionsClick={props.onLayerOptionsClick}
      />
    </li>
  );
};
