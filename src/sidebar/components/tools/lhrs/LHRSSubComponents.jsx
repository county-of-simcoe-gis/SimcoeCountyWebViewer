import React from "react";

export const LHRSPoint = props => {
    const inputMsg = "";
    return (
        <div className="sc-container">
    
        <LHRSRow label="Lat" 
                value={props.lat} 
                onChange={() => {}}
                inputId="sc-lhrs-lat" 
                readOnly={true}
                placeholer={inputMsg} />
        <LHRSRow label="Long" 
                value={props.long} 
                onChange={() => {}}
                inputId="sc-lhrs-long" 
                readOnly={true}
                placeholer={inputMsg} />
        <LHRSRow label="Hwy" 
                value={props.hwy} 
                inputId="sc-lhrs-hwy" 
                readOnly={true}
                placeholer={inputMsg} />
        <LHRSRow label="M Distance (km)" 
                value={props.m_distance} 
                onChange={() => {}}
                inputId="sc-lhrs-distance" 
                readOnly={true}
                placeholer={inputMsg} />
        <LHRSRow label="Basepoint" 
                value={props.basepoint} 
                onChange={() => {}}
                inputId="sc-lhrs-basepoint" 
                readOnly={true}
                placeholer={inputMsg} />
        <LHRSRow label="Offset (km)" 
                value={props.offset} 
                onChange={() => {}}
                inputId="sc-lhrs-offset" 
                readOnly={true}
                placeholer={inputMsg} />
        <LHRSRow label="CL Offset (m)" 
                value={props.snapped_distance} 
                onChange={() => {}}
                inputId="sc-lhrs-snapped" 
                readOnly={true}
                placeholer={inputMsg} />
    </div>);
};

export const LHRSRow = props => {
    return (
        <div className="sc-lhrs-row sc-arrow">
        <label>{props.label}:</label>
        <span>{props.value === null ? "" : props.value}</span>
        </div>
    );
};



export const LHRSInputRow = props => {
    return (
        <div className={"sc-lhrs-row sc-arrow" + (props.hidden ? " sc-hidden" : "")}>
        <label>{props.label}:</label>
        <span>
            <input
            id={props.inputId}
            value={props.value === null ? "" : props.value}
            className="sc-lhrs-input"
            type="text"
            placeholder={props.placeholer}
            onChange={props.onChange}
            readOnly={props.readOnly}
            onFocus={props.onFocus}
            onBlur={props.onBlur}
            onKeyDown={evt => {
                if (evt.key === "Enter") props.onEnterKey();
              }}
            />
        </span>
        </div>
    );
};