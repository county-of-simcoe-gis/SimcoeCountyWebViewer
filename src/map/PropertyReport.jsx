import React from "react";
import "./PropertyReport.css";

class PropertyReport extends React.Component {
  render() {
    const info = this.props.propInfo;
    return (
      <div className="sc-property-report-container">
        <div className="sc-property-report-html-title">
          <div className="sc-property-report-html-title-address">{info.Address}</div>
          <div className="sc-property-report-html-title-button-container">
            <button className="sc-button sc-button-orange" style={{ width: "45%" }} onClick={this.props.onZoomClick}>
              Zoom
            </button>
            <a rel="noopener noreferrer" href={info.ReportURL} target="_blank" style={{ paddingLeft: "10px" }}>
              <button className="sc-button sc-button-blue" style={{ width: "45%" }}>
                Download
              </button>
            </a>
          </div>
        </div>
        <div className="sc-property-report-info-container">
          {/* GENERAL INFO */}
          <div className="sc-property-report-html-heading icon general">General Information</div>
          <div className="sc-property-report-html-container">
            <div>
              <div>
                <div className="sc-property-report-html-label">Roll Number: </div>
                <div className="sc-property-report-html-value">{info.ARN}</div>
              </div>
              <div className={info.ARN.substring(0, 4) === "4342" ? "sc-hidden" : ""}>
                <div className="sc-property-report-html-label">Property Type: </div>
                <div className="sc-property-report-html-value">{info.PropertyType}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Address: </div>
                <div className="sc-property-report-html-value">{info.Address}</div>
              </div>
              <div className={info.ARN.substring(0, 4) === "4342" ? "sc-hidden" : ""}>
                <div className="sc-property-report-html-label">Assessed Value: </div>
                <div className="sc-property-report-html-value">{info.AssessedValue ? <img src={info.AssessedValue} alt="assessed" /> : ""}</div>
                <div className="sc-property-report-html-market">(may not reflect current market value)</div>
              </div>
            </div>
          </div>

          {/* EMERGENCY  */}
          <div className="sc-property-report-html-heading icon general">Emergency Service</div>
          <div className="sc-property-report-html-container">
            <div>
              <div>
                <div className="sc-property-report-html-label">Police Station: </div>
                <div className="sc-property-report-html-value">{info.EmergencyService && info.EmergencyService.PoliceStation ? info.EmergencyService.PoliceStation : ""}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Closest Firehall: </div>
                <div className="sc-property-report-html-value">{info.EmergencyService && info.EmergencyService.FireStation ? info.EmergencyService.FireStation : ""}</div>
              </div>
            </div>
          </div>

          {/* WASTE COLLECTION */}
          <div className="sc-property-report-html-heading icon general">WASTE COLLECTION</div>
          <div className="sc-property-report-html-container">
            <div>
              <div>
                <div className="sc-property-report-html-label">Garbage/Recycling Collection Day: </div>
                <div className="sc-property-report-html-value">{info.WasteCollection && info.WasteCollection.GarbageDay ? info.WasteCollection.GarbageDay : ""}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Bag Tag Locations: </div>
                <div className="sc-property-report-html-value">{info.WasteCollection && info.WasteCollection.BagTagleLocation1 ? info.WasteCollection.BagTagleLocation1 : ""}</div>
                <div className="sc-property-report-html-value">{info.WasteCollection && info.WasteCollection.BagTagleLocation2 ? info.WasteCollection.BagTagleLocation2 : ""}</div>
                <div className="sc-property-report-html-value">{info.WasteCollection && info.WasteCollection.BagTagleLocation3 ? info.WasteCollection.BagTagleLocation3 : ""}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Waste Management Facility: </div>
                <div className="sc-property-report-html-value">General Waste</div>
                <div className="sc-property-report-html-value sub">{info.WasteCollection && info.WasteCollection.LandfillLocation_General ? info.WasteCollection.LandfillLocation_General : ""}</div>
                <div className="sc-property-report-html-value">Hazardous Waste</div>
                <div className="sc-property-report-html-value sub">
                  {info.WasteCollection && info.WasteCollection.LandfillLocation_Hazardous ? info.WasteCollection.LandfillLocation_Hazardous : ""}
                </div>
              </div>
            </div>
          </div>

          {/* SCHOOLS */}
          <div className="sc-property-report-html-heading icon general">SCHOOLS</div>
          <div className="sc-property-report-html-container">
            <div>
              <div>
                <div className="sc-property-report-html-label">Catholic Elementary: </div>
                <div className="sc-property-report-html-value">{info.Schools && info.Schools.CatholicElementry ? info.Schools.CatholicElementry : ""}</div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Catholic Secondary: </div>
                <div className="sc-property-report-html-value">{info.Schools && info.Schools.CatholicSecondary ? info.Schools.CatholicSecondary : ""}</div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Catholic School Board Website: </div>
                <div className="sc-property-report-html-value">
                  <a rel="noopener noreferrer" href={info.Schools && info.Schools.CatholicBoardWebsiteURL ? info.Schools.CatholicBoardWebsiteURL : ""} target="_blank">
                    {info.Schools && info.Schools.CatholicBoardWebsiteURL ? info.Schools.CatholicBoardWebsiteURL : ""}
                  </a>
                </div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Public Elementary: </div>
                <div className="sc-property-report-html-value">{info.Schools && info.Schools.PublicElementry ? info.Schools.PublicElementry : ""}</div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Public Secondary: </div>
                <div className="sc-property-report-html-value">{info.Schools && info.Schools.PublicSecondary ? info.Schools.PublicSecondary : ""}</div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Public School Board Website: </div>
                <div className="sc-property-report-html-value">
                  <a rel="noopener noreferrer" href={info.Schools && info.Schools.PublicBoardWebsiteURL ? info.Schools.PublicBoardWebsiteURL : ""} target="_blank">
                    {info.Schools && info.Schools.PublicBoardWebsiteURL ? info.Schools.PublicBoardWebsiteURL : ""}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* OTHER */}
          <div className="sc-property-report-html-heading icon general">OTHER</div>
          <div className="sc-property-report-html-container">
            <div>
              <div>
                <div className="sc-property-report-html-label">Library: </div>
                <div className="sc-property-report-html-value">{info.Other && info.Other.Library ? info.Other.Library : ""}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Closest Fire Hydrant: </div>
                <div className="sc-property-report-html-value">{info.Other && info.Other.ClosestFireHydrant ? info.Other.ClosestFireHydrant : ""}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Municipal Admin Centre: </div>
                <div className="sc-property-report-html-value">{info.Other && info.Other.MunicipalAdminCentre ? info.Other.MunicipalAdminCentre : ""}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Closest Hospital: </div>
                <div className="sc-property-report-html-value">{info.Other && info.Other.ClosestHospital ? info.Other.ClosestHospital : ""}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Potential Broadband Coverage: </div>
                <div className="sc-property-report-html-value">{info.Other && info.Other.BroadbandSpeed ? info.Other.BroadbandSpeed : ""}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default PropertyReport;
