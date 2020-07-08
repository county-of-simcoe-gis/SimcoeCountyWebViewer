//converts rgb to hexadecimal color
let rgbToHex = (r, g, b, a) => {
  r = r.toString(16);
  g = g.toString(16);
  b = b.toString(16);
  a = a.toString().split(".")[1] + "0";

  // eslint-disable-next-line
  if (r.length == 1) r = "0" + r;
  // eslint-disable-next-line
  if (g.length == 1) g = "0" + g;
  // eslint-disable-next-line
  if (b.length == 1) b = "0" + b;
  // eslint-disable-next-line
  if (a.length == 1) a = "" + a;

  return "#" + r + g + b;
};

let stringToColour = function(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let colour = "#";
  for (let i = 0; i < 3; i++) {
    let value = (hash >> (i * 8)) & 0xff;
    colour += ("00" + value.toString(16)).substr(-2);
  }
  return colour;
};

// Changes XML to JSON
let xmlToJson = (xml) => {
  let obj = {};

  if (xml.nodeType === 1) {
    // element
    // do attributes
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (let j = 0; j < xml.attributes.length; j++) {
        let attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType === 3) {
    // text
    obj = xml.nodeValue;
  }

  // do children
  if (xml.hasChildNodes()) {
    for (let i = 0; i < xml.childNodes.length; i++) {
      let item = xml.childNodes.item(i);
      let nodeName = item.nodeName;
      if (typeof obj[nodeName] == "undefined") {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (typeof obj[nodeName].push == "undefined") {
          let old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
};

//remove null and undefined values from object
let removeNull = (obj) => {
  let propNames = Object.getOwnPropertyNames(obj);
  for (let i = 0; i < propNames.length; i++) {
    let propName = propNames[i];
    if (obj[propName] === null || obj[propName] === undefined) {
      delete obj[propName];
    }
  }
  return obj;
};

let extractServiceName = (url) => {
  let serviceUrl = url.split("/services/")[1].split("/");
  let filtered = serviceUrl.filter((e) => (e === "MapServer" || e === "Public" ? false : true));
  let serviceName = "";

  if (filtered.length === 1) {
    serviceName = `${filtered[0]}`;
  }
  if (filtered.length > 1) {
    serviceName = `${filtered[0]}_${filtered[1]}`;
  }

  return serviceName;
};

let computeDimension = (templateWidth, templateHeight, extent) => {
  let dimensions = {};
  const xMin = extent[0];
  const xMax = extent[2];
  const yMin = extent[1];
  const yMax = extent[3];
  const extentWidth = Math.abs(Math.abs(xMin) - Math.abs(xMax));
  const extentHeight = Math.abs(Math.abs(yMin) - Math.abs(yMax));

  if (extentHeight > extentWidth || extentHeight === extentWidth) {
    dimensions.newWidth = (extentWidth / extentHeight) * templateHeight;
    dimensions.newHeight = templateHeight;
    dimensions.x = Math.abs(extentWidth - dimensions.newWidth) / 2;
  } else if (extentHeight < extentWidth) {
    dimensions.newWidth = templateWidth;
    dimensions.newHeight = (extentHeight / extentWidth) * templateWidth;
    dimensions.y = Math.abs(extentHeight - dimensions.newHeight) / 2;
  }
  //console.log(dimensions);

  return dimensions;
};

export default { rgbToHex, stringToColour, xmlToJson, removeNull, extractServiceName, computeDimension };
