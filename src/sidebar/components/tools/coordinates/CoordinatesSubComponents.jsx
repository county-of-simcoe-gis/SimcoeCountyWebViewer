import React from "react";

const inputMsg = "(listening for input)";
export const LiveCoordinates = props => {
  return (
    <div>
      <div className="sc-title">Live Coordinates</div>

      <div className="sc-description">Live coordinates of your current pointer/mouse position.</div>

      <div className="sc-container">
        <div className="sc-coordinates-row sc-arrow">
          <label>X Coordinate:</label>
          <span>{props.liveWebMercatorCoords === null ? inputMsg : props.liveWebMercatorCoords[0]}</span>
        </div>

        <div className="sc-coordinates-row sc-arrow">
          <label>Y Coordinate:</label>
          <span>{props.liveWebMercatorCoords === null ? inputMsg : props.liveWebMercatorCoords[1]}</span>
        </div>

        <div className="sc-coordinates-divider">&nbsp;</div>

        <div className="sc-coordinates-row sc-arrow">
          <label>Latitude:</label>
          <span>{props.liveLatLongCoords === null ? inputMsg : props.liveLatLongCoords[1]}</span>
        </div>

        <div className="sc-coordinates-row sc-arrow">
          <label>Longitude:</label>
          <span>{props.liveLatLongCoords === null ? inputMsg : props.liveLatLongCoords[0]}</span>
        </div>
      </div>
    </div>
  );
};

export const MapExtent = props => {
  return (
    <div className="sc-container">
      <div className="sc-coordinates-row sc-arrow">
        <label>Min X:</label>
        <span>{props.extentMinX === null ? inputMsg : props.extentMinX}</span>
      </div>

      <div className="sc-coordinates-row sc-arrow">
        <label>Max X:</label>
        <span>{props.extentMaxX === null ? inputMsg : props.extentMaxX}</span>
      </div>

      <div className="sc-coordinates-row sc-arrow">
        <label>Min Y:</label>
        <span>{props.extentMinY === null ? inputMsg : props.extentMinY}</span>
      </div>

      <div className="sc-coordinates-row sc-arrow">
        <label>Max Y:</label>
        <span>{props.extentMaxY === null ? inputMsg : props.extentMaxY}</span>
      </div>
    </div>
  );
};

export const CustomCoordinates = props => {
  return (
    <div>
      <div className="sc-coordinates-heading">{props.title}</div>
      <CoordinateRow label="X Coordinate" value={props.valueX} onChange={props.onChangeX} inputId={props.inputIdX} onEnterKey={props.onZoomClick} />
      <CoordinateRow label="Y Coordinate" value={props.valueY} onChange={props.onChangeY} inputId={props.inputIdY} onEnterKey={props.onZoomClick} />
      <CoordinateActions onZoomClick={props.onZoomClick} onMyMapsClick={() => props.onMyMapsClick(props.valueX, props.valueY)} />
    </div>
  );
};

export const CoordinateActions = props => {
  return (
    <div className="sc-coordinates-row">
      <label>&nbsp;</label>[{" "}
      <span className="sc-fakeLink" onClick={props.onZoomClick}>
        zoom
      </span>{" "}
      ] [{" "}
      <span className="sc-fakeLink" onClick={props.onMyMapsClick}>
        add to my Maps
      </span>{" "}
      ]
    </div>
  );
};

export const CoordinateRow = props => {
  return (
    <div className="sc-coordinates-row sc-arrow">
      <label>{props.label + ":"}:</label>
      <span>
        <input
          id={props.inputId}
          value={props.value === null ? "" : props.value}
          className="sc-coordinates-input"
          type="text"
          placeholder={inputMsg}
          onChange={props.onChange}
          onKeyDown={evt => {
            if (evt.key === "Enter") props.onEnterKey();
          }}
        />
      </span>
    </div>
  );
};
