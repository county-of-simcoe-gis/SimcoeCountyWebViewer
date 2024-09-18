import React, { useState, useRef, useEffect, Fragment } from "react";
// import GitHubButton from "react-github-btn";
import GitHubButton from "../components/sc-github-btn";
//OPENLAYERS
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import { Icon, Style } from "ol/style.js";
import { Vector as VectorSource } from "ol/source.js";
import Point from "ol/geom/Point";
import { Vector as VectorLayer } from "ol/layer";
import Feature from "ol/Feature";
import { MouseWheelZoom } from "ol/interaction";
import { fromLonLat, transform } from "ol/proj";

import "./SCMap.css";
import "./OLOverrides.css";
import "./Navigation";
import Navigation from "./Navigation";
import { defaults as defaultInteractions, PinchRotate, DragRotate } from "ol/interaction.js";
import Popup from "../helpers/Popup.jsx";
import FooterTools from "./FooterTools.jsx";
import { defaults as defaultControls, ScaleLine, FullScreen, Rotate } from "ol/control.js";
//import BasemapSwitcher from "./BasemapSwitcher";
// Bap is the new control which is rendered base on the options passed from the DB map settings
import BMap from "./BMap";
import PropertyReportClick from "./PropertyReportClick.jsx";

import FloatingMenu, { FloatingMenuItem } from "../helpers/FloatingMenu.jsx";
import { Item as MenuItem } from "rc-menu";
import Portal from "../helpers/Portal.jsx";
import * as helpers from "../helpers/helpers";
import Identify from "./Identify";
import alertify from "alertifyjs";
import AttributeTable from "../helpers/AttributeTable.jsx";
import FloatingImageSlider from "../helpers/FloatingImageSlider.jsx";
import { fetchExtensions } from "./extensions/_loader.js";

const SCMap = (props) => {
  const scaleLineControl = new ScaleLine({
    minWidth: 80,
  });
  const feedbackTemplate = (url, xmin, xmax, ymin, ymax, centerx, centery, scale) =>
    `${url}/?xmin=${xmin}&xmax=${xmax}&ymin=${ymin}&ymax=${ymax}&centerx=${centerx}&centery=${centery}&scale=${scale}&REPORT_PROBLEM=True`;
  const googleMapsTemplate = (pointx, pointy) => `https://www.google.com/maps?q=${pointy},${pointx}`;

  const [mapClassName, setMapClassName] = useState("sc-map");
  const [mapBottom, setMapBottom] = useState(0);
  const storageMapDefaultsKeyRef = useRef("Map Defaults");
  const contextCoordsRef = useRef(null);
  const storageExtentKeyRef = useRef("Map Extent");
  const identifyIconLayerRef = useRef(null);
  const initialLoadRef = useRef(false);
  const [gitHubFollowHandle, setGitHubFollowHandle] = useState(null);
  const [gitHubFollowUrl, setGitHubFollowUrl] = useState(null);
  const [gitHubFollowHandleLabel, setGitHubFollowHandleLabel] = useState(null);
  const extensions = useRef([]);
  const propertyClickExtensions = useRef([]);
  const rightClickExtensions = useRef([]);

  const addExtension = (fetchData, dataRows, content, arnExtension, actions, order, type) => {
    extensions.current.push({ fetchData, dataRows, content, arnExtension, actions, order, type });
  };

  useEffect(() => {
    fetchExtensions({ addExtension: addExtension }, () => {
      extensions.current = helpers.sortByKey(extensions.current.concat([]), "order");
      propertyClickExtensions.current = extensions.current.filter((ext) => ext.type === "property-click");
      rightClickExtensions.current = extensions.current.filter((ext) => ext.type === "right-click");
    });
    // LISTEN FOR TOC TO LOAD
    const tocLoadedListener = window.emitter.addListener("tocLoaded", () => handleUrlParameters());
    // LISTEN FOR ATTRIBUTE TABLE SIZE
    const attributeTableResizeListener = window.emitter.addListener("attributeTableResize", (height) => onAttributeTableResize(height));
    // CLEAR IDENTIFY MARKER AND RESULTS
    const clearIdentifyListener = window.emitter.addListener("clearIdentify", () => clearIdentify());
    const sidebarChangedListner = window.emitter.addListener("sidebarChanged", (isSidebarOpen) => sidebarChanged(isSidebarOpen));
    const keydownListener = document.addEventListener("keydown", function (e) {
      if (e.srcElement.type !== "text" && e.srcElement.type !== "textarea")
        if (e.shiftKey && e.code === "ArrowLeft") {
          helpers.addAppStat("ExtentHistory", "Keyboard Shortcut Previous");
          helpers.extentHistory("previous");
        } else if (e.srcElement.type !== "text" && e.shiftKey && e.code === "ArrowRight") {
          helpers.addAppStat("ExtentHistory", "Keyboard Shortcut Next");
          helpers.extentHistory("next");
        }
    });
    var map = new Map({
      controls: defaultControls(),
      layers: [],
      target: "map",
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
      interactions: defaultInteractions({
        keyboard: true,
        mouseWheelZoom: false,
      }).extend([
        new MouseWheelZoom({
          duration: 0,
          constrainResolution: true,
        }),
      ]),
      keyboardEventTarget: document,
    });

    helpers.addIsLoaded("map_control");

    helpers.waitForLoad(["settings", "map_control"], Date.now(), 30, () => {
      setGitHubFollowHandle(window.config.gitHubFollowHandle);
      setGitHubFollowUrl(window.config.gitHubFollowUrl);
      setGitHubFollowHandleLabel(window.config.gitHubFollowHandle + " on GitHub");
      // LISTEN FOR MAP CURSOR TO CHANGE
      if (!window.config.onlyStandardCursor) window.emitter.addListener("changeCursor", (cursorStyle) => changeCursor(cursorStyle));

      if (window.config.leftClickIdentify) {
        setMapClassName("sc-map identify");
      }
      let centerCoords = window.config.centerCoords;
      let defaultZoom = window.config.defaultZoom;
      const defaultsStorage = sessionStorage.getItem(storageMapDefaultsKeyRef.current);
      let extent = window.config.mapId !== null && window.config.mapId !== undefined && window.config.mapId.trim() !== "" ? null : helpers.getItemsFromStorage(storageExtentKeyRef.current);

      if (defaultsStorage !== null && (extent === undefined || extent === null)) {
        const defaults = JSON.parse(defaultsStorage);
        if (defaults.zoom !== undefined) defaultZoom = defaults.zoom;
        if (defaults.center !== undefined) centerCoords = defaults.center;
      }

      //UPDATE CONTROLS
      if (window.mapControls.scaleLine) helpers.addMapControl(map, "scaleLine", scaleLineControl); // Scale Line
      if (window.mapControls.fullScreen) helpers.addMapControl(map, "fullscreen"); // FullScreen
      if (window.mapControls.rotate) helpers.addMapControl(map, "rotate"); // Rotate
      map.getView().setZoom(defaultZoom); // Set Zoom
      map.getView().setCenter(centerCoords); // Set Center
      map.getView().setMaxZoom(window.config.maxZoom); // Set Max Zoom

      // Disable Rotate
      if (window.config.rotate === false) {
        map.removeInteraction(
          map
            .getInteractions()
            .getArray()
            .filter((i) => i instanceof PinchRotate)[0]
        );
        map.removeInteraction(
          map
            .getInteractions()
            .getArray()
            .filter((i) => i instanceof DragRotate)[0]
        );
      }

      // Disable Zoom Control
      if (!window.mapControls.zoomInOut) helpers.removeMapControl(map, "zoom");
      // Disable Rotate Control
      if (!window.mapControls.rotate) helpers.removeMapControl(map, "rotate");

      if (extent !== undefined && extent !== null) {
        map.getView().fit(extent, map.getSize());
      }

      window.map = map;
      window.popup = new Popup();
      window.map.addOverlay(window.popup);
      // PREVIOUS/NEXT EXTENT
      const initialZoom = window.map.getView().getZoom();
      const initialCenter = window.map.getView().getCenter();
      helpers.extentHistory("init", initialCenter, initialZoom);

      window.map.on("moveend", (e) => {
        helpers.extentHistory("save");
      });

      window.map.getViewport().addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        let disable = window.disableParcelClick || window.isDrawingOrEditing || window.isCoordinateToolOpen || window.isMeasuring;
        if (disable) return;
        contextCoordsRef.current = window.map.getEventCoordinate(evt);

        const menu = (
          <Portal>
            <FloatingMenu key={helpers.getUID()} buttonEvent={evt} onMenuItemClick={onMenuItemClick} autoY={true} autoX={true}>
              <MenuItem
                className={helpers.isMobile() || !window.config.rightClickMenuVisibility["sc-floating-menu-basic-mode"] ? "sc-hidden" : "sc-floating-menu-toolbox-menu-item"}
                key="sc-floating-menu-basic-mode"
              >
                <FloatingMenuItem imageName={"collased.png"} label="Switch To Basic" />
              </MenuItem>
              <MenuItem
                className={window.config.rightClickMenuVisibility["sc-floating-menu-property-click"] ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"}
                key="sc-floating-menu-property-click"
              >
                <FloatingMenuItem imageName={"report.png"} label="Property Report" />
              </MenuItem>
              <MenuItem className={window.config.rightClickMenuVisibility["sc-floating-menu-add-mymaps"] ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"} key="sc-floating-menu-add-mymaps">
                <FloatingMenuItem imageName={"point.png"} label="Add Marker Point" />
              </MenuItem>

              <MenuItem
                className={window.config.rightClickMenuVisibility["sc-floating-menu-save-map-extent"] ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"}
                key="sc-floating-menu-save-map-extent"
              >
                <FloatingMenuItem imageName={"globe-icon.png"} label="Save as Default Extent" />
              </MenuItem>
              <MenuItem
                className={window.config.rightClickMenuVisibility["sc-floating-menu-report-problem"] ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"}
                key="sc-floating-menu-report-problem"
              >
                <FloatingMenuItem imageName={"error.png"} label="Report a problem" />
              </MenuItem>
              <MenuItem className={window.config.rightClickMenuVisibility["sc-floating-menu-identify"] ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"} key="sc-floating-menu-identify">
                <FloatingMenuItem imageName={"identify.png"} label="Identify" />
              </MenuItem>
              <MenuItem className={window.config.rightClickMenuVisibility["sc-floating-menu-lhrs"] ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"} key="sc-floating-menu-lhrs">
                <FloatingMenuItem imageName={"toolbox.png"} label="LHRS" />
              </MenuItem>
              <MenuItem className={window.config.rightClickMenuVisibility["sc-floating-menu-google-maps"] ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"} key="sc-floating-menu-google-maps">
                <FloatingMenuItem imageName={"google.png"} label="View in Google Maps" />
              </MenuItem>
              {rightClickExtensions.current.map((ext) => {
                return <Fragment key={helpers.getUID()}>{ext.content()}</Fragment>;
              })}

              <MenuItem className={window.config.rightClickMenuVisibility["sc-floating-menu-more"] ? "sc-floating-menu-toolbox-menu-item" : "sc-hidden"} key="sc-floating-menu-more">
                <FloatingMenuItem imageName={"more-16.png"} label="More..." />
              </MenuItem>
            </FloatingMenu>
          </Portal>
        );

        window.portalRoot.render(menu);
      });

      // APP STAT
      helpers.addAppStat("STARTUP", "MAP_LOAD");

      // WARNING FOR IE
      var ua = window.navigator.userAgent;
      var msie = ua.indexOf("MSIE ");

      // eslint-disable-next-line
      if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
        // If Internet Explorer, return version number
        helpers.showURLWindow(window.config.ieWarningUrl);
      } else {
        if (helpers.isMobile()) {
          window.emitter.emit("setSidebarVisiblity", "CLOSE");
        }
      }

      // MAP LOADED
      window.map.once("rendercomplete", (event) => {
        if (!initialLoadRef.current) {
          window.emitter.emit("mapLoaded");
          helpers.addIsLoaded("map");
          initialLoadRef.current = true;
        }
      });

      window.map.on("change:size", () => {
        if (!window.isAttributeTableResizing) {
          window.emitter.emit("mapResize");
        }
      });
      addIdentifyLayer();
      // SHOW FEEDBACK ON TIMER
      if (window.config.showFeedbackMessageOnStartup !== undefined && window.config.showFeedbackMessageOnStartup) {
        setTimeout(() => {
          helpers.showMessage(
            "Feedback",
            <div>
              <label>Please provide us feedback! The feedback button is at top right of this window.</label>
              <span
                className="sc-fakeLink"
                style={{ display: "block" }}
                onClick={() => {
                  window.emitter.emit("feedback", null);
                }}
              >
                Provide Feedback now!
              </span>
            </div>,
            undefined,
            10000
          );
        }, 60000);
      }
      // SHOW TERMS
      if (window.config.termsUrl !== undefined && window.config.showTermsOnStartup) {
        helpers.showURLWindow(window.config.termsUrl, true, "full", true, true);
      }
      // SHOW WHATS NEW
      if (window.config.showWhatsNewOnStartup !== undefined && window.config.showWhatsNewOnStartup && window.config.whatsNewUrl) {
        helpers.showURLWindow(window.config.whatsNewUrl, true, "full", true, true);
      }
      // SHOW WHATS NEW NOTICE
      if (window.config.showWhatsNewPopupOnStartup !== undefined && window.config.showWhatsNewPopupOnStartup && window.config.whatsNewUrl) {
        const showWhatsNewMessage = () => {
          helpers.showMessage(
            "What's New!",
            <div>
              <span
                className="sc-fakeLink"
                style={{ display: "block" }}
                onClick={() => {
                  helpers.showURLWindow(window.config.whatsNewUrl, true, "normal", true, true);
                }}
              >
                Click here to see what's changed
              </span>
            </div>,
            undefined,
            10000
          );
        };
        try {
          const saved = helpers.getItemsFromStorage(window.config.storageKeys.URLDontShowAgain);
          if (saved !== null && saved !== undefined) {
            if (!saved.find((item) => (item.url !== undefined ? item.url.toLowerCase() === window.config.whatsNewUrl.toLowerCase() : false))) {
              showWhatsNewMessage();
            }
          } else {
            showWhatsNewMessage();
          }
        } catch (e) {
          helpers.saveToStorage(window.config.storageKeys.URLDontShowAgain, []);
          console.log(e);
        }
      }
      // ATTRIBUTE TABLE TESTING
      // window.emitter.emit("openAttributeTable", "https://opengis.simcoe.ca/geoserver/", "simcoe:Airport");

      // MAP NOTIFICAITONS

      if (window.config.pushMapNotifications) {
        pushMapNotifications();
      }
    });
    return () => {
      window.emitter.removeListener("tocLoaded", () => handleUrlParameters());
      window.emitter.removeListener("attributeTableResize", (height) => onAttributeTableResize(height));
      window.emitter.removeListener("clearIdentify", () => clearIdentify());
      window.emitter.removeListener("sidebarChanged", (isSidebarOpen) => sidebarChanged(isSidebarOpen));
      // tocLoadedListener.remove();
      // attributeTableResizeListener.remove();
      // clearIdentifyListener.remove();
      // sidebarChangedListner.remove();
      document.removeEventListener("keydown", keydownListener);
    };
  }, []);

  useEffect(() => {
    helpers.waitForLoad("map", Date.now(), 30, () => {
      window.map.updateSize();
    });
  }, [mapClassName]);

  const changeCursor = (cursorStyle) => {
    let cursorStyles = ["standard", "identify", "draw"];
    cursorStyles.splice(cursorStyles.indexOf(cursorStyle), 1);
    let classes = mapClassName.split(" ");
    if (classes.indexOf(cursorStyle) === -1) {
      cursorStyles.forEach((styleName) => {
        if (classes.indexOf(styleName) !== -1) classes.splice(classes.indexOf(styleName), 1);
      });
      classes.push(cursorStyle);
      setMapClassName(classes.join(" "));
    }
  };

  const onAttributeTableResize = (height) => {
    setMapBottom(Math.abs(height));
    window.map.updateSize();
  };

  const pushMapNotifications = () => {
    const apiUrl = window.config.apiUrl + "getMapNotifications/";
    const pushMapNotificationIDs = window.config.pushMapNotificationIDs !== undefined && window.config.pushMapNotificationIDs !== null ? window.config.pushMapNotificationIDs : [];
    pushMapNotificationIDs.push(0);
    helpers.getJSON(apiUrl, (result) => {
      const filteredResult = result.filter(function (e) {
        return this.indexOf(e.id) >= 0;
      }, pushMapNotificationIDs);

      filteredResult.forEach((message, i) => {
        setTimeout(function () {
          const message_text = message.message;
          const notify_color = message.notify_type;
          const screen_time = message.screen_time;

          switch (notify_color) {
            case "green":
              alertify.success(message_text, screen_time);
              break;
            case "red":
              alertify.error(message_text, screen_time);
              break;
            case "cream":
              alertify.warning(message_text, screen_time);
              break;
            case "white":
              alertify.message(message_text, screen_time);
              break;
            default:
              alertify.message(message_text, screen_time);
          }
        }, i * 2000);
      });
    });
  };

  const handleUrlParameters = () => {
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      const storage = window.config.mapId !== null && window.config.mapId !== undefined && window.config.mapId.trim() !== "" ? undefined : helpers.getItemsFromStorage(storageExtentKeyRef.current);

      // GET URL PARAMETERS (ZOOM TO XY)
      const x = helpers.getURLParameter("X");
      const y = helpers.getURLParameter("Y");
      const sr = helpers.getURLParameter("SR") === null ? "WEB" : helpers.getURLParameter("SR");
      const id = helpers.getURLParameter("ID");

      // GET URL PARAMETERS (ZOOM TO EXTENT)
      const xmin = helpers.getURLParameter("XMIN");
      const ymin = helpers.getURLParameter("YMIN");
      const xmax = helpers.getURLParameter("XMAX");
      const ymax = helpers.getURLParameter("YMAX");
      const urlNG911ID = helpers.getURLParameter("NG911ID");
      if (urlNG911ID !== null) {
        const ng911UrlTemplate = (mainURL, id) => `${mainURL}&cql_filter=NGUID='${id}'`;
        let ng911Url = "https://giswebdev.simcoe.ca/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=simcoe:Civic_Address_Point_Lookup&outputFormat=application/json";
        const ng911IDUrl = ng911UrlTemplate(ng911Url, urlNG911ID);
        helpers.getJSON(ng911IDUrl, (result) => {
          if (result?.features[0]) {
            const feature = helpers.getFeatureFromGeoJSON(result?.features[0]);
            const iconStyle = new Style({
              image: new Icon({
                anchor: [0.5, 1],
                src: images["identify-marker.png"],
              }),
            });
            feature.setStyle(iconStyle);
            identifyIconLayerRef.current.getSource().clear();
            window.map.removeLayer(identifyIconLayerRef.current);
            identifyIconLayerRef.current.getSource().addFeature(feature);
            window.map.addLayer(identifyIconLayerRef.current);
            helpers.zoomToFeature(feature);
          }
        });
      }
      if (x !== null && y !== null) {
        // URL PARAMETERS (ZOOM TO XY)
        let coords = [x, y];
        if (sr && sr.toUpperCase() === "WGS84") coords = fromLonLat([Math.round(x * 100000) / 100000, Math.round(y * 100000) / 100000]);
        if (id === "true" || (window.config.onCoordinateZoomID !== undefined && window.config.onCoordinateZoomID !== null && window.config.onCoordinateZoomID)) {
          const iconFeature = new Feature({
            geometry: new Point(coords),
          });

          const iconStyle = new Style({
            image: new Icon({
              anchor: [0.5, 1],
              src: images["identify-marker.png"],
            }),
          });

          iconFeature.setStyle(iconStyle);
          identifyIconLayerRef.current.getSource().clear();
          window.map.removeLayer(identifyIconLayerRef.current);
          identifyIconLayerRef.current.getSource().addFeature(iconFeature);
          window.map.addLayer(identifyIconLayerRef.current);
        }
        setTimeout(() => {
          helpers.flashPoint(coords);
        }, 1000);
      } else if (xmin !== null && ymin !== null && xmax !== null && ymax !== null) {
        //URL PARAMETERS (ZOOM TO EXTENT)
        const extent = [parseFloat(xmin), parseFloat(ymin), parseFloat(xmax), parseFloat(ymax)];
        window.map.getView().fit(extent, window.map.getSize(), { duration: 1000 });
      } else if (storage !== null && storage !== undefined) {
        // ZOOM TO SAVED EXTENT

        window.map.getView().fit(storage, window.map.getSize(), { duration: 1000 });
      }

      window.emitter.emit("mapParametersComplete");
    });
  };

  const onMenuItemClick = (key) => {
    switch (key) {
      case "sc-floating-menu-zoomin":
        window.map.getView().setZoom(window.map.getView().getZoom() + 1);
        break;
      case "sc-floating-menu-zoomout":
        window.map.getView().setZoom(window.map.getView().getZoom() - 1);
        break;
      case "sc-floating-menu-property-click":
        window.emitter.emit("showPropertyReport", contextCoordsRef.current);
        break;
      case "sc-floating-menu-add-mymaps":
        addMyMaps();
        break;
      case "sc-floating-menu-save-map-extent":
        saveMapExtent();
        break;
      case "sc-floating-menu-report-problem":
        reportProblem();
        break;
      case "sc-floating-menu-identify":
        identify();
        break;
      case "sc-floating-menu-lhrs":
        lhrs();
        break;
      case "sc-floating-menu-google-maps":
        googleLink();
        break;
      case "sc-floating-menu-more":
        moreOptions();
        break;
      case "sc-floating-menu-basic-mode":
        basicMode();
        break;

      default:
        break;
    }
    rightClickExtensions.current.forEach((ext) => {
      ext.actions({ action: key, geom: new Point(contextCoordsRef.current) });
    });

    helpers.addAppStat("Right Click", key);
  };

  const basicMode = () => {
    window.emitter.emit("setSidebarVisiblity", "CLOSE");
  };

  const moreOptions = () => {
    // EMIT A CHANGE IN THE SIDEBAR (IN OR OUT)
    window.emitter.emit("setSidebarVisiblity", "CLOSE");

    // OPEN MORE MENU
    window.emitter.emit("openMoreMenu");
  };
  const lhrs = () => {
    window.emitter.emit("activateSidebarItem", "LHRS", "tools", contextCoordsRef.current);
    console.log(contextCoordsRef.current);
  };

  const clearIdentify = () => {
    // CLEAR PREVIOUS IDENTIFY RESULTS
    identifyIconLayerRef.current.getSource().clear();
    window.map.removeLayer(identifyIconLayerRef.current);
    window.emitter.emit("loadReport", <div />);
  };

  const addIdentifyLayer = () => {
    helpers.waitForLoad(["settings", "map"], Date.now(), 30, () => {
      identifyIconLayerRef.current = new VectorLayer({
        name: "sc-identify",
        source: new VectorSource({
          features: [],
        }),
        zIndex: 100000,
      });
      identifyIconLayerRef.current.setStyle(
        new Style({
          image: new Icon({
            anchor: [0.5, 1],
            src: images["identify-marker.png"],
          }),
        })
      );
      identifyIconLayerRef.current.set("name", "sc-identify-icon");
      if (window.config.leftClickIdentify) {
        window.map.on("singleclick", (evt) => {
          // DISABLE POPUPS
          let disable = window.disableIdentifyClick || window.isDrawingOrEditing || window.isCoordinateToolOpen || window.isMeasuring;
          if (disable) return;

          contextCoordsRef.current = evt.coordinate;
          identify();
        });
      }
    });
  };
  const identify = () => {
    identifyIconLayerRef.current.getSource().clear();
    window.map.removeLayer(identifyIconLayerRef.current);

    const point = new Point(contextCoordsRef.current);
    const feature = new Feature(point);
    identifyIconLayerRef.current.getSource().addFeature(feature);

    window.map.addLayer(identifyIconLayerRef.current);
    setTimeout(() => {
      window.map.removeLayer(identifyIconLayerRef.current);
    }, 3000);
    window.emitter.emit("loadReport", <Identify geometry={point} />);
  };

  const reportProblem = () => {
    // APP STATS
    helpers.addAppStat("Report Problem", "Right Click Map");

    const scale = helpers.getMapScale();
    const extent = window.map.getView().calculateExtent(window.map.getSize());
    const xmin = extent[0];
    const xmax = extent[1];
    const ymin = extent[2];
    const ymax = extent[3];
    const center = window.map.getView().getCenter();
    helpers.waitForLoad("settings", Date.now(), 30, () => {
      let feedbackUrl = feedbackTemplate(window.config.feedbackUrl, xmin, xmax, ymin, ymax, center[0], center[1], scale);
      if (window.config.mapId !== null && window.config.mapId !== undefined && window.config.mapId.trim() !== "") feedbackUrl += "&MAP_ID=" + window.config.mapId;

      helpers.showURLWindow(feedbackUrl, false, "full");
    });
  };
  const googleLink = () => {
    // APP STATS
    helpers.addAppStat("Google Maps", "Right Click Map");

    const latLongCoords = transform(contextCoordsRef.current, "EPSG:3857", "EPSG:4326");
    const googleMapsUrl = googleMapsTemplate(latLongCoords[0], latLongCoords[1]);
    window.open(googleMapsUrl, "_blank");
  };

  const saveMapExtent = () => {
    const extent = window.map.getView().calculateExtent(window.map.getSize());
    helpers.saveToStorage(storageExtentKeyRef.current, extent);
    helpers.showMessage("Map Extent", "Your map extent has been saved.");
  };

  const addMyMaps = () => {
    var marker = new Feature(new Point(contextCoordsRef.current));
    window.emitter.emit("addMyMapsFeature", marker, contextCoordsRef.current[0] + "," + contextCoordsRef.current[1]);
  };

  const sidebarChanged = (isSidebarOpen) => {
    helpers.waitForLoad("map", Date.now(), 30, () => {
      //  SIDEBAR IN AND OUT
      if (isSidebarOpen) {
        setMapClassName("sc-map sc-map-slideout");
      } else {
        setMapClassName("sc-map sc-map-closed sc-map-slidein");
      }
    });
  };

  return (
    <div id="map-root">
      <div className="map-theme">
        <div id={"map-modal-window"} />
        <div id="map" className={mapClassName} tabIndex="0" style={{ bottom: mapBottom }} />
        <Navigation options={props.options} />
        <FooterTools options={props.options} />
        <BMap options={props.options} />
        <PropertyReportClick extensions={propertyClickExtensions.current} />
        {window.mapControls && window.mapControls.gitHubButton ? (
          <div
            className={window.sidebarOpen ? "sc-map-github-button slideout" : "sc-map-github-button slidein"}
            onClick={() => {
              helpers.addAppStat("GitHub", "Button");
            }}
          >
            <GitHubButton href={gitHubFollowUrl} data-size="large" aria-label={gitHubFollowHandleLabel}>
              {gitHubFollowHandle}
            </GitHubButton>
          </div>
        ) : (
          <div />
        )}
        <AttributeTable />
        <FloatingImageSlider />
      </div>
    </div>
  );
};

export default SCMap;
// IMPORT ALL IMAGES
const images = importAllImages(require.context("./images", false, /\.(png|jpe?g|svg|gif)$/));
function importAllImages(r) {
  let images = {};
  r.keys().map((item, index) => (images[item.replace("./", "")] = r(item)));
  return images;
}
