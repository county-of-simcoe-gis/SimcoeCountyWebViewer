import shortid from 'shortid';


export async function httpGetTextWait(url, callback) {
  let data = await fetch(url)
    .then((response) => {
      const resp = response.text();
      //console.log(resp);
      return resp;
    })
    .catch((err) => {
      console.log("Error: ", err);
    });
  if (callback !== undefined) {
    //console.log(data);
    callback(data);
  }
  return data;
}
export function httpGetText(url, callback) {
  return fetch(url)
    .then((response) => response.text())
    .then((responseText) => {
      // CALLBACK WITH RESULT
      if (callback !== undefined) callback(responseText);
    })
    .catch((error) => {
      console.error(url, error);
      if (callback !== undefined) callback("ERROR");
    });
}

// GET JSON (NO WAITING)
export function getJSON(url, callback) {
  return fetch(url)
    .then((response) => response.json())
    .then((responseJson) => {
      // CALLBACK WITH RESULT
      if (callback !== undefined) callback(responseJson);
    })
    .catch((error) => {
      console.error("Error: ", error, "URL:", url);
    });
}
// // GET JSON (NO WAITING)
// export function getJSON(url, callback){
//   return fetch(url, {headers : { 
//     'Content-Type': 'application/json',
//     'Accept': 'application/json'
//    }})
//   .then(function(response) {
//     return response.json();
//   })
//   .then(function(myJson) {
//     callback (myJson);
//   });
// }

export function toTitleCase(str) {
  return str.replace(
      /\w\S*/g,
      function(txt) {
          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
  );
};

// URL FRIENDLY STRING ID
export function getUID(){
  return shortid.generate();
}
  
export function parseESRIDescription (description){
  const descriptionParts = description.split("#");
  let returnObj = {
    isGroupOn:"",
    isLiveLayer: false,
    isVisible:false,
    isOpen: false,
    sar: false,
    description: "",
    refreshInterval:"",
    modalURL:"",
    categories :["All Layers"],
  };
 
  descriptionParts.forEach(descriptionPart=>{
    let parts = descriptionPart.split("=");
    let key = parts[0].trim();
    if (key != null && key.length !== 0)
    {
      //VALUE STRING
      let value = parts[1];
      switch (key.toUpperCase()){
        case "CATEGORY":
            value.split(",").forEach(item=>{
              returnObj.categories.push(item.trim());
            });
            break;
        case "LIVELAYER":
            returnObj.isLiveLayer = value.trim().toUpperCase() === "TRUE";
            break;
        case "GROUPON":
          returnObj.isGroupOn =value.trim().toUpperCase() === "TRUE";
            break;
        case "VISIBLE":
          returnObj.isVisible = value.trim().toUpperCase() === "TRUE";
            break;
        case "OPEN":
          returnObj.isOpen = value.trim().toUpperCase() === "TRUE";
            break;
        case "SAR":
          returnObj.sar = value.trim().toUpperCase() === "TRUE";
            break;
        case "DESCRIPTION":
          returnObj.description = value;
            break;
        case "REFRESH":
          returnObj.refreshInterval = value;
            break;
        case "MODALURL":
          returnObj.modalURL = value;
            break;
        default:
          break;
       }
    }
  });
  return returnObj;
}