import React from "react";
import Select from "react-select";
const CommercialRealEstateSearchType = props => {
  const dropDownStyles = {
    control: provided => ({
      ...provided,
      maxHeight: "30px",
      minHeight: "30px"
      // width: "150px"
      //width: "100px",
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
    <div className="sc-border-bottom" style={{ marginTop: "10px", paddingBottom: "5px" }}>
      <label style={{ fontWeight: "bold" }}>Real Estate Type</label>
      <Select styles={dropDownStyles} isSearchable={false} onChange={props.onTypeDropDownChange} options={props.types} value={props.selectedType} />
    </div>
  );
};

export default CommercialRealEstateSearchType;
