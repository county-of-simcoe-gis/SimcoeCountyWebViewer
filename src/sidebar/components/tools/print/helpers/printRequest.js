import * as  myMapsHelpers from "../../../mymaps/myMapsHelpers";

export function printRequestOptions(mapLayers, metaData, mapState){

    const data = myMapsHelpers.getItemsFromStorage("myMaps");

    let dateObj = new Date();
    let month = dateObj.getUTCMonth() + 1; //months from 1-12
    let day = dateObj.getUTCDate();
    let year = dateObj.getUTCFullYear();

    let printRequest ={
        layout: "",
        outputFormat: "",
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

    printRequest.attributes.map.layers = mapLayers[2].values_;
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
            printRequest.attributes.legend = data;
            printRequest.attributes.date = year + "/" + month + "/" + day; 
            printRequest.attributes.scale= "1 : "+mapState.forceScale;
            printRequest.attributes.scaleBar = {}
            printRequest.attributes.overview.layers = mapLayers;
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

      console.log(JSON.stringify({printRequest}));

    //   fetch(`http://localhost:8080/print/${printRequest.layout}/report.${mapState.printFormatSelectedOption.value}`, {
    //     method: 'post',
    //     body: JSON.stringify({printRequest})
    //   }).then(function(response) {
    //     console.log(response);
    //     //return response.json();
    //   }) 
}