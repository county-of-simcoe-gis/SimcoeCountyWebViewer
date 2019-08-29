import tileMapLayerConfigs from "./wmts_json_config_entries";

export function printRequestOptions(mapLayers, description, mapState) {

    //grabs current map view central coordinates
    const currentMapViewCenter = window.map.getView().values_.center

    // init print request object
    let printRequest = {
        layout: "",
        outputFormat: "",
        dpi: 300,
        attributes: {
            title: "",
            date: "",
            description: "",
            map: {},
            overview: {},
            legend: {},
            scaleBar: {},
            scale: ""
        }
    }

    //init list for main and overview map layers to render on main map
    let mainMapLayers = []
    let overviewMap = []

    //converts rgb to hexadecimal color
    let rgbToHex = function (r, g, b, a) {
        r = r.toString(16);
        g = g.toString(16);
        b = b.toString(16);
        a = (Math.round(a)).toString(16);

        if (r.length == 1)
            r = "0" + r;
        if (g.length == 1)
            g = "0" + g;
        if (b.length == 1)
            b = "0" + b;
        if (a.length == 1)
            a = "" + a;

        return "#" + r + g + b + a;
    };

    //extract and transform map layers to fit mapfish print request attribute.map.layers structure
    let getLayerFromTypes = (l) => {
        if (l.type === "TILE") {
            mainMapLayers.push(tileMapLayerConfigs[l.values_.service])
        }
        if (l.type === "IMAGE") {
            mainMapLayers.push({
                type: "wms",
                baseURL: "https://opengis.simcoe.ca/geoserver/wms",
                serverType: "geoserver",
                opacity: 1,
                layers: l.values_.name,
                imageFormat: "image/png",
                customParams: {
                    "TRANSPARENT": "true"
                }
            });
        }
        if (l.type === "VECTOR") {
            if (l.values_.name === "myMaps") {
                for (const f in (Object.values(l.values_.source.undefIdIndex_))) {
                    console.log(f);
                    mainMapLayers.push({
                        type: "geoJson",
                        geoJson: {
                            type: "FeatureCollection",
                            features: [{
                                type: "Feature",
                                geometry: {
                                    type: f.values_.drawType,
                                    coordinates: f.values_.geometry.flatCoordinates
                                }
                            }]
                        },
                        name: f.values_.label,
                        style: {
                            version: f.values_.id,
                            "*": {
                                symbolizers: [{
                                    type: l.Polygon,
                                    fillColor: rgbToHex(...f.style_.fill_.color_),
                                    strokeColor: rgbToHex(...f.style_.stroke_.color_),
                                    fillOpacity: 1,
                                    strokeOpacity: 1,
                                    strokeWidth: f.style_.stroke_.width_
                                }]
                            }
                        }
                    })
                }
            }
        }
    }
    mapLayers.map((l) => getLayerFromTypes(l))

    // construct legend object 
    let templegend = {
        classes: [
            {
                icons: [
                    "https://www.realdecoy.com/wp-content/uploads/siggen-social-icons/twitter1.png?897572"
                ],
                name: "twitter"
            },
            {
                icons: [
                    "https://www.realdecoy.com/wp-content/uploads/siggen-social-icons/facebook1.png?897572"
                ],
                name: "facebook"
            },
            {
                icons: [
                    "https://www.realdecoy.com/wp-content/uploads/siggen-social-icons/instagram1.png?897572"
                ],
                name: "instagram"
            },
            {
                icons: [
                    "https://www.realdecoy.com/wp-content/uploads/siggen-social-icons/linkedin1.png?897572"
                ],
                name: "linkedin"
            }
        ],
        name: "Legend"
    }


    // ..........................................................................
    // Build of Print Request Object
    // ..........................................................................

    //shared print request properties
    printRequest.attributes.map.center = currentMapViewCenter;
    printRequest.attributes.map.scale = mapState.forceScale;
    printRequest.attributes.map.projection = "EPSG:3857";
    printRequest.attributes.map.rotation = 0;
    printRequest.attributes.map.dpi = 300;
    printRequest.attributes.map.layers = mainMapLayers;
    printRequest.outputFormat = mapState.printFormatSelectedOption.value;

    //switch for specific print request properties based on layout selected
    switch (mapState.printSizeSelectedOption.value) {
        case '8X11 Portrait':
            printRequest.layout = "letter portrait";
            printRequest.attributes.title = mapState.mapTtitle;
            printRequest.attributes.description = description;
            printRequest.attributes.scale = "1 : " + mapState.forceScale;
            printRequest.attributes.scaleBar = mapState.forceScale;
            break;
        case '11X8 Landscape':
            printRequest.layout = "letter landscape";
            printRequest.attributes.title = mapState.mapTtitle;
            printRequest.attributes.description = description;
            printRequest.attributes.scale = "1 : " + mapState.forceScale;
            printRequest.attributes.scaleBar = mapState.forceScale;
            break;
        case '8X11 Portrait Overview':
            printRequest.layout = "letter portrait overview";
            printRequest.attributes.title = mapState.mapTtitle;
            printRequest.attributes.description = description;
            printRequest.attributes.legend = templegend;
            printRequest.attributes.scale = "1 : " + mapState.forceScale;
            printRequest.attributes.scaleBar = mapState.forceScale;
            printRequest.attributes.overview.layers = overviewMap;
            break;
        case 'Map Only':
            printRequest.layout = "map only";
            break;
        case 'Map Only Portrait':
            printRequest.layout = "map only portrait";
            break;
        case 'Map Only Landscape':
            printRequest.layout = "map only landscape";
            break;
        default:
            printRequest.layout = "letter portrait";
            break;
    }

    // ..........................................................................
    // Post and await print result via request object
    // ..........................................................................

    console.log(mapLayers);

    console.log(printRequest);


    //console.log(JSON.stringify(printRequest));
    //   let headers = new Headers();

    //   headers.append('Access-Control-Allow-Origin', 'http://localhost:8080');
    //   headers.append('Access-Control-Allow-Credentials', 'true');

    //   fetch(`http://localhost:8080/print/print/${printRequest.layout}/report.${mapState.printFormatSelectedOption.value}`, {
    //     method: 'POST',
    //     headers: headers,
    //     body: JSON.stringify(printRequest)
    //   }).then(function(response) {
    //     console.log(response);
    //     return response.json();
    //   }) 


}