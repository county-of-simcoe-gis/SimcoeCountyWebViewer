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

    this.inputId = "sc-mymaps-advanced-import-input";
    this.state = {
      open: false,
      editOn: false,
      editOption: "vertices",
      inputText: ""
    };
  }

  onSwitchChange = editOn => {
    this.setState({ editOn });
    helpers.addAppStat("Edit Features Switch", editOn);
    this.props.onEditFeatures(editOn, this.state.editOption);
  };

  onEditOption = evt => {
    this.setState({ editOption: evt.currentTarget.value });
    this.props.onEditFeatures(this.state.editOn, evt.currentTarget.value);
  };

  onImport = () => {
    // BASIC CHECKING
    if (this.state.inputText.length !== 36) {
      helpers.showMessage("MyMaps Import", "Invalid ID was entered.", helpers.messageColors.red);
      return;
    }

    drawingHelpers.importMyMaps(this.state.inputText, result => {
      if (result.error !== undefined) helpers.showMessage("MyMaps Import", "That MyMaps ID was NOT found!", helpers.messageColors.red);
      else {
        helpers.showMessage("MyMaps Import", "Success!  MyMaps imported.");
        this.props.onMyMapsImport(result);
      }
    });
  };

  onSave = () => {
    this.setState({ copied: true });
    drawingHelpers.exportMyMaps(result => {
      helpers.showMessage("MyMaps Save", "MyMaps have been saved!  Your ID has been saved to clipboard.",helpers.messageColors.green, 5000);
      helpers.glowContainer(this.inputId);
      this.setState({ inputText: result.id });
      copy(result.id);
    });
  };

  onInputChange = evt => {
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
                  id={this.inputId} type="text" 
                  placeholder="Enter ID here" 
                  className="sc-input sc-editable"
                  onChange={this.onInputChange} 
                  onFocus={evt => {helpers.disableKeyboardEvents(true);}} 
                  onBlur={evt => {helpers.disableKeyboardEvents(false);}} 
                  value={this.state.inputText} />
                {/* <Select
                  styles={selectStyles}
                  // isSearchable={false}
                  // onChange={this.onGroupDropDownChange}
                  // options={this.state.layerGroups}
                  // value={this.state.selectedGroup}
                  placeholder="6a8cf8c6-b3a0-11e9-9d64-005056b2f523"
                /> */}
                <button className="sc-button sc-mymaps-advanced-import-button" onClick={this.onImport}>
                  Import
                </button>

                <button className="sc-button sc-mymaps-advanced-import-button" onClick={this.onSave}>
                  Save
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

      // <div className="sc-mymaps-advanced">
      //   <div>Advanced</div>
      //   <MyMapsFooter onMenuItemClick={this.props.onMenuItemClick} onDeleteAllClick={this.props.onDeleteAllClick} />
      // </div>
    );
  }
}

export default MyMapsAdvanced;

// const selectStyles = {
//   control: provided => ({
//     ...provided,
//     minHeight: "30px"
//   }),
//   indicatorsContainer: provided => ({
//     ...provided,
//     height: "30px"
//   }),
//   clearIndicator: provided => ({
//     ...provided,
//     padding: "5px"
//   }),
//   dropdownIndicator: provided => ({
//     ...provided,
//     padding: "5px"
//   })
// };
