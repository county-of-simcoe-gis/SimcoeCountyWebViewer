import * as helpers from "../../../../../helpers/helpers";
import utils from "./utils";


// ..........................................................................
// Load Tile matrix and build out WMTS Object
// ..........................................................................

//pulls in tile matrix from each basemap tilelayer capabilities
export async function loadTileMatrix(url, type) {
    let response = await fetch(url);
    let data = await response.text();
    let xml = (new window.DOMParser()).parseFromString(data, "text/xml");
    let json = utils.xmlToJson(xml)
    let flatTileMatrix = null;
    if (type === "OSM") {
        flatTileMatrix = json.Capabilities.Contents.TileMatrixSet.TileMatrix
    } else {
        flatTileMatrix = json.Capabilities.Contents.TileMatrixSet[0].TileMatrix
    }
    let tileMatrix = flatTileMatrix.map((m) => {
        return {
            identifier: m["ows:Identifier"]["#text"],
            scaleDenominator: Number(m["ScaleDenominator"]["#text"]),
            topLeftCorner: [-2.0037508342787E7, 2.0037508342787E7],
            tileSize: [256, 256],
            matrixSize: [Number(m["MatrixHeight"]["#text"]), Number(m["MatrixWidth"]["#text"])]
        }
    });
    return tileMatrix;
}

//build and loads wmts config for each layer
export async function loadWMTSConfig(url, type, opacity) {

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
    wmtsCongif.baseURL = null;
    wmtsCongif.layer = null;
    wmtsCongif.matrices = null;
    if (type === "OSM") {
        wmtsCongif.baseURL = "https://tile-a.openstreetmap.fr/{Style}{TileMatrix}/{TileCol}/{TileRow}.png";
        wmtsCongif.layer = "wmts-osm"
        wmtsCongif.matrices = await loadTileMatrix(url, type);
    } else {
        wmtsCongif.baseURL = url + "/WMTS/tile/1.0.0/" + utils.extractServiceName(url) + "/{TileMatrix}/{TileRow}/{TileCol}";
        wmtsCongif.layer = utils.extractServiceName(url);
        wmtsCongif.matrices = await loadTileMatrix(url + "/WMTS/1.0.0/WMTSCapabilities.xml", type);
    }
    return wmtsCongif;
}

export async function printRequest(mapLayers, description, printSelectedOption) {

    const iconServiceUrl = "https://opengis.simcoe.ca/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=";
    const osmUrl = "https://osmlab.github.io/wmts-osm/WMTSCapabilities.xml"
    const currentMapViewCenter = window.map.getView().values_.center;
    const mapProjection = window.map.getView().getProjection().code_;
    const currentMapScale = helpers.getMapScale();
    const mapCenter = [-8875141.45, 5543492.45];
    const longitudeFirst = true;
    const mapScale = 3000000;
    const rotation = 0;
    const dpi = 300;
    const mapLayerSorter = [
        "LIO_Cartographic_LIO_Topographic",
        "Streets_Black_And_White_Cache",
        "World_Topo_Map",
        "wmts-osm",
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
        "World_Imagery",
    ];

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

    let mainMap = [];
    let overviewMap = [];
    let sortedMainMap = [];
    let sortedOverviewMap = [];
    let legend = {
        name: "Legend",
        classes: []
    };

    let configureVectorMyMapsLayer = (l) => {
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
                styles.fillColor = utils.rgbToHex(...f.style_.fill_.color_);
                styles.fillOpacity = Number(([...f.style_.fill_.color_])[3]);
                styles.strokeColor = utils.rgbToHex(...f.style_.stroke_.color_);
                styles.strokeOpacity = Number(([...f.style_.stroke_.color_])[3]);
                styles.strokeWidth = Number(f.style_.stroke_.width_);
            }


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
                        symbolizers: [(utils.removeNull(styles))]
                    }
                }
            });
        }
    }

    let configureTileLayer = async (l) => {
        mainMap.push(await loadWMTSConfig(l.values_.url, "IMAGERY", l.values_.opacity))
        overviewMap.push(await loadWMTSConfig(l.values_.url, "IMAGERY", l.values_.opacity))
    }

    let configureLayerGroup = async (l) => {

        for (const key in l.values_.layers.array_) {
            let layers = l.values_.layers.array_[key]

            if (layers.values_.service.type === "OSM") {
                mainMap.push(await loadWMTSConfig(osmUrl, layers.values_.service.type, l.values_.opacity))
                overviewMap.push(await loadWMTSConfig(osmUrl, layers.values_.service.type, l.values_.opacity))
            } else {
                mainMap.push(await loadWMTSConfig(layers.values_.service.url, layers.values_.service.type, l.values_.opacity))
                overviewMap.push(await loadWMTSConfig(layers.values_.service.url, layers.values_.service.type, l.values_.opacity))
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
        legend.classes.push({
            icons: [iconServiceUrl + (l.values_.source.params_.LAYERS.replace(/ /g, "%20"))],
            name: l.values_.source.params_.LAYERS.split(":")[1]
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

    let sortLayers = (layers, sorted) => {
        mapLayerSorter.forEach((key) => {
            let found = false;
            layers = layers.filter((l) => {
                if (l.type === "geojson") {
                    sorted.push(l);
                }
                if (l.type === "wms") {
                    sorted.splice(geoJsonLayersCount, 0, l)
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
    sortLayers(mainMap, sortedMainMap);
    sortLayers(overviewMap, sortedOverviewMap);

    // ..........................................................................
    // Print Request Template Switcher
    // ..........................................................................

    let switchTemplates = (p, options) => {

        //shared print request properties
        p.attributes.map.center = currentMapViewCenter;
        p.attributes.map.projection = mapProjection;
        p.attributes.map.scale = currentMapScale;
        p.attributes.map.longitudeFirst = longitudeFirst;
        p.attributes.map.rotation = rotation;
        p.attributes.map.dpi = dpi;
        p.attributes.map.layers = sortedMainMap;
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
                p.attributes.overviewMap.layers = sortedOverviewMap;
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
    switchTemplates(printRequest, printSelectedOption)

    //console.log(mapLayers);
    //console.log(printRequest);
    //console.log(JSON.stringify(printRequest));

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
    fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: encodedPrintRequest
        })
        .then(response => response.json())
        .then((response) => {
            checkStatus(response)
        })
        .catch(error => console.error('Error:', error))

}