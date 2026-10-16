"use client";

import React, { useEffect, useState } from "react";
import { useMyMapsStore } from "@/stores/myMapsStore";
import { SINGLE_SEGMENT_DRAW_TYPES, useMyMapsTextEntryStore } from "@/stores/myMapsTextEntryStore";
import { destinationPoint, formatLatLon, getMinimumPathPoints, parseBearing, parseDistance, supportsTextEntry, unitsToMeters, type TextEntryUnit } from "@/utils/myMapsTextEntry";

const UNIT_OPTIONS: TextEntryUnit[] = ["m", "km", "ft", "mi"];

const MyMapsTextEntry: React.FC = () => {
  const drawType = useMyMapsStore((s) => s.drawType);
  const setDrawType = useMyMapsStore((s) => s.setDrawType);

  const enabled = useMyMapsTextEntryStore((s) => s.enabled);
  const unit = useMyMapsTextEntryStore((s) => s.unit);
  const points = useMyMapsTextEntryStore((s) => s.points);
  const segments = useMyMapsTextEntryStore((s) => s.segments);
  const error = useMyMapsTextEntryStore((s) => s.error);
  const setEnabled = useMyMapsTextEntryStore((s) => s.setEnabled);
  const setUnit = useMyMapsTextEntryStore((s) => s.setUnit);
  const addPoint = useMyMapsTextEntryStore((s) => s.addPoint);
  const undo = useMyMapsTextEntryStore((s) => s.undo);
  const finish = useMyMapsTextEntryStore((s) => s.finish);
  const complete = useMyMapsTextEntryStore((s) => s.complete);
  const setError = useMyMapsTextEntryStore((s) => s.setError);

  const [bearingInput, setBearingInput] = useState("");
  const [distanceInput, setDistanceInput] = useState("");
  const [heightInput, setHeightInput] = useState("");

  useEffect(() => {
    setBearingInput("");
    setDistanceInput("");
    setHeightInput("");
  }, [drawType]);

  if (!supportsTextEntry(drawType)) return null;

  const hasStart = points.length > 0;
  const isCircle = drawType === "Circle";
  const isRectangle = drawType === "Rectangle";
  const isSingleSegment = SINGLE_SEGMENT_DRAW_TYPES.includes(drawType);
  const isPath = !isCircle && !isRectangle;
  const canFinish = isPath && !isSingleSegment && points.length >= getMinimumPathPoints(drawType);

  const submitSegment = () => {
    const bearing = parseBearing(bearingInput);
    const distance = parseDistance(distanceInput);
    if (bearing === null) {
      setError("Enter a bearing from 0 to 360 degrees.");
      return;
    }
    if (distance === null) {
      setError("Enter a distance greater than 0.");
      return;
    }

    const lastPoint = points[points.length - 1];
    addPoint(destinationPoint(lastPoint, bearing, unitsToMeters(distance, unit)), { bearing, distance, unit });
    setBearingInput("");
    setDistanceInput("");
  };

  const submitCircle = () => {
    const radius = parseDistance(distanceInput);
    if (radius === null) {
      setError("Enter a radius greater than 0.");
      return;
    }
    complete({ kind: "circle", center: points[0], radiusM: unitsToMeters(radius, unit) });
  };

  const submitRectangle = () => {
    const width = parseDistance(distanceInput);
    const height = parseDistance(heightInput);
    if (width === null || height === null) {
      setError("Enter a width and height greater than 0.");
      return;
    }
    complete({ kind: "rectangle", corner: points[0], widthM: unitsToMeters(width, unit), heightM: unitsToMeters(height, unit) });
  };

  const handleSubmit = () => {
    if (isCircle) {
      submitCircle();
    } else if (isRectangle) {
      submitRectangle();
    } else {
      submitSegment();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    if (canFinish && bearingInput.trim() === "" && distanceInput.trim() === "") {
      finish();
    } else {
      handleSubmit();
    }
  };

  const submitLabel = isPath && !isSingleSegment ? "Next" : "Submit";

  let statusText = "Click the start point on the map.";
  if (hasStart && isCircle) statusText = "Enter the radius.";
  if (hasStart && isRectangle) statusText = "Enter the width and height from the start corner.";
  if (hasStart && isPath) statusText = "Enter the bearing (true north) and distance to the next point.";

  return (
    <div
      data-testid="mymaps-text-entry"
      className="flex flex-col gap-2 p-2 bg-base-200 border-b border-base-300 text-xs"
      onKeyDown={(e) => {
        if (e.key === "Escape") setDrawType("Cancel");
      }}
    >
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="toggle toggle-xs toggle-primary" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <span>Keyboard entry</span>
      </label>

      {enabled && (
        <>
          <p className="text-base-content/70">{statusText}</p>

          {hasStart && (
            <ol data-testid="mymaps-text-entry-history" className="flex flex-col gap-0.5 max-h-32 overflow-y-auto text-base-content/80">
              <li>
                {isCircle ? "Center" : isRectangle ? "Corner" : "Start"}: {formatLatLon(points[0])}
              </li>
              {segments.map((segment, index) => (
                <li key={index}>
                  {index + 1}. {segment.bearing}° {segment.distance} {segment.unit} to {formatLatLon(points[index + 1])}
                </li>
              ))}
            </ol>
          )}

          {hasStart && (
            <div className="flex flex-wrap items-end gap-2">
              {isPath && (
                <label className="flex flex-col gap-0.5">
                  Bearing (°)
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input input-xs input-bordered w-20"
                    value={bearingInput}
                    onChange={(e) => setBearingInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                  />
                </label>
              )}
              <label className="flex flex-col gap-0.5">
                {isCircle ? "Radius" : isRectangle ? "Width" : "Distance"}
                <input
                  type="text"
                  inputMode="decimal"
                  className="input input-xs input-bordered w-20"
                  value={distanceInput}
                  onChange={(e) => setDistanceInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                />
              </label>
              {isRectangle && (
                <label className="flex flex-col gap-0.5">
                  Height
                  <input
                    type="text"
                    inputMode="decimal"
                    className="input input-xs input-bordered w-20"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                  />
                </label>
              )}
              <label className="flex flex-col gap-0.5">
                Units
                <select className="select select-xs select-bordered" value={unit} onChange={(e) => setUnit(e.target.value as TextEntryUnit)}>
                  {UNIT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {error && (
            <p role="alert" className="text-error">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-1">
            {hasStart && (
              <button type="button" className="btn btn-xs btn-primary" onClick={handleSubmit}>
                {submitLabel}
              </button>
            )}
            {hasStart && isPath && !isSingleSegment && (
              <>
                <button type="button" className="btn btn-xs" onClick={undo} disabled={points.length <= 1}>
                  Undo
                </button>
                <button type="button" className="btn btn-xs btn-primary" onClick={finish} disabled={!canFinish}>
                  Finish
                </button>
              </>
            )}
            <button type="button" className="btn btn-xs" onClick={() => setDrawType("Cancel")}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MyMapsTextEntry;
