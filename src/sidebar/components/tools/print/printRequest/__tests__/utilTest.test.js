import utils from "../utils";
import fs  from "fs";

let xml_string = fs.readFileSync(__dirname +"/testXML.xml", "utf8");
let parser = new DOMParser();
let xml = parser.parseFromString(xml_string, "text/xml");

test('converts rgb', () => {
    expect(utils.rgbToHex(91, 91, 91, 1)).toBe("#5b5b5b");
});

test('converts string to hash color', () => {
    expect(utils.stringToColour("greenish")).toBe("#9bc63b");
});

test('converts xml to json data', () => {
    expect(utils.xmlToJson(xml)).toEqual({
        "note": {
            "body": {
                "#text": "Don't forget me this weekend!"
            },
            "from": {
                "#text": "Jani"
            },
            "heading": {
                "#text": "Reminder"
            },
            "to": {
                "#text": "Tove"
            }
        }
    });
});

test('remove null and undefined values from object', () => {
    expect(utils.removeNull({
        a: null,
        b: 1,
        c: undefined
    })).toEqual({
        b: 1
    });
});

test('Extracts Service name from url', () => {
    expect(utils.extractServiceName("https://ws.giscache.lrc.gov.on.ca/arcgis/rest/services/LIO_Cartographic/LIO_Topographic/MapServer")).toBe("LIO_Cartographic_LIO_Topographic");
});