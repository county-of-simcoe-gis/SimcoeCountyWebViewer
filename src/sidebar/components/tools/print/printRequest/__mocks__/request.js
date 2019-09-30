import testPrintJson from "../testData/testPrintPortraitLetter.json";

const testWMTSConfigObject = (testPrintJson.attributes.map.layers)[4];
const testOSMTileMatrix = (testPrintJson.attributes.map.layers)[4].matrices;


export function request(url, type) {
    return new Promise((resolve, reject) => {
        process.nextTick(() =>
            testOSMTileMatrix ?
            resolve(testOSMTileMatrix) :
            reject({
                error: 'url:' + url + ' data not loaded',
            }),
        );
    });
}