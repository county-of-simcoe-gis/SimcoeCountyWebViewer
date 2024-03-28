import { Item as MenuItem } from "rc-menu";
import { FloatingMenuItem } from "../../../../helpers/FloatingMenu.jsx";
import * as drawingHelpers from "../../../../helpers/drawingHelpers";
import * as helpers from "../../../../helpers/helpers.js";

const onReportProblem = (id) => {
  const feedbackTemplate = (feedbackUrl, xmin, xmax, ymin, ymax, centerx, centery, scale, myMapsId, featureId) =>
    `${feedbackUrl}/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}&REPORT_PROBLEM=True&MY_MAPS_ID=${myMapsId}&MY_MAPS_FEATURE_ID=${featureId}`;

  drawingHelpers.exportMyMaps((result) => {
    // APP STATS
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      helpers.addAppStat("Report Problem", "My Maps Toolbox");

      const scale = helpers.getMapScale();
      const extent = window.map.getView().calculateExtent(window.map.getSize());
      const xmin = extent[0];
      const xmax = extent[1];
      const ymin = extent[2];
      const ymax = extent[3];
      const center = window.map.getView().getCenter();

      let feedbackUrl = feedbackTemplate(window.config.feedbackUrl, xmin, xmax, ymin, ymax, center[0], center[1], scale, result.id, id);
      if (window.config.mapId !== null && window.config.mapId !== undefined && window.config.mapId.trim() !== "") feedbackUrl += "&MAP_ID=" + window.config.mapId;

      helpers.showURLWindow(feedbackUrl, false, "full");
    });
  }, id);
};

export const action = (props) => {
  const { action, item } = props;
  switch (action) {
    case "sc-floating-menu-report-problem":
      onReportProblem(item.id);
      break;
    default:
      break;
  }
};

export const component = (props) => {
  return (
    <MenuItem
      className={window.config.drawingOptionsToolsMenuVisibility["sc-floating-menu-report-problem"] ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"}
      key={"sc-floating-menu-report-problem"}
    >
      <FloatingMenuItem imageName={"error.png"} label="Report a Problem" />
    </MenuItem>
  );
};
