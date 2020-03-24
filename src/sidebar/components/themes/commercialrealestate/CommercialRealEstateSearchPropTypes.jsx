import React, { Component } from "react";
import "./CommercialRealEstateSearchPropTypes.css";

class CommercialRealEstateSearch extends Component {
  state = {};

  onClose = () => {
    // ADD CLEAN UP HERE (e.g. Map Layers, Popups, etc)

    // CALL PARENT WITH CLOSE
    this.props.onClose();
  };

  render() {
    return (
      <div className="sc-border-bottom" style={{ paddingBottom: "5px" }}>
        <div className="sc-theme-commercial-real-estate-prop-type-title">Property Type</div>
        <div className="sc-theme-commercial-real-estate-prop-type-table">
          <div className="sc-theme-commercial-real-estate-prop-type-table-row">
            <PropType name="Commercial" colorClassName="sc-theme-commercial-real-estate-prop-type-commercial"></PropType>
            <PropType name="Vacant Land" colorClassName="sc-theme-commercial-real-estate-prop-type-vacant-land"></PropType>
            <PropType name="Farm" colorClassName="sc-theme-commercial-real-estate-prop-type-farm"></PropType>
          </div>
          <div className="sc-theme-commercial-real-estate-prop-type-table-row">
            <PropType name="Industrial" colorClassName="sc-theme-commercial-real-estate-prop-type-industrial"></PropType>
            <PropType name="Institutional" colorClassName="sc-theme-commercial-real-estate-prop-type-institutional"></PropType>
          </div>
        </div>
      </div>
    );
  }
}

export default CommercialRealEstateSearch;

const PropType = props => {
  return (
    <label>
      <input type="checkbox"></input>
      <span className={props.colorClassName}>{props.name}</span>
    </label>
  );
};
