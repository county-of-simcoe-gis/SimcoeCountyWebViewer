import React from "react";
import Select from "react-select";

const CommercialRealEstateSearchPrice = (props) => {
  const dropDownStyles = {
    control: (provided) => ({
      ...provided,
      maxHeight: "30px",
      minHeight: "30px",
      // width: "150px"
      width: "160px",
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
    <div className="sc-border-bottom" style={{ marginTop: "10px", paddingBottom: "5px" }}>
      <label style={{ fontWeight: "bold" }}>Price</label>
      <div style={{ display: "inline-flex", paddingTop: "5px", marginBottom: "5px" }}>
        <Select styles={dropDownStyles} isSearchable={false} onChange={props.onPriceFromDropDownChange} options={props.priceFromItems} value={props.selectedPriceFrom} />
        <label style={{ paddingLeft: "5px", paddingRight: "5px", paddingTop: "5px" }}>to</label>
        <Select styles={dropDownStyles} isSearchable={false} onChange={props.onPriceToDropDownChange} options={props.priceToItems} value={props.selectedPriceTo} />
      </div>
    </div>
  );
};

export default CommercialRealEstateSearchPrice;
