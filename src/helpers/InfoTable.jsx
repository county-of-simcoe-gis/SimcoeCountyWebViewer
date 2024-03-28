import React from "react";
import * as helpers from "./helpers";
import "./InfoTable.css";

export const InfoTable = (props) => {
  const { info } = props;
  if (!info) return <div>No results found.</div>;
  return (
    <table className="sc-info-table">
      <thead>
        <InfoTableHeaderRow key={helpers.getUID()} info={info[0]} />
      </thead>
      <tbody>
        {info.map((item) => (
          <InfoTableRow key={helpers.getUID()} info={item} />
        ))}
      </tbody>
    </table>
  );
};
export default InfoTable;

const InfoTableHeaderRow = (props) => {
  return (
    <tr>
      {Object.keys(props.info).map((key) => (
        <th key={helpers.getUID()} style={{ border: "1px solid black", padding: "5px 5px" }}>
          {key}
        </th>
      ))}
    </tr>
  );
};

const InfoTableRow = (props) => {
  return (
    <tr>
      {Object.values(props.info).map((val) => (
        <td key={helpers.getUID()} style={{ border: "1px solid black", padding: "5px 5px" }}>
          {val}
        </td>
      ))}
    </tr>
  );
};
