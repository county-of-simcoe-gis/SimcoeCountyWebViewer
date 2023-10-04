import React from "react";
import Select from "react-select";
import localConfig from "./config.json";

export const LHRSPoint = (props) => {
  const inputMsg = "";
  return (
    <div className="sc-container">
      <LHRSRow
        label="Lat / Long"
        value={props.lat === null || props.long === null ? "" : props.lat + " / " + props.long}
        onChange={() => {}}
        inputId="sc-lhrs-lat"
        readOnly={true}
        placeholer={inputMsg}
      />

      <LHRSRow
        label="LHRS - Basepoint / Offset (km)"
        value={props.basepoint === null || props.offset === null ? "" : props.basepoint + " / " + props.offset}
        onChange={() => {}}
        inputId="sc-lhrs-basepoint"
        readOnly={true}
        placeholer={inputMsg}
      />
      <LHRSRow
        label="LHRS - Hwy / M Dist. (km)"
        value={props.hwy === null || props.m_distance === null ? "" : props.hwy + " / " + props.m_distance}
        inputId="sc-lhrs-hwy"
        readOnly={true}
        placeholer={inputMsg}
      />

      <LHRSRow
        label="CLRS - Route ID / M Dist. (km)"
        value={props.clrs_route === null || props.clrs_distance === null ? "" : props.clrs_route + " / " + parseFloat(props.clrs_distance).toFixed(3)}
        onChange={() => {}}
        inputId="sc-lhrs-clrs-route"
        readOnly={true}
        placeholer={inputMsg}
      />
      <LHRSRow
        label="Smart CL - Route ID / Twp / Chainage"
        value={props.smartcl_twp && props.smartcl_route && props.smartcl_chainage ? props.smartcl_route + " / " + props.smartcl_twp + " / " + props.smartcl_chainage : ""}
        onChange={() => {}}
        inputId="sc-lhrs-smartcl-twp"
        readOnly={true}
        placeholer={inputMsg}
      />
    </div>
  );
};

export const LHRSGroupRow = (props) => {
  return (
    <div className="sc-lhrs-row sc-arrow">
      <label>
        {props.label1} / {props.label2}:
      </label>
      <span>
        {props.value1 === null ? "" : props.value1} / {props.value2 === null ? "" : props.value2}
      </span>
    </div>
  );
};

export const LHRSRow = (props) => {
  return (
    <div className="sc-lhrs-row sc-lhrs-info">
      <label>{props.label}:</label>
      <span className={!props.value || props.value === "" ? "sc-hidden" : "sc-arrow"}>{props.value === null ? "" : props.value}</span>
    </div>
  );
};
export const LHRSActions = (props) => {
  return (
    <div className="sc-lhrs-row sc-float-right">
      [&nbsp;
      <span className="sc-fakeLink" onClick={props.onAddToMyMap}>
        add to my map
      </span>
      &nbsp;]
    </div>
  );
};

export const SmartCLReportLink = (props) => {
  const reportConfig = localConfig.smartcl;
  const url = `${reportConfig.report_url}?${reportConfig.params.startX}=${props.startX}&${reportConfig.params.startY}=${props.startY}&${reportConfig.params.endX}=${props.endX}&${reportConfig.params.endY}=${props.endY}&${reportConfig.params.hwy}=${props.hwy}`;

  return (
    <div className="sc-lhrs-row sc-arrow">
      <label>{props.label}:</label>
      <span>
        <a href={url} rel="noopener noreferrer" target="_blank">
          {props.label}
        </a>
      </span>
    </div>
  );
};

export const LHRSInputRow = (props) => {
  return (
    <div className={"sc-lhrs-row sc-arrow" + (props.hidden ? " sc-hidden" : "")}>
      <label>{props.label}:</label>
      <span>
        <input
          id={props.inputId}
          value={props.value === null ? "" : props.value}
          className={!props.readOnly ? "sc-editable sc-lhrs-input" : "sc-lhrs-input"}
          type="text"
          placeholder={props.placeholer}
          onChange={props.onChange}
          readOnly={props.readOnly}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
          onKeyDown={(evt) => {
            if (evt.key === "Enter") props.onEnterKey();
          }}
        />
      </span>
    </div>
  );
};

export const LHRSSelect = (props) => {
  return (
    <div className={"sc-lhrs-row sc-arrow" + (props.hidden ? " sc-hidden" : "")}>
      <label>{props.label}:</label>
      <span>
        <Select
          id={props.inputId}
          onChange={props.onChange}
          options={props.options}
          value={props.value}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
          className="sc-lhrs-select"
          onKeyDown={(evt) => {
            if (evt.key === "Enter") props.onEnterKey();
          }}
        />
      </span>
    </div>
  );
};
