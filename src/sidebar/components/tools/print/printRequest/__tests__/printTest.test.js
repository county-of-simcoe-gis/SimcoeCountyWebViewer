import printRequest from "../printRequest";
import testPrintJson from "./testPrintPortraitLetter";
// __tests__/print-request.js
jest.mock('./request'); 


const testWMTSConfigObject = (testPrintJson.attributes.map.layers)[4];
const testOSMTileMatrix = (testPrintJson.attributes.map.layers)[4].matrices;
const description = "This map, either in whole or in part, may not be reproduced without the written authority from© The Corporation of the County of Simcoe.This map is intended for personal use, has been produced using data from a variety of sourcesand may not be current or accurate.Produced (in part) under license from:© Her Majesty the Queen in Right of Canada, Department of Natural Resources:© Queens Printer, Ontario Ministry of Natural Resources:© Teranet Enterprises Inc. and its suppliers:© Members of the Ontario Geospatial Data Exchange.All rights reserved. THIS IS NOT A PLAN OF SURVEY."

// function getPrintLayers() {
//     let layers = [];
//     window.map.getLayers().forEach(function (layer) {
//         if (layer.getVisible()) {
//             layers.push(layer);
//         }
//     })
//     return layers;
// }



it('loads tile matrix from capabilities url', async() => {
    expect.assertions(1);
    const data = await printRequest.loadTileMatrix("https://maps.simcoe.ca/arcgis/rest/services/Public/Ortho_2016_Cache/MapServer/WMTS/1.0.0/WMTSCapabilities.xml", "TILE");
    expect(data).toEqual(testOSMTileMatrix);
});


// it('builds wmts config object and loads in tilematrix', async () => {
//     expect.assertions(1);
//     const data = await printRequest.loadWMTSConfig("https://maps.simcoe.ca/arcgis/rest/services/Public/Ortho_2016_Cache/MapServer/WMTS/1.0.0/WMTSCapabilities.xml", "TILE", 1);
//     expect(data).toEqual(testWMTSConfigObject);
// });

// it('output and and send JSON string to mapfish print server', async () => {
//     expect.assertions(1);
//     const data = await printRequest.printRequest(getPrintLayers, description, testPrintOptions);
//     expect(data).toEqual(testPrintOutpout);
// });