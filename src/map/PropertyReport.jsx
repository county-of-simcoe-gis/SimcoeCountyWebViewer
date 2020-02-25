import React from "react";
import "./PropertyReport.css";

class PropertyReport extends React.Component {
  render() {
    const info = this.props.propInfo;
    console.log(info);
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
              <div>
                <div className="sc-property-report-html-label">Property Type: </div>
                <div className="sc-property-report-html-value">{info.PropertyType}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Address: </div>
                <div className="sc-property-report-html-value">{info.Address}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Assessed Value: </div>
                <div className="sc-property-report-html-value">
                  <img src={"data:image/png;base64," + info.AssessedValue} alt="assessed" />
                </div>
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
                <div className="sc-property-report-html-value">{info.EmergencyService.PoliceStation}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Closest Firehall: </div>
                <div className="sc-property-report-html-value">{info.EmergencyService.FireStation}</div>
              </div>
            </div>
          </div>

          {/* WASTE COLLECTION */}
          <div className="sc-property-report-html-heading icon general">WASTE COLLECTION</div>
          <div className="sc-property-report-html-container">
            <div>
              <div>
                <div className="sc-property-report-html-label">Garbage/Recycling Collection Day: </div>
                <div className="sc-property-report-html-value">{info.WasteCollection.GarbageDay}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Bag Tag Locations: </div>
                <div className="sc-property-report-html-value">{info.WasteCollection.BagTagleLocation1}</div>
                <div className="sc-property-report-html-value">{info.WasteCollection.BagTagleLocation2}</div>
                <div className="sc-property-report-html-value">{info.WasteCollection.BagTagleLocation3}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Waste Management Facility: </div>
                <div className="sc-property-report-html-value">General Waste</div>
                <div className="sc-property-report-html-value sub">{info.WasteCollection.LandfillLocation_General}</div>
                <div className="sc-property-report-html-value">Hazardous Waste</div>
                <div className="sc-property-report-html-value sub">{info.WasteCollection.LandfillLocation_Hazardous}</div>
              </div>
            </div>
          </div>

          {/* SCHOOLS */}
          <div className="sc-property-report-html-heading icon general">SCHOOLS</div>
          <div className="sc-property-report-html-container">
            <div>
              <div>
                <div className="sc-property-report-html-label">Catholic Elementary: </div>
                <div className="sc-property-report-html-value">{info.Schools.CatholicElementry}</div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Catholic Secondary: </div>
                <div className="sc-property-report-html-value">{info.Schools.CatholicSecondary}</div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Catholic School Board Website: </div>
                <div className="sc-property-report-html-value">
                  <a rel="noopener noreferrer" href={info.Schools.CatholicBoardWebsiteURL} target="_blank">
                    {info.Schools.CatholicBoardWebsiteURL}
                  </a>
                </div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Public Elementary: </div>
                <div className="sc-property-report-html-value">{info.Schools.PublicElementry}</div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Public Secondary: </div>
                <div className="sc-property-report-html-value">{info.Schools.PublicSecondary}</div>
              </div>
            </div>
            <div>
              <div>
                <div className="sc-property-report-html-label">Public School Board Website: </div>
                <div className="sc-property-report-html-value">
                  <a rel="noopener noreferrer" href={info.Schools.PublicBoardWebsiteURL} target="_blank">
                    {info.Schools.PublicBoardWebsiteURL}
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
                <div className="sc-property-report-html-value">{info.Other.Library}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Closest Fire Hydrant: </div>
                <div className="sc-property-report-html-value">{info.Other.ClosestFireHydrant}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Municipal Admin Centre: </div>
                <div className="sc-property-report-html-value">{info.Other.MunicipalAdminCentre}</div>
              </div>
              <div>
                <div className="sc-property-report-html-label">Closest Hospital: </div>
                <div className="sc-property-report-html-value">{info.Other.ClosestHospital}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default PropertyReport;
