import * as helpers from "../../helpers/helpers.js";
import InfoRow from "../../helpers/InfoRow.jsx";

export const fetchData = (props) => {
  const { arn, data } = props;
  return new Promise((resolve, reject) => {
    resolve({ sample_data: "THIS IS SAMPLE DATA" });
  });
};

export const dataRows = (props) => {
  let { arn, rows, area, geom } = props;

  rows.push(<InfoRow key={helpers.getUID()} label={"SAMPLE DATA"} value={props.sample_data} />);

  return rows;
};

export const content = (props) => {
  let { arn } = props;
  return (
    <button
      key={helpers.getUID()}
      id={helpers.getUID()}
      className={"sc-button"}
      onClick={() => {
        helpers.showMessage("Additional Button Clicked");
      }}
    >
      Additional Button
    </button>
  );
};
export const arnExtension = (props) => {
  const { arn } = props;
  return (
    <img
      src={images["searchAddresses.png"]}
      alt="Sample Button"
      title="Sample Button"
      style={{ marginBottom: "-3px", marginLeft: "5px", cursor: "pointer" }}
      onClick={() => {
        helpers.showMessage("Sample Button Clicked");
      }}
    />
  );
};

// IMPORT ALL IMAGES
import { createImagesObject } from "../../helpers/imageHelper";
const images = createImagesObject(
  import.meta.glob('../images/*.{png,jpg,jpeg,svg,gif}', { eager: true, query: '?url', import: 'default' })
);
