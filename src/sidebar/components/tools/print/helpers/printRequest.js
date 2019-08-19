import * as  myMapsHelpers from "../../../mymaps/myMapsHelpers";

export function printRequestOptions(mapLayers, metaData, mapState){

    const dateObj = new Date();
    const month = dateObj.getUTCMonth() + 1; //months from 1-12
    const day = dateObj.getUTCDate();
    const year = dateObj.getUTCFullYear();
    const myMapLayers = myMapsHelpers.getItemsFromStorage("myMaps");

    let layers = []

    let printRequest ={
        layout: "",
        outputFormat: "",
        dpi: 300,
        attributes: {
          title:"",
          date:"",
          metaData:"",
          map: {},
          overview:{},
          legend:{},
          scaleBar:{},
          scale:""
        }
    }

    let geoJsonData = myMapLayers.items.map((l)=>{
        return l.featureGeoJSON
    });

    layers.push({
        type:"geojson",
        geoJson: geoJsonData,
    });

    for (const key in mapLayers) {
        let eachLayer = mapLayers[key]
        if (eachLayer.values_.serviceUrl) {
            layers.push({
                type:"tiled",
                baseURL:eachLayer.values_.serviceUrl
            });
        }
        if (eachLayer.values_.service) {
            layers.push({
                type:"tiled",
                baseURL:eachLayer.values_.service.url
            });
        }
        if (eachLayer.values_.serviceGroup) {
            let serviceGroupLayer = eachLayer.values_.serviceGroup.layers
            for (const key in serviceGroupLayer) {
                if ((serviceGroupLayer[key].type)==="OSM") {
                    layers.push({
                        type:"OSM",
                        baseURL:"http://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    });
                } else {
                    layers.push({
                        type:"tiled",
                        baseURL:serviceGroupLayer[key].url
                    });
                }    
            }
        }
    }

    printRequest.attributes.map.center = [5, 45];
    printRequest.attributes.map.scale = mapState.forceScale;
    printRequest.attributes.map.projection = "EPSG:4326";
    printRequest.attributes.map.rotation = 0;
    printRequest.attributes.map.layers = layers;
    printRequest.outputFormat = mapState.printFormatSelectedOption.value;
    
    switch (mapState.printSizeSelectedOption.value) {
        case '8X11 Portrait':
            printRequest.layout ="Letter_Portrait";
            printRequest.attributes.title= mapState.mapTtitle;
            printRequest.attributes.metaData = metaData;
            printRequest.attributes.date = year + "/" + month + "/" + day; 
            printRequest.attributes.scale= "1 : "+mapState.forceScale;
            printRequest.attributes.scaleBar = {}
            break;
        case '11X8 Landscape':
            printRequest.layout ="Letter_Landscape";
            printRequest.attributes.title= mapState.mapTtitle;
            printRequest.attributes.metaData = metaData;
            printRequest.attributes.date = year + "/" + month + "/" + day; 
            printRequest.attributes.scale= "1 : "+mapState.forceScale;
            printRequest.attributes.scaleBar = {}
            break;
        case '8X11 Portrait Overview':
            printRequest.layout ="Letter_Portrait_Overview";
            printRequest.attributes.title= mapState.mapTtitle;
            printRequest.attributes.metaData = metaData;
            //printRequest.attributes.legend = data;
            printRequest.attributes.date = year + "/" + month + "/" + day; 
            printRequest.attributes.scale= "1 : "+mapState.forceScale;
            printRequest.attributes.scaleBar = {}
            printRequest.attributes.overview.layers = layers;
            break;
        case 'Map Only':
            printRequest.layout ="Map_Only";
            break;
        case 'Map Only Portrait':
            printRequest.layout ="Map_Only_Portrait";
            break;
        case 'Map Only Landscape':
            printRequest.layout ="Map_Only_Landscape";
            break;
        default:
            printRequest.layout ="Letter_Portrait";
            break;
      }

      console.log(printRequest);


      //console.log(JSON.stringify({printRequest}));

    //   fetch(`http://localhost:8080/print/${printRequest.layout}/report.${mapState.printFormatSelectedOption.value}`, {
    //     method: 'post',
    //     body: JSON.stringify({printRequest})
    //   }).then(function(response) {
    //     console.log(response);
    //     //return response.json();
    //   }) 



    //layerGroups Basemaps OSM Streets
}