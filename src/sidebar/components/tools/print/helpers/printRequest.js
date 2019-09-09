import tileMapLayerConfigs from "./wmts_json_config_entries";
import * as helpers from "../../../../../helpers/helpers";

export async function printRequestOptions(mapLayers, description, printSelectedOption) {

    const iconServiceUrl = "https://opengis.simcoe.ca/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=";
    const currentMapViewCenter = window.map.getView().values_.center
    const mapProjection = window.map.getView().getProjection().code_
    const currentMapScale = helpers.getMapScale();
    const longitudeFirst = true;
    const mapCenter = [-8875141.45, 5543492.45];
    const mapScale = 3000000;
    const rotation = 0;
    const dpi = 300;
    let geoJsonLayersCount = 0;
    let printAppId = null;


    // init print request object
    let printRequest = {
        layout: "",
        outputFormat: "",
        dpi: 300,
        attributes: {
            title: "",
            description: "",
            map: {},
            overviewMap: {},
            legend: {},
            scaleBar: {
                geodetic: currentMapScale
            },
            scale: ""
        }
    }

    //init list for legend, main and overview map layers to render on template
    let mainMapLayers = [];
    let overviewMap = [];
    let legend = {
        name: "Legend",
        classes: []
    };


    // ..........................................................................
    // helper methods
    // ..........................................................................

    //converts rgb to hexadecimal color
    let rgbToHex = (r, g, b, a) => {
        r = r.toString(16);
        g = g.toString(16);
        b = b.toString(16);
        a = (a.toString().split('.')[1]) + "0";

        if (r.length == 1)
            r = "0" + r;
        if (g.length == 1)
            g = "0" + g;
        if (b.length == 1)
            b = "0" + b;
        if (a.length == 1)
            a = "" + a;

        return "#" + r + g + b;
    };

    // Changes XML to JSON
    let xmlToJson = (xml) => {
        let obj = {};

        if (xml.nodeType == 1) { // element
            // do attributes
            if (xml.attributes.length > 0) {
                obj["@attributes"] = {};
                for (let j = 0; j < xml.attributes.length; j++) {
                    let attribute = xml.attributes.item(j);
                    obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                }
            }
        } else if (xml.nodeType == 3) { // text
            obj = xml.nodeValue;
        }

        // do children
        if (xml.hasChildNodes()) {
            for (let i = 0; i < xml.childNodes.length; i++) {
                let item = xml.childNodes.item(i);
                let nodeName = item.nodeName;
                if (typeof (obj[nodeName]) == "undefined") {
                    obj[nodeName] = xmlToJson(item);
                } else {
                    if (typeof (obj[nodeName].push) == "undefined") {
                        let old = obj[nodeName];
                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                    }
                    obj[nodeName].push(xmlToJson(item));
                }
            }
        }
        return obj;
    };

    // loads tileMatrix from basemap Urls
    let loadTileMatrix = async (url) => {

        let response = await fetch(url)
        let data = await response.text()
        let xml = (new window.DOMParser()).parseFromString(data, "text/xml")
        let json = xmlToJson(xml)
        let flatTileMatrix = json.Capabilities.Contents.TileMatrixSet[0].TileMatrix
        let tileMatrix = flatTileMatrix.map((m) => {
            return {
                identifier: m["ows:Identifier"]["#text"],
                scaleDenominator: Number(m["ScaleDenominator"]["#text"]),
                topLeftCorner: [-2.0037508342787E7, 2.0037508342787E7],
                tileSize: [256, 256],
                matrixSize: [Number(m["MatrixHeight"]["#text"]), Number(m["MatrixWidth"]["#text"])]
            }

        })
        return tileMatrix
    }

    //remove null and undefined values from object
    let removeNull = (obj) => {
        let propNames = Object.getOwnPropertyNames(obj);
        for (let i = 0; i < propNames.length; i++) {
            let propName = propNames[i];
            if (obj[propName] === null || obj[propName] === undefined) {
                delete obj[propName];
            }
        }
        return obj;
    }

    let transformGeoJson = (l) =>{

    }



    // ..........................................................................
    // Layer Transformer
    // ..........................................................................

    //extract and transform map layers to fit mapfish print request map structure
    let transformMapLayers = async (l) => {

        if (l.type === "VECTOR" && l.values_.name === "myMaps") {
            let drawablefeatures = Object.values(l.values_.source.undefIdIndex_);
            geoJsonLayersCount = drawablefeatures.length
            for (const key in drawablefeatures) {

                let f = drawablefeatures[key];
                let flat_coords = f.values_.geometry.flatCoordinates
                let grouped_coords = [];
                //transforms flattened coords to geoJson format grouped coords
                for (let i = 0, t = 1; i < flat_coords.length; i += 2, t += 2) {
                    grouped_coords.push([flat_coords[i], flat_coords[t]]);
                }

                let styles = {};
                if (Object.getPrototypeOf(f.values_.geometry).constructor.name === "LineString") {
                    styles.type = "Line"
                } else {
                    styles.type = Object.getPrototypeOf(f.values_.geometry).constructor.name;
                }
                if (f.style_.fill_ != null) {
                    styles.fillColor = rgbToHex(...f.style_.fill_.color_);
                    styles.fillOpacity = Number(([...f.style_.fill_.color_])[3]);
                }
                styles.strokeColor = rgbToHex(...f.style_.stroke_.color_);
                styles.strokeOpacity = Number(([...f.style_.stroke_.color_])[3]);
                styles.strokeWidth = Number(f.style_.stroke_.width_);
                styles.strokeDashstyle = "dash";
                styles.fontFamily = "sans-serif";
                styles.fontSize = "12px";
                styles.fontStyle = "normal";
                styles.fontWeight = "bold";
                styles.haloColor = "#123456";
                styles.haloOpacity = 0.7;
                styles.haloRadius = 3.0;
                styles.label = f.values_.label;
                styles.labelAlign = "cm";
                styles.labelRotation = 45;
                styles.labelXOffset = -25.0;
                styles.labelYOffset = -35.0;

                mainMapLayers.push({
                    type: "geojson",
                    geoJson: {
                        type: "FeatureCollection",
                        features: [{
                            type: "Feature",
                            geometry: {
                                type: Object.getPrototypeOf(f.values_.geometry).constructor.name,
                                coordinates: grouped_coords
                            },
                            properties: {
                                id: f.values_.id,
                                label: f.values_.label,
                                labelVisible: f.values_.labelVisible,
                                drawType: f.values_.drawType,
                                isParcel: f.values_.isParcel
                            }
                        }]
                    },
                    name: f.values_.label,
                    style: {
                        version: "2",
                        "*": {
                            symbolizers: [(removeNull(styles))]
                        }
                    }
                });
            }
        }

        if (l.type === "IMAGE") {

            //image icon layers are spliced/inserted in after geoJson layers. 
            mainMapLayers.splice(geoJsonLayersCount, 0, {
                type: "wms",
                baseURL: "https://opengis.simcoe.ca/geoserver/wms",
                serverType: "geoserver",
                opacity: 1,
                layers: [l.values_.name],
                imageFormat: "image/png",
                customParams: {
                    "TRANSPARENT": "true"
                }
            });
            legend.classes.push({
                icons: [iconServiceUrl + (l.values_.source.params_.LAYERS.replace(/ /g, "%20"))],
                name: l.values_.source.params_.LAYERS.split(":")[1]
            });
        }

        if (l.type === "TILE") {
            //allows for streets to be top most basemap layer
            let tileMapLayer = tileMapLayerConfigs[l.values_.service]
            let url = tileMapLayer.baseURL.replace("/tile/{TileMatrix}/{TileRow}/{TileCol}", "/WMTS/1.0.0/WMTSCapabilities.xml")
            let tileMatrix = await loadTileMatrix(url)
            tileMapLayer.matrices=[...tileMatrix]
  
            if (l.values_.service === 'Streets_Cache') {
                mainMapLayers.splice(geoJsonLayersCount, 0, tileMapLayer)
                overviewMap.splice(geoJsonLayersCount, 0, tileMapLayer)
            } else {
                mainMapLayers.push(tileMapLayer)
                overviewMap.push(tileMapLayer)
            }
        }
    }
    mapLayers.forEach((l) => transformMapLayers(l));


    // ..........................................................................
    // Print Request Object Builder
    // ..........................................................................

    let buildPrintRequest = (p, options) => {

        //shared print request properties
        p.attributes.map.center = currentMapViewCenter;
        p.attributes.map.projection = mapProjection;
        p.attributes.map.scale = currentMapScale;
        p.attributes.map.longitudeFirst = longitudeFirst;
        p.attributes.map.rotation = rotation;
        p.attributes.map.dpi = dpi;
        p.attributes.map.layers = mainMapLayers;
        p.outputFormat = options.printFormatSelectedOption.value;

        //switch for specific print request properties based on layout selected
        switch (options.printSizeSelectedOption.value) {
            case '8X11 Portrait':
                printAppId = "letter_portrait";
                p.layout = "letter portrait";
                p.attributes.title = options.mapTitle;
                p.attributes.description = description;
                p.attributes.scale = "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                break;
            case '11X8 Landscape':
                printAppId = "letter_landscape";
                p.layout = "letter landscape";
                p.attributes.title = options.mapTitle;
                p.attributes.description = description;
                p.attributes.scale = "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                break;
            case '8X11 Portrait Overview':
                printAppId = "letter_portrait_overview";
                p.layout = "letter portrait overview";
                p.attributes.title = options.mapTitle;
                p.attributes.description = description;
                p.attributes.scale = "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                p.attributes.legend = legend;
                p.attributes.overviewMap.center = mapCenter;
                p.attributes.overviewMap.projection = mapProjection;
                p.attributes.overviewMap.scale = mapScale;
                p.attributes.overviewMap.longitudeFirst = longitudeFirst;
                p.attributes.overviewMap.rotation = rotation;
                p.attributes.overviewMap.dpi = dpi;
                p.attributes.overviewMap.layers = overviewMap;
                break;
            case 'Map Only':
                printAppId = "map_only";
                p.layout = "map only";
                break;
            case 'Map Only Portrait':
                printAppId = "map_only_portrait";
                p.layout = "map only portrait";
                break;
            case 'Map Only Landscape':
                printAppId = "map_only_landscape";
                p.layout = "map only landscape";
                break;
            default:
                printAppId = "letter_portrait";
                p.layout = "letter portrait";
                break;
        }

    }
    buildPrintRequest(printRequest, printSelectedOption)

    console.log(mapLayers);
    console.log(printRequest);

    // ..........................................................................
    // Post request and check print status for print job retreival
    // ..........................................................................
    let interval = 5000;
    let origin = window.location.origin;
    let testOrigin = 'http://localhost:8080'
    let encodedPrintRequest = encodeURIComponent(JSON.stringify(printRequest))
    let url = `${testOrigin}/print/print/${printAppId}/report.${(printSelectedOption.printFormatSelectedOption.value).toLowerCase()}`;

    //check print Status and retreive print
    let checkStatus = (response) => {

        fetch(`${testOrigin}${response.statusURL}`)
            .then(data => data.json())
            .then((data) => {
                console.log(data);
                if ((data.done === true) && (data.status === "finished")) {
                    interval = 0
                    window.open(`${testOrigin}${data.downloadURL}`)
                } else if ((data.done === false) && (data.status === "running")) {
                    setTimeout(() => {
                        if (interval < 30000) {
                            interval += 2500
                            checkStatus(response)
                        } else {
                            interval = 5000
                            checkStatus(response)
                        }
                    }, interval);
                } else if ((data.done === true) && (data.status === "error")) {
                    // be handled as a gracefully displayed error message
                    // console.log(data.error);
                    helpers.showMessage("Print Failed", "please report to admin", "red", 10000);
                }
            })
    }
    //post request to server and check status
    // fetch(url, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json'
    //         },
    //         body: encodedPrintRequest
    //     })
    //     .then(response => response.json())
    //     .then((response) => {
    //         checkStatus(response)
    //     })
    //     .catch(error => console.error('Error:', error))






}