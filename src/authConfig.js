import { LogLevel } from "@azure/msal-browser";
// Config object to be passed to Msal on creation
export const msalConfig = {
  tenant: process.env.REACT_APP_TENANT,
  defaultScope: process.env.REACT_APP_DEFAULT_SCOPE,
  auth: {
    clientId: process.env.REACT_APP_CLIENTID,
    authority: process.env.REACT_APP_AUTHORITY,
  },
  scopes: ["openid", "profile", "email", "offline_access"],

  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          console.log(`MSAL Logging - Level: ${level}, Message: ${message}, Contains PII: ${containsPii}`);
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            console.info(message);
            return;
        }
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Error,
    },
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email", "offline_access"],
};
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};
