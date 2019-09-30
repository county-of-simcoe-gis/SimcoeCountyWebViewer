//converts rgb to hexadecimal color
let rgbToHex = (r, g, b, a) => {
    r = r.toString(16);
    g = g.toString(16);
    b = b.toString(16);
    a = (a.toString().split('.')[1]) + "0";

    if (r.length == 1)
        r = "0" + r;
    if (g.length == 1)
        g = "0" + g;
    if (b.length == 1)
        b = "0" + b;
    if (a.length == 1)
        a = "" + a;

    return "#" + r + g + b;
};

// Changes XML to JSON
let xmlToJson = (xml) => {
    let obj = {};

    if (xml.nodeType === 1) { // element
        // do attributes
        if (xml.attributes.length > 0) {
            obj["@attributes"] = {};
            for (let j = 0; j < xml.attributes.length; j++) {
                let attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (xml.nodeType === 3) { // text
        obj = xml.nodeValue;
    }

    // do children
    if (xml.hasChildNodes()) {
        for (let i = 0; i < xml.childNodes.length; i++) {
            let item = xml.childNodes.item(i);
            let nodeName = item.nodeName;
            if (typeof (obj[nodeName]) == "undefined") {
                obj[nodeName] = xmlToJson(item);
            } else {
                if (typeof (obj[nodeName].push) == "undefined") {
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
}

let extractServiceName = (url)=>{
    let serviceUrl = ((url.split("/services/"))[1]).split("/")
    let filtered = serviceUrl.filter(e=>(e==="MapServer")||(e==="Public")?false:true);
    let serviceName = "";

    if (filtered.length===1) {
        serviceName=`${filtered[0]}`   
    }
    if (filtered.length>1) {
        serviceName=`${filtered[0]}_${filtered[1]}`
    }

    return serviceName
}

export default {rgbToHex, xmlToJson, removeNull, extractServiceName}