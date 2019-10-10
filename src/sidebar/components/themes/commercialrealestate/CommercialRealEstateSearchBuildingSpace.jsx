import React from "react";
import Select from "react-select";

const CommercialRealEstateSearchBuildingSpace = props => {
  const dropDownStyles = {
    control: provided => ({
      ...provided,
      maxHeight: "30px",
      minHeight: "30px",
      // width: "150px"
      width: "165px"
      //      borderRadius: "unset",
    }),
    indicatorsContainer: provided => ({
      ...provided
      //   height: "30px"
    }),
    clearIndicator: provided => ({
      ...provided,
      padding: "5px"
    }),
    dropdownIndicator: provided => ({
      ...provided,
      padding: "5px"
    }),
    menu: provided => ({
      ...provided
      //   width: "200px"
    }),
    container: provided => ({
      ...provided,
      width: "100%"
    })
  };

  return (
    <div className={props.visible ? "sc-border-bottom" : "sc-hidden"} style={{ marginTop: "10px", paddingBottom: "5px" }}>
      <label style={{ fontWeight: "bold" }}>Building Space</label>
      <label style={{ float: "right", fontSize: "9pt" }} onClick={() => props.onSwitchSearchType("LandSize")}>
        [<label className="sc-fakeLink">Search By Land Size</label>]
      </label>
      <div style={{ display: "inline-flex", paddingTop: "5px", marginBottom: "5px" }}>
        <Select styles={dropDownStyles} isSearchable={false} onChange={props.onBuildingSpaceFromDropDownChange} options={props.buildingSpaceFromItems} value={props.selectedBuildingSpaceFrom} />
        <label style={{ paddingLeft: "5px", paddingRight: "5px", paddingTop: "5px" }}>to</label>
        <Select styles={dropDownStyles} isSearchable={false} onChange={props.onBuildingSpaceToDropDownChange} options={props.buildingSpaceToItems} value={props.selectedBuildingSpaceTo} />
      </div>
      <div style={{ display: "table-cell", verticalAlign: "top" }}>
        <input type="checkbox" onChange={props.onUnknownSquareFootageChange}></input>
      </div>

      <div style={{ display: "table-cell" }}>
        <label>Only search properties with incentives </label>
        <label style={{ display: "block", fontSize: "10pt" }}>(23 properties found with incentives)</label>
      </div>
    </div>
  );
};

export default CommercialRealEstateSearchBuildingSpace;
