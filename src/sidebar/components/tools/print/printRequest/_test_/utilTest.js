import utils from "../utils";
import testXML from "../testData/testXML.xml";

test('converts rgb', () => {
    expect(utils.rgbToHex(91, 91, 91, 1)).toBe("#5b5b5b");
});

test('converts xml to json data', () => {
    expect(utils.xmlToJson(testXML)).toBe({
        "note": {
            "to": "Tove",
            "from": "Jani",
            "heading": "Reminder",
            "body": "Don't forget me this weekend!"
        }
    });
});

test('remove null and undefined values from object', () => {
    expect(utils.removeNull({
        a: null,
        b: 1,
        c: undefined
    })).toBe({
        b: 1
    });
});

test('Extracts Service name from url', () => {
    expect(utils.extractServiceName("https://ws.giscache.lrc.gov.on.ca/arcgis/rest/services/LIO_Cartographic/LIO_Topographic/MapServer")).toBe("LIO_Cartographic_LIO_Topographic");
});