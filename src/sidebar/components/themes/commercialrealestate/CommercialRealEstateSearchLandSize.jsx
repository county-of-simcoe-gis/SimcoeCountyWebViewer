import React from "react";
import Select from "react-select";

const CommercialRealEstateSearchLandSize = (props) => {
  const dropDownStyles = {
    control: (provided) => ({
      ...provided,
      maxHeight: "30px",
      minHeight: "30px",
      // width: "150px"
      width: "165px",
      //      borderRadius: "unset",
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      //   height: "30px"
    }),
    clearIndicator: (provided) => ({
      ...provided,
      padding: "5px",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: "5px",
    }),
    menu: (provided) => ({
      ...provided,
      //   width: "200px"
    }),
    container: (provided) => ({
      ...provided,
      width: "100%",
    }),
  };

  return (
    <div className={props.visible ? "sc-border-bottom" : "sc-hidden"} style={{ marginTop: "10px", paddingBottom: "5px" }}>
      <label style={{ fontWeight: "bold" }}>Land Size (acres)</label>
      <label style={{ float: "right", fontSize: "9pt" }} onClick={() => props.onSwitchSearchType("BuildingSize")}>
        [<label className="sc-fakeLink">Search By Building Size</label>]
      </label>
      <div style={{ display: "inline-flex", paddingTop: "5px", marginBottom: "5px" }}>
        <Select styles={dropDownStyles} isSearchable={false} onChange={props.onLandSizeFromDropDownChange} options={props.landSizeFromItems} value={props.selectedLandSizeFrom} />
        <label style={{ paddingLeft: "5px", paddingRight: "5px", paddingTop: "5px" }}>to</label>
        <Select styles={dropDownStyles} isSearchable={false} onChange={props.onLandSizeToDropDownChange} options={props.landSizeToItems} value={props.selectedLandSizeTo} />
      </div>
    </div>
  );
};

export default CommercialRealEstateSearchLandSize;
