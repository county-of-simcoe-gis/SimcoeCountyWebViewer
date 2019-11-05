import * as helpers from "../../../../../helpers/helpers";
import utils from "./utils";


// ..........................................................................
// Load Tile matrix and build out WMTS Object
// ..........................................................................

//pulls in tile matrix from each basemap tilelayer capabilities
export async function loadTileMatrix(url) {

    let response = await fetch(url);
    let data = await response.text();
    let xml = (new window.DOMParser()).parseFromString(data, "text/xml");
    let json = utils.xmlToJson(xml)
    let flatTileMatrix = json.Capabilities.Contents.TileMatrixSet[0].TileMatrix;
    let tileMatrix = flatTileMatrix.map((m) => {
        return {
            identifier: m["ows:Identifier"]["#text"],
            scaleDenominator: Number(m["ScaleDenominator"]["#text"]),
            topLeftCorner: [Number((m["TopLeftCorner"]["#text"]).split(" ")[0]), Number((m["TopLeftCorner"]["#text"]).split(" ")[1])],
            tileSize: [256, 256],
            matrixSize: [Number(m["MatrixWidth"]["#text"]), Number(m["MatrixHeight"]["#text"])]
        }
    });
    return tileMatrix;
}

//build and loads wmts config for each layer
export async function loadWMTSConfig(url, opacity) {

    let wmtsCongif = {};

    wmtsCongif.type = "WMTS";
    wmtsCongif.imageFormat = "image/png";
    wmtsCongif.opacity = opacity;
    wmtsCongif.style = "Default Style";
    wmtsCongif.version = "1.0.0";
    wmtsCongif.dimensions = [];
    wmtsCongif.dimensionParams = {};
    wmtsCongif.requestEncoding = "REST";
    wmtsCongif.customParams = {
        "TRANSPARENT": "true"
    };
    wmtsCongif.matrixSet = "EPSG:3857";
    wmtsCongif.baseURL = url + "/tile/{TileMatrix}/{TileRow}/{TileCol}";
    wmtsCongif.layer = utils.extractServiceName(url);
    wmtsCongif.matrices = await loadTileMatrix(url + "/WMTS/1.0.0/WMTSCapabilities.xml");

    return wmtsCongif;
}
// ..........................................................................
// Building pring request According to mapfish v3 config standards
// ..........................................................................
export async function printRequest(mapLayers, description, printSelectedOption) {
    //alternative osm layer used from maptiler:api.maptiler.com due to osm user agent user restriction policy
    //"https://api.maptiler.com/maps/streets/256/{z}/{x}/{y}.png?key=6vlppHmCcPoEbI6f1RBX";

    const osmBaseUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    const currentMapViewCenter = window.map.getView().values_.center;
    const mapProjection = window.map.getView().getProjection().code_;
    const mapExtent = window.map.getView().calculateExtent();
    const viewPortHeight = window.map.getSize()[1]
    const viewPortWidth = window.map.getSize()[0]
    const currentMapScale = helpers.getMapScale();
    const longitudeFirst = true;
    const mapScale = 2990000;
    const rotation = 0;
    const dpi = 300;

    const groupLayerNames = ["Topographic", "Streets", "Open Street Map", "LIO Topo"];

    const mapLayerSorter = [
        "LIO_Cartographic_LIO_Topographic",
        "Streets_Black_And_White_Cache",
        "World_Topo_Map",
        "Topo_Cache",
        "Streets_Cache",
        "Ortho_2018_Cache",
        "Ortho_2016_Cache",
        "Ortho_2013_Cache",
        "Ortho_2012_Cache",
        "Ortho_2008_Cache",
        "Ortho_2002_Cache",
        "Ortho_1997_Cache",
        "Ortho_1989_Cache",
        "Ortho_1954_Cache",
        "Bathymetry_Cache",
        "World_Imagery"
    ];
    const mapfishOutputFormats = {
        JPG: "jpeg",
        PNG: "png",
        PDF: "pdf"
    }
    // template dimensions to be used for preserve map extensions
    const templateDimensions = {};
    templateDimensions["8X11 Portrait"] = [570, 639];
    templateDimensions["11X8 Landscape"] = [750, 450];
    templateDimensions["8X11 Portrait Overview"] = [570, 450];
    templateDimensions["Map Only"] = [viewPortWidth, viewPortHeight];
    templateDimensions["Map Only Portrait"] = [570, 752];
    templateDimensions["Map Only Landscape"] = [750, 572];


    //count for geoJsonLayers to assist in placing wms layers
    let geoJsonLayersCount = 0;

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
            scaleBar: {
                geodetic: currentMapScale
            },
            scale: ""
        }
    }

    let mainMap = [];
    let overviewMap = [];
    let sortedMainMap = [];
    let sortedOverviewMap = [];


    let configureVectorMyMapsLayer = (l) => {

        if (typeof l.values_.source.uidIndex_ !== "undefined") {

            let myMapsData = (JSON.parse(localStorage.getItem('myMaps')).items).reverse();

            // geometry type config
            let drawTypeOption = {
                Point: "Point",
                LineString: "Line",
                Polygon: "Polygon",
                Circle: "Polygon",
                Rectangle: "Polygon",
                Arrow: "Line",
                Text: "Point",
                Cancel: "Polygon",
                Bearing: "Line"
            }

            for (const key in myMapsData) {
                let styles = {};

                //default label config
                let labels = {
                    type: "text",
                    fontFamily: "arial",
                    fontSize: "15px",
                    fontStyle: "normal",
                    fontWeight: "bold",
                    haloColor: "#FFFFFF",
                    haloOpacity: 1,
                    haloRadius: 0.5,
                    label: "",
                    fillColor: "#000",
                    labelAlign: "cm",
                    labelRotation: 0,
                    labelXOffset: 0,
                    labelYOffset: 0
                }
                let f = myMapsData[key];
                if (f.visible === true) {
                    geoJsonLayersCount += 1;

                    let featureGeoJSON = JSON.parse(f.featureGeoJSON);
                    let grouped_coords = [...featureGeoJSON.geometry.coordinates];

                    //configuration for styles
                    styles.type = drawTypeOption[f.drawType];
                    if (f.style.fill_ !== null) {
                        styles.fillColor = utils.rgbToHex(...f.style.fill_.color_);
                        styles.fillOpacity = Number(([...f.style.fill_.color_])[3]);
                    }
                    if (f.style.stroke_ !== null) {
                        styles.strokeColor = utils.rgbToHex(...f.style.stroke_.color_);
                        styles.strokeOpacity = Number(([...f.style.stroke_.color_])[3]);
                        styles.strokeWidth = Number(f.style.stroke_.width_);
                        
                    }
                    if (f.strokeType==="dot"||f.strokeType==="dash") {
                        styles.strokeDashstyle =  f.strokeType;
                        if (f.strokeType === "dot") {
                            styles.strokeLinecap = "round" 
                        }
                    }
                    if(f.drawType==="Point"){
                        styles.graphicOpacity = Number(([...f.style.image_.fill_.color_])[3]);
                        styles.pointRadius = f.style.image_.radius_;
                        styles.rotation = f.style.image_.rotation_;
                        styles.fillColor = utils.rgbToHex(...f.style.image_.fill_.color_)
                        styles.fillOpacity =  Number(([...f.style.image_.fill_.color_])[3])
                        styles.strokeColor =  utils.rgbToHex(...f.style.image_.stroke_.color_);
                        styles.strokeOpacity =  Number(([...f.style.image_.stroke_.color_])[3]);
                        styles.strokeWidth = Number(f.style.image_.stroke_.width_);
                        if(f.pointType){
                            styles.graphicName = f.pointType
                        }
                    }

                    //configuration for labels
                    if (f.labelVisible === true) {
                        if (f.style.text_ !== null) {
                            labels.type = "text";
                            labels.haloOpacity = 1;
                            labels.label = f.label;
                            labels.labelAlign = "cm";
                            labels.labelRotation = f.labelRotation ? f.labelRotation : 0;
                            labels.labelXOffset = f.style.text_.offsetX_;
                            labels.labelYOffset = f.style.text_.offsetY_;
                            if (f.style.text_.fill_ != null) {
                                labels.fontColor = f.style.text_.fill_.color_ //utils.stringToColour()
                            }
                            if (f.style.text_.stroke_ != null) {
                                labels.haloRadius = 1;
                                labels.haloColor = f.style.text_.stroke_.color_;
                            }
                            if (f.style.text_.font_ != null) {
                                let fontStyle = (f.style.text_.font_).split(" ");
                                labels.fontFamily = fontStyle[2];
                                labels.fontSize = fontStyle[1];
                                labels.fontWeight = fontStyle[0];
                                labels.fontStyle = "normal";
                            }
                        }else{
                            labels.label = f.label;
                        }
                    }

                    mainMap.push({
                        type: "geojson",
                        geoJson: {
                            type: "FeatureCollection",
                            features: [{
                                type: "Feature",
                                geometry: {
                                    type: f.geometryType,
                                    coordinates: grouped_coords
                                },
                                properties: {
                                    id: f.id,
                                    label: f.label?f.label:false,
                                    labelVisible: f.labelVisible?f.labelVisible:false,
                                    drawType: f.geometryType,
                                    isParcel: f.isParcel?f.isParcel:false
                                }
                            }]
                        },
                        name: f.label,
                        style: {
                            version: "2",
                            "*": {
                                symbolizers: [styles, labels]
                            }
                        }
                    });
                }
            }
        }
    }

    let configureTileLayer = async (l) => {

        let tileUrl = null

        if (l.values_.source.key_ === "https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}") {
            tileUrl = l.values_.source.key_.split("/tile")[0];;
        } else {
            let entries = l.values_.source.tileCache.entries_;
            tileUrl = (entries[Object.keys(entries)[0]]).value_.src_.split("/tile")[0];
        }

        mainMap.push(await loadWMTSConfig(tileUrl, l.values_.opacity));
        overviewMap.push(await loadWMTSConfig(tileUrl, l.values_.opacity));
    }

    let configureLayerGroup = async (l) => {
        for (const key in l.values_.layers.array_) {
            let layers = l.values_.layers.array_[key]

            if (layers.values_.source.key_ === "http://a.tile.openstreetmap.org/{z}/{x}/{y}.png") {
                mainMap.push({
                    baseURL: osmBaseUrl,
                    type: "OSM",
                    imageExtension: "png"

                });
                overviewMap.push({
                    baseURL: osmBaseUrl,
                    type: "OSM",
                    imageExtension: "png"
                });
            } else if (layers.values_.source.key_ === "") {
                let tileUrl = null;

                if (typeof layers.values_.source.urls !== "undefined" && layers.values_.source.urls !== null) {
                    if (layers.values_.source.urls[0] === "https://ws.giscache.lrc.gov.on.ca/arcgis/rest/services/LIO_Cartographic/LIO_Topographic/MapServer") {
                        tileUrl = "https://ws.giscache.lrc.gov.on.ca/arcgis/rest/services/LIO_Cartographic/LIO_Topographic/MapServer";
                    }
                } else {
                    let entries = layers.values_.source.tileCache.entries_;
                    tileUrl = (entries[Object.keys(entries)[0]]).value_.src_.split("/tile")[0];
                }
                mainMap.push(await loadWMTSConfig(tileUrl, l.values_.opacity));
                overviewMap.push(await loadWMTSConfig(tileUrl, l.values_.opacity));
            }
        }
    }

    let configureImageLayer = (l) => {

        mainMap.push({
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
    }

    let getLayerByType = async (l) => {

        if (l.values_.name === "myMaps") {
            configureVectorMyMapsLayer(l);
        }

        if (groupLayerNames.includes(l.values_.name) === true) {
            await configureLayerGroup(l);
        }

        if (typeof l.values_.source !== "undefined") {
            if (typeof l.values_.source.tileCache !== "undefined") {
                await configureTileLayer(l);
            }

            if (typeof l.values_.source.wfsUrl !== "undefined") {
                configureImageLayer(l);
            };
        }
    }
    //iterate through each map layer passed in the window.map
    let mapLayerList = mapLayers.map((l) => getLayerByType(l));

    //wait for list of layer promises to be resolved
    await Promise.all(mapLayerList);

    let sortLayers = async (layers, sorted) => {
        mapLayerSorter.forEach((key) => {
            let found = false;
            layers = layers.filter((l) => {
                if (l.type === "geojson") {
                    sorted.push(l);
                }
                if (l.type === "wms") {
                    sorted.splice(geoJsonLayersCount, 0, l)
                }
                if (l.type === "OSM") {
                    sorted.push(l)
                }
                if (l.type === "WMTS") {
                    if (!found && l.layer === key) {
                        sorted.push(l);
                        found = true;
                        return false;
                    } else
                        return true;
                }
            })
        });
    }
    //ensures that the sorted layers executes after the intitial mapLayerList is resolved
    await sortLayers(mainMap, sortedMainMap);
    await sortLayers(overviewMap, sortedOverviewMap);

    // ..........................................................................
    // Print Request Template Switcher
    // ..........................................................................

    let switchTemplates = async (p, options) => {

        //shared print request properties
        p.attributes.map.projection = mapProjection;
        p.attributes.map.longitudeFirst = longitudeFirst;
        p.attributes.map.rotation = rotation;
        p.attributes.map.dpi = dpi;
        p.attributes.map.layers = sortedMainMap;
        p.outputFormat = mapfishOutputFormats[options.printFormatSelectedOption.value];

        switch (options.mapScaleOption) {
            case "forceScale":
                p.attributes.map.scale = options.forceScale;
                p.attributes.map.center = currentMapViewCenter;
                break;
            case "preserveMapScale":
                p.attributes.map.scale = currentMapScale;
                p.attributes.map.center = currentMapViewCenter;
                break;
            case "preserveMapExtent":
                p.attributes.map.height = utils.computeDimension(...(templateDimensions[options.printSizeSelectedOption.value]), mapExtent).newHeight;
                p.attributes.map.width = utils.computeDimension(...(templateDimensions[options.printSizeSelectedOption.value]), mapExtent).newWidth;
                p.attributes.map.bbox = mapExtent;
                break;
            default:
                p.attributes.map.scale = currentMapScale;
                p.attributes.map.center = currentMapViewCenter;
                break;
        }

        //switch for specific print request properties based on layout selected
        switch (options.printSizeSelectedOption.value) {
            case '8X11 Portrait':
                p.layout = "letter portrait";
                p.attributes.title = options.mapTitle;
                p.attributes.description = description;
                p.attributes.scale = "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

                break;
            case '11X8 Landscape':
                p.layout = "letter landscape";
                p.attributes.title = options.mapTitle;
                p.attributes.description = description;
                p.attributes.scale = "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                break;
            case '8X11 Portrait Overview':
                p.layout = "letter portrait overview";
                p.attributes.title = options.mapTitle;
                p.attributes.description = description;
                p.attributes.scale = "1 : " + currentMapScale.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                p.attributes.overviewMap.projection = mapProjection;
                p.attributes.overviewMap.center = currentMapViewCenter;
                p.attributes.overviewMap.scale = mapScale;
                p.attributes.overviewMap.longitudeFirst = longitudeFirst;
                p.attributes.overviewMap.rotation = rotation;
                p.attributes.overviewMap.dpi = dpi;
                p.attributes.overviewMap.layers = sortedOverviewMap;
                break;
            case 'Map Only':
                p.layout = "map only";
                p.attributes.map.height = options.mapOnlyHeight;
                p.attributes.map.width = options.mapOnlyWidth;
                break;
            case 'Map Only Portrait':
                p.layout = "map only portrait";
                break;
            case 'Map Only Landscape':
                p.layout = "map only landscape";
                break;
            default:
                p.layout = "letter portrait";
                break;
        }
    }
    //ensures that template configuration is executed before print request object is sent
    await switchTemplates(printRequest, printSelectedOption);
    //console.log(mapLayers);
    //console.log(printRequest);
    //console.log(JSON.stringify(printRequest));

    return printRequest;
}