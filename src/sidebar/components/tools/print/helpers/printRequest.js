'use strict';

import * as  myMapsHelpers from "../../../mymaps/myMapsHelpers";
import tileMapLayerConfigs from "./wmts_json_config_entries";

export function printRequestOptions(mapLayers, description, mapState){

    const dateObj = new Date();
    const month = dateObj.getUTCMonth() + 1; //months from 1-12
    const day = dateObj.getUTCDate();
    const year = dateObj.getUTCFullYear();
    const myMapLayers = myMapsHelpers.getItemsFromStorage("myMaps");
    const currentMapViewCenter = window.map.getView().values_.center

    //init list for layers to render on main map
    let renderMaplayers = []

    let printRequest ={
        layout: "",
        outputFormat: "",
        dpi: 300,
        attributes: {
          title:"",
          date:"",
          description:"",
          map: {},
          overview:{},
          legend:{},
          scaleBar:{},
          scale:""
        }
    }

    //converts rgb to hexadecimal color
    let rgbToHex = function (r,g,b,a) { 
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
            a =  "" + a;

        return "#" + r + g + b + a;
    };

    //myMaps custom 
    let myMapLayersList = myMapLayers.items.map((l)=>{
        let obj = {}
        obj.type="geoJson";
        obj.geoJson = {type: "FeatureCollection",features: [JSON.parse(l.featureGeoJSON)]};
        obj.name = l.label;
        obj.style = {
            version:l.id,
            "*":{
                symbolizers: [{
                    type: l.Polygon,
                    fillColor:rgbToHex(...l.style.fill_.color_) , 
                    strokeColor: rgbToHex(...l.style.stroke_.color_),
                    fillOpacity: 1,
                    strokeOpacity: 1,
                    strokeWidth: l.style.stroke_.width_
                }]
            }
        }
        return (obj)
    }); 
    for (const key in myMapLayersList) {
        renderMaplayers.push(myMapLayersList[key]);
    }

    let getLayerFromTypes = (l)=>{
        if (l.type==="TILE") {
            renderMaplayers.push(tileMapLayerConfigs[l.values_.service])    
        }
        if(l.type==="IMAGE"){
            renderMaplayers.push({
                    type: "wms",
                    baseURL: "https://opengis.simcoe.ca/geoserver/wms",
                    serverType: "geoserver",
                    opacity: 1,
                    layers: l.values_.name,
                    imageFormat: "image/png",
                    customParams: {
                        "TRANSPARENT": "true"
                    }
                }
            );
        }
        if(l.type==="VECTOR"){

        }
    }

    mapLayers.map((l)=>getLayerFromTypes(l))


    let templegend = {
        classes: [
            {
                icons:[
                   "https://www.realdecoy.com/wp-content/uploads/siggen-social-icons/twitter1.png?897572"
                ],
                name:"twitter"
             },
             {
                icons:[
                   "https://www.realdecoy.com/wp-content/uploads/siggen-social-icons/facebook1.png?897572"
                ],
                name:"facebook"
             },
             {
                icons:[
                   "https://www.realdecoy.com/wp-content/uploads/siggen-social-icons/instagram1.png?897572"
                ],
                name:"instagram"
             },
             {
                icons:[
                   "https://www.realdecoy.com/wp-content/uploads/siggen-social-icons/linkedin1.png?897572"
                ],
                name:"linkedin"
             }  
        ],
        name: "Legend"
    }

    printRequest.attributes.map.center = currentMapViewCenter;
    printRequest.attributes.map.scale = mapState.forceScale;
    printRequest.attributes.map.projection = "EPSG:3857";
    printRequest.attributes.map.rotation = 0;
    printRequest.attributes.map.dpi = 300;
    printRequest.attributes.map.layers = renderMaplayers;
    printRequest.outputFormat = mapState.printFormatSelectedOption.value;
    
    switch (mapState.printSizeSelectedOption.value) {
        case '8X11 Portrait':
            printRequest.layout ="letter portrait";
            printRequest.attributes.title= mapState.mapTtitle;
            printRequest.attributes.description = description;
            printRequest.attributes.date = year + "/" + month + "/" + day; 
            printRequest.attributes.scale= "1 : "+mapState.forceScale;
            printRequest.attributes.scaleBar = mapState.forceScale;
            break;
        case '11X8 Landscape':
            printRequest.layout ="letter landscape";
            printRequest.attributes.title= mapState.mapTtitle;
            printRequest.attributes.description = description;
            printRequest.attributes.date = year + "/" + month + "/" + day; 
            printRequest.attributes.scale= "1 : "+mapState.forceScale;
            printRequest.attributes.scaleBar = mapState.forceScale;
            break;
        case '8X11 Portrait Overview':
            printRequest.layout ="letter portrait overview";
            printRequest.attributes.title= mapState.mapTtitle;
            printRequest.attributes.description = description;
            printRequest.attributes.legend = templegend;
            printRequest.attributes.date = year + "/" + month + "/" + day; 
            printRequest.attributes.scale= "1 : "+mapState.forceScale;
            printRequest.attributes.scaleBar = mapState.forceScale;
            printRequest.attributes.overview.layers = renderMaplayers;
            break;
        case 'Map Only':
            printRequest.layout ="map only";
            break;
        case 'Map Only Portrait':
            printRequest.layout ="map only portrait";
            break;
        case 'Map Only Landscape':
            printRequest.layout ="map only landscape";
            break;
        default:
            printRequest.layout ="letter portrait";
            break;
      }

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



    //layerGroups Basemaps OSM Streets
}

//https://gis.stackexchange.com/questions/153233/mapfish-print-v3-blank-map   link to help