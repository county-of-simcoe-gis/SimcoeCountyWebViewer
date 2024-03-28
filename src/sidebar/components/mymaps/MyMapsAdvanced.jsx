import React, { useState, useRef, useEffect, Fragment } from "react";
import "./MyMapsAdvanced.css";
import MyMapsFooter from "./MyMapsFooter.jsx";
import Collapsible from "react-collapsible";
import Switch from "react-switch";
import * as helpers from "../../../helpers/helpers";
import * as drawingHelpers from "../../../helpers/drawingHelpers";
import copy from "copy-to-clipboard";

const MyMapsAdvanced = (props) => {
  const [open, setOpen] = useState(false);
  const [editOn, setEditOn] = useState(false);
  const [editOption, setEditOption] = useState("vertices");
  const [inputText, setInputText] = useState("");
  const [copied, setCopied] = useState(false);
  const extensions = useRef([]);
  const inputId = "sc-mymaps-advanced-import-input sc-editable";

  useEffect(() => {
    if (props.extensions) {
      extensions.current = props.extensions;
    }
  }, [props.extensions]);
  const onSwitchChange = (editOn) => {
    setEditOn(editOn);
    helpers.addAppStat("Edit Features Switch", "Click");
    props.onEditFeatures(editOn, editOption);
  };

  const onEditOption = (evt) => {
    setEditOption(evt.currentTarget.value);
    props.onEditFeatures(editOn, evt.currentTarget.value);
  };

  const onImport = () => {
    // BASIC CHECKING
    if (inputText.length !== 36) {
      helpers.showMessage("MyMaps Import", "Invalid ID was entered.", helpers.messageColors.red);
      return;
    }

    drawingHelpers.importMyMaps(inputText, (result) => {
      if (result.error !== undefined) helpers.showMessage("MyMaps Import", "That MyMaps ID was NOT found!", helpers.messageColors.red);
      else {
        helpers.showMessage("MyMaps Import", "Success!  MyMaps imported.");
        props.onMyMapsImport(result);
      }
    });
  };

  const onShare = () => {
    if (inputText.length !== 36) {
      helpers.showMessage("MyMaps Share", "Invalid ID was entered.", helpers.messageColors.red);
      return;
    }
    let currentUrl = `${window.location.href.split("?")[0]}?MY_MAPS_ID=${inputText}`;
    copy(currentUrl);
    helpers.showMessage("MyMaps Share", "MyMaps link has been saved to clipboard.", helpers.messageColors.green, 5000);

    // APP STATS
    helpers.addAppStat("MyMaps", "Share");
  };

  const onSave = () => {
    if (!props.hasItems) helpers.showMessage("MyMaps Save", "Cannot save MyMaps! No Items Found! ", helpers.messageColors.yellow, 5000);
    else {
      setCopied(true);
      drawingHelpers.exportMyMaps((result) => {
        helpers.showMessage("MyMaps Save", "MyMaps have been saved!  Your ID has been saved to clipboard.", helpers.messageColors.green, 5000);
        helpers.glowContainer(inputId);
        setInputText(result.id);
        copy(result.id);
      });
    }
    // APP STATS
    helpers.addAppStat("MyMaps", "Save");
  };

  const onInputChange = (evt) => {
    setInputText(evt.target.value);
  };
  const Extensions = (props) => {
    if (!extensions.current) return <></>;
    return extensions.current.map((ext) => {
      return <Fragment key={helpers.getUID()}>{ext.component({ ...props, inputText: inputText })}</Fragment>;
    });
  };
  return (
    <div id="sc-mymaps-advanced">
      <Collapsible trigger="Advanced Options" open={open}>
        <div className="sc-mymaps-advanced-content">
          <div className="sc-mymaps-advanced-import-container">
            <label className="sc-mymaps-advanced-main-label">Import/Save</label>
            <div>
              <input
                className={inputId}
                id={inputId}
                type="text"
                placeholder="Enter ID here"
                onChange={onInputChange}
                onFocus={(evt) => {
                  helpers.disableKeyboardEvents(true);
                }}
                onBlur={(evt) => {
                  helpers.disableKeyboardEvents(false);
                }}
                value={inputText}
              />
              <br />
              <button className="sc-button sc-mymaps-advanced-import-button" onClick={onImport}>
                Import
              </button>
              <button className="sc-button sc-mymaps-advanced-import-button" onClick={onSave} disabled={!props.hasItems}>
                Save
              </button>
              <button className="sc-button sc-mymaps-advanced-import-button" onClick={onShare}>
                Share
              </button>
              <Extensions props={props} />
            </div>
          </div>
          <div className="sc-mymaps-advanced-edit-container">
            {/* <label className="sc-mymaps-advanced-main-label">Edit Features</label> */}
            <label className={editOn ? "sc-mymaps-advanced-switch-label on" : "sc-mymaps-advanced-switch-label"}>
              Edit Features
              <Switch className="sc-mymaps-advanced-switch" onChange={onSwitchChange} checked={editOn} height={20} width={48} />
            </label>

            <label style={{ marginRight: "15px" }}>
              <input className="sc-mymaps-advanced-edit-radio" type="radio" name="editOptions" value="vertices" defaultChecked={true} onChange={onEditOption} />
              Vertices
            </label>
            <label>
              <input className="sc-mymaps-advanced-edit-radio" type="radio" name="editOptions" value="translate" defaultChecked={false} onChange={onEditOption} />
              Move
            </label>
          </div>

          <MyMapsFooter onMenuItemClick={props.onMenuItemClick} onDeleteAllClick={props.onDeleteAllClick} />
        </div>
      </Collapsible>
    </div>
  );
};

export default MyMapsAdvanced;
