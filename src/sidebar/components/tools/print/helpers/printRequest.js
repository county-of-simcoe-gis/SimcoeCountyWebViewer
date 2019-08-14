export function printRequestOptions(mapLayers, mapState){
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
          scale:{}
        }
      }

    printRequest.outputFormat = mapState.printFormatSelectedOption.value;
    printRequest.attributes.title= mapState.mapTtitle;
    printRequest.attributes.map.layers = mapLayers

    switch (mapState.printSizes.value) {
        case '8X11 Portrait':
          printRequest.layout ="Letter_Portrait";
          break;
        case '11X8 Landscape':
          printRequest.layout ="Letter_Landscape";
          break;
        case '8X11 Portrait Overview':
            printRequest.layout ="Letter_Portrait_Overview";
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

      
      printRequest.attributes.date = ""
      printRequest.attributes.metaData = ""
      
      printRequest.attributes.legend = {}
      printRequest.attributes.scaleBar = {}
      printRequest.attributes.scale = {}
      
      fetch(`http://localhost:8080/print/${printRequest.layout}/report.${mapState.printFormatSelectedOption.value}`, {
        method: 'post',
        body: JSON.stringify({printRequest})
      }).then(function(response) {
        console.log(response);
        //return response.json();
      }) 
}