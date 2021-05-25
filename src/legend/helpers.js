import shortid from "shortid";

// GET JSON (NO WAITING)
export function getJSON(url, callback) {
  return fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (myJson) {
      callback(myJson);
    });
}

export function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

// URL FRIENDLY STRING ID
export function getUID() {
  return shortid.generate();
}

export function getParams(url) {
  var params = {};
  var parser = document.createElement("a");
  parser.href = url;
  var query = parser.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }
  return params;
}

// FORMAT DATE FOR FOOTER
export function formatDate() {
  var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  var date = new Date();
  var day = date.getDate();
  var monthIndex = date.getMonth();
  var year = date.getFullYear();

  return monthNames[monthIndex] + " " + day + ", " + year;
}


export function replaceAllInString(str, find, replace) {
  return str.replace(new RegExp(_escapeRegExp(find), "g"), replace);
}

// HTTP GET (NO WAITING)
export function httpGetText(url, callback) {
  return fetch(url)
    .then((response) => response.text())
    .then((responseText) => {
      // CALLBACK WITH RESULT
      if (callback !== undefined) callback(responseText);
    })
    .catch((error) => {
      //httpGetText(url.replace("opengis.simcoe.ca", "opengis2.simcoe.ca"), callback);
      console.error(error);
    });
}

function _escapeRegExp(str) {
  // eslint-disable-next-line
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
