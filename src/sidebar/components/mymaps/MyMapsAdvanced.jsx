import React, { Component } from "react";
import "./MyMapsAdvanced.css";
import MyMapsFooter from "./MyMapsFooter.jsx";
import Collapsible from "react-collapsible";
import Switch from "react-switch";
import * as helpers from "../../../helpers/helpers";
import * as drawingHelpers from "../../../helpers/drawingHelpers";
import copy from "copy-to-clipboard";

class MyMapsAdvanced extends Component {
  constructor(props) {
    super(props);

    this.inputId = "sc-mymaps-advanced-import-input sc-editable";
    this.state = {
      open: false,
      editOn: false,
      editOption: "vertices",
      inputText: "",
    };
  }

  onSwitchChange = (editOn) => {
    this.setState({ editOn });
    helpers.addAppStat("Edit Features Switch", "Click");
    this.props.onEditFeatures(editOn, this.state.editOption);
  };

  onEditOption = (evt) => {
    this.setState({ editOption: evt.currentTarget.value });
    this.props.onEditFeatures(this.state.editOn, evt.currentTarget.value);
  };

  onImport = () => {
    // BASIC CHECKING
    if (this.state.inputText.length !== 36) {
      helpers.showMessage("MyMaps Import", "Invalid ID was entered.", helpers.messageColors.red);
      return;
    }

    drawingHelpers.importMyMaps(this.state.inputText, (result) => {
      if (result.error !== undefined) helpers.showMessage("MyMaps Import", "That MyMaps ID was NOT found!", helpers.messageColors.red);
      else {
        helpers.showMessage("MyMaps Import", "Success!  MyMaps imported.");
        this.props.onMyMapsImport(result);
      }
    });
  };

  onShare = () => {
    if (this.state.inputText.length !== 36) {
      helpers.showMessage("MyMaps Share", "Invalid ID was entered.", helpers.messageColors.red);
      return;
    }
    let currentUrl = `${window.location.href.split("?")[0]}?MY_MAPS_ID=${this.state.inputText}`;
    copy(currentUrl);
    helpers.showMessage("MyMaps Share", "MyMaps link has been saved to clipboard.", helpers.messageColors.green, 5000);

    // APP STATS
    helpers.addAppStat("MyMaps", "Share");
  };

  onSave = () => {
    if (!this.props.hasItems) helpers.showMessage("MyMaps Save", "Cannot save MyMaps! No Items Found! ", helpers.messageColors.yellow, 5000);
    else {
      this.setState({ copied: true });
      drawingHelpers.exportMyMaps((result) => {
        helpers.showMessage("MyMaps Save", "MyMaps have been saved!  Your ID has been saved to clipboard.", helpers.messageColors.green, 5000);
        helpers.glowContainer(this.inputId);
        this.setState({ inputText: result.id });
        copy(result.id);
      });
    }
    // APP STATS
    helpers.addAppStat("MyMaps", "Save");
  };

  onInputChange = (evt) => {
    this.setState({ inputText: evt.target.value });
  };

  render() {
    return (
      <div id="sc-mymaps-advanced">
        <Collapsible trigger="Advanced Options" open={this.state.open}>
          <div className="sc-mymaps-advanced-content">
            <div className="sc-mymaps-advanced-import-container">
              <label className="sc-mymaps-advanced-main-label">Import/Save</label>
              <div>
                <input
                  className={this.inputId}
                  id={this.inputId}
                  type="text"
                  placeholder="Enter ID here"
                  onChange={this.onInputChange}
                  onFocus={(evt) => {
                    helpers.disableKeyboardEvents(true);
                  }}
                  onBlur={(evt) => {
                    helpers.disableKeyboardEvents(false);
                  }}
                  value={this.state.inputText}
                />
                <br />
                <button className="sc-button sc-mymaps-advanced-import-button" onClick={this.onImport}>
                  Import
                </button>
                <button className="sc-button sc-mymaps-advanced-import-button" onClick={this.onSave} disabled={!this.props.hasItems}>
                  Save
                </button>
                <button className="sc-button sc-mymaps-advanced-import-button" onClick={this.onShare}>
                  Share
                </button>
              </div>
            </div>
            <div className="sc-mymaps-advanced-edit-container">
              {/* <label className="sc-mymaps-advanced-main-label">Edit Features</label> */}
              <label className={this.state.editOn ? "sc-mymaps-advanced-switch-label on" : "sc-mymaps-advanced-switch-label"}>
                Edit Features
                <Switch className="sc-mymaps-advanced-switch" onChange={this.onSwitchChange} checked={this.state.editOn} height={20} width={48} />
              </label>

              <label style={{ marginRight: "15px" }}>
                <input className="sc-mymaps-advanced-edit-radio" type="radio" name="editOptions" value="vertices" defaultChecked={true} onChange={this.onEditOption} />
                Vertices
              </label>
              <label>
                <input className="sc-mymaps-advanced-edit-radio" type="radio" name="editOptions" value="translate" defaultChecked={false} onChange={this.onEditOption} />
                Move
              </label>
            </div>

            <MyMapsFooter onMenuItemClick={this.props.onMenuItemClick} onDeleteAllClick={this.props.onDeleteAllClick} />
          </div>
        </Collapsible>
      </div>
    );
  }
}

export default MyMapsAdvanced;
