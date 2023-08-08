function getBearerToken(callback) {
  window.instance
    .acquireTokenSilent({
      account: window.account,
    })
    .then((response) => {
      callback(`bearer ${response.idToken}`);
    })
    .catch((error) => {
      window.instance
        .acquireTokenRedirect({
          account: window.account,
        })
        .catch((error) => {
          console.error(error);
          callback({ error: 1 });
        });
    });
}

function privateFetch(url, method, headers, mode, type, body, callback) {
  return fetch(url, {
    method: method,
    mode: mode,
    headers: headers,
    body: body,
  })
    .then((response) => {
      switch (type) {
        case "json":
          return response.json();
        case "text":
          return response.text();
        case "blob":
          return response.blob();
        default:
          return response.json();
      }
    })
    .then((responseValue) => {
      // CALLBACK WITH RESULT
      callback(responseValue);
    })
    .catch((error) => {
      console.log("Error - " + url);
      console.log(error);
      callback({ result: { error: 1 } });
    });
}

export function get(url, params = {}, callback) {
  let { mode, headers, useBearerToken, type, body, redirect, referrer, xhrFields } = params;
  const method = "GET";
  if (!mode) mode = "cors";
  if (!useBearerToken) useBearerToken = false;
  if (!type) type = "json";
  if (!headers) headers = {};
  if (!redirect) redirect = "";
  if (!referrer) referrer = "";
  if (!xhrFields) xhrFields = {};

  if (params.useBearerToken) {
    getBearerToken((token) => {
      headers = {
        Authorization: token,
      };
      //console.log(url, method, headers, mode, type, body);
      privateFetch(url, method, headers, mode, type, body, (result) => {
        callback(result);
      });
    });
  } else {
    privateFetch(url, method, headers, mode, type, body, (result) => {
      callback(result);
    });
  }
}

export function post(url, params = {}, callback) {
  let { mode, headers, useBearerToken, type, body } = params;
  const method = "POST";
  if (!mode) mode = "cors";
  if (!useBearerToken) useBearerToken = false;
  if (!type) type = "json";
  if (!headers) headers = { "Content-Type": "application/json" };

  if (params.useBearerToken) {
    getBearerToken((token) => {
      headers = {
        Authorization: token,
      };
      return privateFetch(url, method, headers, mode, type, body, (result) => {
        callback(result);
      });
    });
  } else {
    return privateFetch(url, method, headers, mode, type, body, (result) => {
      callback(result);
    });
  }
}

export function del(url, params = {}, callback) {
  let { mode, headers, useBearerToken, type, body } = params;
  const method = "DELETE";
  if (!mode) mode = "cors";
  if (!useBearerToken) useBearerToken = false;
  if (!type) type = "json";
  if (!headers) headers = {};

  if (params.useBearerToken) {
    getBearerToken((token) => {
      headers = {
        Authorization: token,
      };
      return privateFetch(url, method, headers, mode, type, body, (result) => {
        callback(result);
      });
    });
  } else {
    return privateFetch(url, method, headers, mode, type, body, (result) => {
      callback(result);
    });
  }
}

export function downloadFile(url, params = {}, callback = undefined) {
  params["type"] = "blob";
  params["xhrFields"] = { responseType: "blob" };
  params["redirect"] = "follow"; // manual, *follow, error
  params["referrer"] = "no-referrer"; // no-referrer, *client
  getBearerToken((token) => {
    fetch(url, {
      method: "GET", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, cors, *same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "same-origin", // include, *same-origin, omit
      headers: { Authorization: token },
      redirect: "follow", // manual, *follow, error
      referrer: "no-referrer", // no-referrer, *client
      xhrFields: {
        responseType: "blob",
      },
    })
      .then((response) => response.blob())
      .then((blob) => {
        download(blob, params.fileName, { isBlob: true });
        if (callback) callback();
      });
  });
}

function download(url, filename = undefined, options = undefined) {
  if (!options) options = {};
  try {
    if (options.isBlob) {
      url = window.URL.createObjectURL(url);
    }
    var link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
    if (filename) link.setAttribute("download", filename);

    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link); //afterwards we remove the element again
  } catch (e) {
    window.open(url, `_blank`);
  }
}
