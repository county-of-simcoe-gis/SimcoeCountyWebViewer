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
    //stroke format for geoJson
    let dash = [10];
    let dot = [1, 5];

    let configureVectorMyMapsLayer = (l) => {

        if (typeof l.values_.source.uidIndex_ !== "undefined") {
            let drawablefeatures = Object.values(l.values_.source.uidIndex_);
            geoJsonLayersCount = drawablefeatures.length
            for (const key in drawablefeatures) {
    
                let f = drawablefeatures[key];
                let grouped_coords = [];
                let styles = {};
                //default label config
                let labels = {
                    type: "text",
                    fontFamily: "sans-serif",
                    fontSize: "0px",
                    fontStyle: "normal",
                    fontWeight: "bold",
                    haloColor: "#123456",
                    haloOpacity: 0,
                    haloRadius: 0,
                    label: "",
                    labelAlign: "cm",
                    labelRotation: 0,
                    labelXOffset: 0,
                    labelYOffset: 0
                };
    
                if (f.style_.fill_ !== null && f.style_.stroke_ !== null) {
                    let flat_coords = f.values_.geometry.flatCoordinates;
    
                    //transforms flattened coords to geoJson format grouped coords
                    if (flat_coords) {
                        for (let i = 0, t = 1; i < flat_coords.length; i += 2, t += 2) {
                            grouped_coords.push([flat_coords[i], flat_coords[t]]);
                        }
                    }
    
                    if (Object.getPrototypeOf(f.values_.geometry).constructor.name === "LineString") {
                        styles.type = "Line"
                    } else {
                        styles.type = Object.getPrototypeOf(f.values_.geometry).constructor.name;
                    }
                    if (f.style_.fill_ != null) {
                        styles.fillColor = utils.rgbToHex(...f.style_.fill_.color_);
                        styles.fillOpacity = Number(([...f.style_.fill_.color_])[3]);
                    }
                    if (f.style_.stroke_ != null) {
                        styles.strokeColor = utils.rgbToHex(...f.style_.stroke_.color_);
                        styles.strokeOpacity = Number(([...f.style_.stroke_.color_])[3]);
                        styles.strokeWidth = Number(f.style_.stroke_.width_);
    
                        if (f.style_.stroke_.lineDash_ !== null && f.style_.stroke_.lineDash_[0] === dash[0]) {
                            styles.strokeDashstyle = "dash";
                        }
                        if (f.style_.stroke_.lineDash_ !== null && f.style_.stroke_.lineDash_[0] === dot[0] && f.style_.stroke_.lineDash_[1] === dot[1]) {
                            styles.strokeDashstyle = "dot";
                            styles.strokeLinecap = "round";
                        }
                    }
    
                    //configuration for labels
                    if (f.style_.text_ != null) {
                        labels.type = "text";
                        labels.haloOpacity = 1;
                        labels.label = f.values_.label;
                        labels.labelAlign = "cm";
                        labels.labelRotation = f.style_.text_.rotation_;
                        labels.labelXOffset = f.style_.text_.offsetX_;
                        labels.labelYOffset = f.style_.text_.offsetY_;
                        if (f.style_.text_.fill_ != null) {
                            labels.fontColor = f.style_.text_.fill_.color_ //utils.stringToColour()
                        }
                        if (f.style_.text_.stroke_ != null) {
                            labels.haloRadius = 1;
                            labels.haloColor = f.style_.text_.stroke_.color_;
                        }
                        if (f.style_.text_.font_ != null) {
                            let fontStyle = (f.style_.text_.font_).split(" ");
                            labels.fontFamily = fontStyle[2];
                            labels.fontSize = fontStyle[1];
                            labels.fontWeight = fontStyle[0];
                            labels.fontStyle = "normal";
                        }
                    }
    
                    mainMap.push({
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
                                symbolizers: [(utils.removeNull(styles)), labels]
                            }
                        }
                    });
                } 
            } 
        }  
    }

    let configureTileLayer = async (l) => {

        let tileUrl = null

        if (Object.getPrototypeOf(l.values_.source).constructor.name === 'XYZ') {
            tileUrl = l.values_.source.key_.split("/tile")[0];;
        }

        if (Object.getPrototypeOf(l.values_.source).constructor.name === 'TileImage') {
            let entries = l.values_.source.tileCache.entries_;
            tileUrl = (entries[Object.keys(entries)[0]]).value_.src_.split("/tile")[0];
        }

        mainMap.push(await loadWMTSConfig(tileUrl, l.values_.opacity));
        overviewMap.push(await loadWMTSConfig(tileUrl, l.values_.opacity));
    }

    let configureLayerGroup = async (l) => {
        for (const key in l.values_.layers.array_) {
            let layers = l.values_.layers.array_[key]

            if (Object.getPrototypeOf(layers.values_.source).constructor.name === "OSM") {
                mainMap.push({
                    baseURL:osmBaseUrl,
                    type:"OSM",
                    imageExtension:"png"

                });
                overviewMap.push({
                    baseURL:osmBaseUrl,
                    type:"OSM",
                    imageExtension:"png"
                });
            } else {
                let tileUrl = null;
                if (Object.getPrototypeOf(layers.values_.source).constructor.name === 'TileImage') {
                    let entries = layers.values_.source.tileCache.entries_;
                    tileUrl = (entries[Object.keys(entries)[0]]).value_.src_.split("/tile")[0];
                }
                if (Object.getPrototypeOf(layers.values_.source).constructor.name === 'TileArcGISRest') {
                    let entries = layers.values_.source.tileCache.entries_;
                    tileUrl = (entries[Object.keys(entries)[0]]).value_.src_.split("/export?")[0];
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

        if (Object.getPrototypeOf(l).constructor.name === "VectorLayer" && l.values_.name === "myMaps") {
            configureVectorMyMapsLayer(l);
        }

        if (Object.getPrototypeOf(l).constructor.name === "LayerGroup") {
            await configureLayerGroup(l);
        }

        if (Object.getPrototypeOf(l).constructor.name === "TileLayer") {
            await configureTileLayer(l);
        }

        if (Object.getPrototypeOf(l).constructor.name === "ImageLayer") {
            configureImageLayer(l);
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
    //console.log(printRequest);

    return printRequest;
}