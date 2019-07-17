import React, { Component } from "react";
import Select from "react-select";
import * as helpers from "../../../helpers/helpers";

class MyMapsSymbolizer extends Component {
  constructor(props) {
    super(props);

    this.pointStyleOptions = [{ value: "circle", label: "Circle" }, { value: "cross", label: "Cross" }];
    this.dropDown = React.createRef();

    this.state = {
      selectedPointStyleDropDown: this.pointStyleOptions[0],
      menuOpen: false
    };
  }

  onPointStyleDropDownChange = () => {
    console.log("in");
  };

  onClick = () => {
    console.log(this.dropDown);
    //this.setState({ menuOpen: true });
  };
  //onClick={this.onClick} onMouseUp={helpers.convertMouseUpToClick}
  render() {
    return (
      <div className="sc-fieldset">
        <legend>
          <img src={images["symbolizer.png"]} />
          Symbolizer
        </legend>
        <label>Style:</label>
        <Select
          //menuIsOpen={this.state.menuOpen}
          ref={this.dropDown}
          styles={dropDownStyles}
          isSearchable={false}
          onChange={this.onPointStyleDropDownChange}
          options={this.pointStyleOptions}
          //value={this.state.selectedPointStyleDropDown}
          value={null}
        />
        <input type="checkbox" />
        <select name="cars">
          <option value="volvo">Volvo</option>
          <option value="saab">Saab</option>
          <option value="fiat">Fiat</option>
          <option value="audi">Audi</option>
        </select>
      </div>
    );
  }
}

export default MyMapsSymbolizer;

// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}

const dropDownStyles = {
  control: provided => ({
    ...provided,
    minHeight: "30px",
    zIndex: 100000
  }),
  indicatorsContainer: provided => ({
    ...provided,
    height: "30px"
  }),
  clearIndicator: provided => ({
    ...provided,
    padding: "5px"
  }),
  dropdownIndicator: provided => ({
    ...provided,
    padding: "5px"
  })
};
