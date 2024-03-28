import { get, post } from "./api";
import { default as configSecured } from "../config-secured.json";

const userStorageUrl = (apiUrl) => {
  return `${apiUrl}secure/user/storage`;
};

export function getUserStorage(callback) {
  if (window.security.includes("saveToServer")) {
    const url = userStorageUrl(configSecured.apiUrlSecured);
    get(url, { useBearerToken: true }, (data) => {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.log(e);
      }
      if (data && typeof data === "object")
        //filter out any authentication information
        Object.keys(data)
          .filter((key) => {
            return key.indexOf("login.microsoftonline.com") === -1 && key.indexOf("login.windows.net") === -1 && key.indexOf("msal.") === -1 && key.indexOf("cacheVersion") === -1;
          })
          .forEach((key) => {
            localStorage.setItem(key, data[key]);
          });
      window.isUserStoreLoaded = true;
      callback();
    });
  } else {
    window.isUserStoreLoaded = true;

    callback();
  }
}

export function clearUserStorage(callback) {
  if (window.security.includes("saveToServer")) {
    const url = userStorageUrl(configSecured.apiUrlSecured);
    post(url, { useBearerToken: true }, (result) => {
      if (callback) callback();
    });
  } else {
    callback();
  }
}
export function setUserStorage() {
  if (window.security.includes("saveToServer")) {
    const url = userStorageUrl(configSecured.apiUrlSecured);
    //remove any authentication information
    let dataKeys = Object.keys(localStorage).filter((key) => {
      return key.indexOf("login.microsoftonline.com") === -1 && key.indexOf("login.windows.net") === -1 && key.indexOf("msal.") === -1 && key.indexOf("cacheVersion") === -1;
    });
    let data = {};
    dataKeys.forEach((key) => (data[key] = localStorage.getItem(key)));
    post(url, { useBearerToken: true, body: JSON.stringify(data) }, (result) => {});
  }
}
