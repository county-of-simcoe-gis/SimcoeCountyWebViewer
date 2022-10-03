// "esri/portal/Portal",
// "esri/identity/OAuthInfo",
// "esri/identity/IdentityManager",
// "esri/portal/PortalQueryParams";
// import PortalQueryParams from "@arcgis/core/portal/PortalQueryParams";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo";
import IdentityManager from "@arcgis/core/identity/IdentityManager";
import config from "../config.json";
import * as helpers from "./helpers";

let credential = undefined;

let oauthInfo = undefined;
const initialize = (appId, portalUrl) => {
  if (!oauthInfo) {
    oauthInfo = new OAuthInfo({
      appId,
      portalUrl,
      flowType: "implicit",
      preserveUrlHash: false,
      popup: false,
      expiration: 20160, //Set to max allowed (14 days) but this will be limited by the server max value
    });
    IdentityManager.registerOAuthInfos([oauthInfo]);
  }
};
const checkCurrentStatus = async () => IdentityManager.checkSignInStatus(`${oauthInfo.portalUrl}/sharing`);
const signIn = async () => {
  if (!credential) {
    try {
      credential = await checkCurrentStatus();
    } catch (error) {
      credential = await fetchCredentials();
    }
  }
  return credential;
};
const signOut = async () => {
  // make sure the identitymanager has
  // the credential so it can destroy it
  await signIn();
  IdentityManager.destroyCredentials();
};
const fetchCredentials = async () => {
  credential = await IdentityManager.getCredential(`${oauthInfo.portalUrl}/sharing`, {
    error: null,
    oAuthPopupConfirmation: false,
    token: null,
  });
  return credential;
};
export const login = async (callback) => {
  initialize(config.arcGISServer.appId, config.arcGISServer.portalUrl);
  let creds = await signIn().then(
    (result) => {
      return result;
    },
    (error) => {
      console.error(error);
    }
  );

  if (!callback) return creds;
  else callback(creds);
};

export function processToken(esriLogin) {
  //Process session object if redirect option was used instead of popup
  if (esriLogin["/"]) {
    const esriServer = Object.keys(esriLogin["/"])[0];
    esriLogin["expires_in"] = esriLogin["/"][esriServer].expires - Date.now();
    esriLogin["username"] = esriLogin["/"][esriServer].userId;
    esriLogin["ssl"] = esriLogin["/"][esriServer].ssl;
    esriLogin["access_token"] = esriLogin["/"][esriServer].token;
    esriLogin["state"] = { portalUrl: esriServer };
    delete esriLogin["/"];
  }
  const currentTime = Date.now();
  if (!esriLogin["IssueDate"]) esriLogin["IssueDate"] = currentTime;
  if (!esriLogin["RenewalDate"]) esriLogin["RenewalDate"] = currentTime + parseInt(esriLogin.expires_in) - config.arcGISServer.maxActiveTime; //maxActiveTime = 43200000 = 12 hours in ms
  if (esriLogin["access_token"]) sessionStorage.removeItem("esriJSAPIOAuth");
  helpers.saveToStorage("ArcGIS_Token", esriLogin);
  helpers.addIsLoaded("esriLogin");
}
export async function getAccessToken(callback) {
  const forceAppRefresh = (tokenInfo) => {
    const refreshDelay = 5000;
    setTimeout(() => {
      //force refresh of page if left active for longer than the maxActiveTime
      helpers.showMessage("ArcGIS Token expired!", "ArcGIS Token expired, refreshing page...", helpers.messageColors.red, refreshDelay, true);
      console.warn("ArcGIS Token expired.  Page will automatically refresh.");
      setTimeout(() => {
        window.location.reload();
      }, refreshDelay);
    }, tokenInfo.ExpiryDate - Date.now() - refreshDelay);
  };
  let esriLogin = sessionStorage.getItem("esriJSAPIOAuth");
  if (esriLogin) processToken(JSON.parse(esriLogin));
  esriLogin = helpers.getItemsFromStorage("ArcGIS_Token");

  if (esriLogin && esriLogin.access_token && Date.now() < esriLogin.RenewalDate) {
    forceAppRefresh(esriLogin);
    if (callback) callback(esriLogin.access_token);
    else return esriLogin.access_token;
  } else {
    login((esriLogin) => {
      processToken({
        expires_in: esriLogin["expires"] - Date.now(),
        IssueDate: esriLogin["creationTime"],
        ExpiryDate: esriLogin["expires"],
        RenewalDate: parseInt(esriLogin["expires"]) - config.arcGISServer.maxActiveTime, //maxActiveTime = 43200000 = 12 hours in ms
        username: esriLogin["userId"],
        ssl: esriLogin["ssl"],
        access_token: esriLogin["token"],
        state: { portalUrl: esriLogin["server"] },
      });

      //autoLogin();
      helpers.waitForLoad(["esriLogin"], Date.now(), 60, () => {
        const esriLogin = helpers.getItemsFromStorage("ArcGIS_Token");
        forceAppRefresh(esriLogin);
        if (esriLogin && Date.now() < esriLogin.RenewalDate) callback(esriLogin.access_token);
      });
    });
  }
}
