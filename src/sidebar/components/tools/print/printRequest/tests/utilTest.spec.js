import utils from "../utils";
import xml2js from "xml2js";
import fs from "fs";
const parser = new xml2js.Parser({
    attrkey: "ATTR"
});

let xml_string = fs.readFileSync(__dirname + "/testXML.xml", "utf8");

let xml = parser.parseString(xml_string, function (error, result) {
    if (error === null) {
        return result
    } else {
        console.log(error);
    }
});

test('converts rgb', () => {
    expect(utils.rgbToHex(91, 91, 91, 1)).toBe("#5b5b5b");
});

test('converts xml to json data', () => {
    expect(utils.xmlToJson(xml)).toBe({
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