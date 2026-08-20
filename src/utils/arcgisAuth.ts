/**
 * ArcGIS Authentication Utilities
 *
 * Replicates the old app's esriHelpers.js using @arcgis/core's OAuthInfo
 * and IdentityManager. This handles the full OAuth/SAML flow — including
 * portals configured for SAML-only authentication — because IdentityManager
 * manages the redirect dance automatically.
 *
 * The token is then manually appended as `?token=` to ArcGIS REST URLs
 * used by OpenLayers (IdentityManager auto-interception doesn't apply to OL).
 *
 * IMPORTANT: @arcgis/core modules are loaded via dynamic import() to avoid
 * pulling Calcite Components (ResizeObserver, etc.) into SSR/prerender.
 */

// ─── Configuration (from env) ────────────────────────────────────────────────

const PORTAL_URL = process.env.NEXT_PUBLIC_ESRI_PORTAL_URL ?? "";
const APP_ID = process.env.NEXT_PUBLIC_ESRI_APP_ID ?? "";

/** Max token lifespan in minutes (14 days — capped by server's max). */
const DEFAULT_EXPIRATION_MINUTES = 20160;

/** Max active session time in ms before forcing a refresh (12 hours). */
const MAX_ACTIVE_TIME_MS = 43200000;

/** Storage key in sessionStorage. */
export const STORAGE_KEY = "ArcGIS_Token";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ArcGISTokenData {
  /** The OAuth access token string. */
  accessToken: string;
  /** Epoch ms when the token expires. */
  expiresAt: number;
  /** Epoch ms after which the app should refresh (expiresAt - maxActiveTime). */
  renewalDate: number;
  /** Epoch ms when the token was issued. */
  issueDate: number;
  /** ArcGIS Portal username. */
  username: string;
  /** Whether the token requires SSL. */
  ssl: boolean;
  /** The portal URL this token was issued for. */
  portalUrl: string;
}

// ─── Module-level state (mirrors old app's `let credential` / `let oauthInfo`) ─

let credential: __esri.Credential | undefined;
let oauthInfo: __esri.OAuthInfo | undefined;
let initialized = false;

// ─── Lazy loaders for @arcgis/core (avoids SSR pitfalls) ─────────────────────

let _OAuthInfo: typeof import("@arcgis/core/identity/OAuthInfo").default | undefined;
let _IdentityManager: typeof import("@arcgis/core/identity/IdentityManager").default | undefined;

async function loadArcGISModules() {
  if (!_OAuthInfo || !_IdentityManager) {
    const [oauthMod, idMod] = await Promise.all([import("@arcgis/core/identity/OAuthInfo"), import("@arcgis/core/identity/IdentityManager")]);
    _OAuthInfo = oauthMod.default;
    _IdentityManager = idMod.default;
  }
  return { OAuthInfo: _OAuthInfo, IdentityManager: _IdentityManager };
}

// ─── Core functions (mirror esriHelpers.js) ──────────────────────────────────

/**
 * Initialize OAuthInfo and register with IdentityManager.
 * Only runs once (idempotent). Now async because it lazy-loads @arcgis/core.
 */
export async function initialize(appId?: string, portalUrl?: string): Promise<void> {
  if (initialized) return;

  const finalAppId = appId || APP_ID;
  const finalPortalUrl = portalUrl || PORTAL_URL;

  if (!finalAppId || !finalPortalUrl) {
    console.warn("ArcGIS Auth: Cannot initialize — NEXT_PUBLIC_ESRI_PORTAL_URL and " + "NEXT_PUBLIC_ESRI_APP_ID environment variables are required.");
    return;
  }

  const { OAuthInfo, IdentityManager } = await loadArcGISModules();

  oauthInfo = new OAuthInfo({
    appId: finalAppId,
    portalUrl: finalPortalUrl,
    flowType: "implicit",
    preserveUrlHash: false,
    popup: false,
    expiration: DEFAULT_EXPIRATION_MINUTES,
  });

  IdentityManager.registerOAuthInfos([oauthInfo]);
  initialized = true;
}

/**
 * Check if the user already has a valid sign-in.
 */
export async function checkCurrentStatus(): Promise<__esri.Credential> {
  if (!oauthInfo) throw new Error("ArcGIS Auth not initialized");
  const { IdentityManager } = await loadArcGISModules();
  return IdentityManager.checkSignInStatus(`${oauthInfo.portalUrl}/sharing`);
}

/**
 * Fetch new credentials via IdentityManager (triggers redirect/SAML flow).
 */
async function fetchCredentials(): Promise<__esri.Credential> {
  if (!oauthInfo) throw new Error("ArcGIS Auth not initialized");
  const { IdentityManager } = await loadArcGISModules();
  credential = await IdentityManager.getCredential(`${oauthInfo.portalUrl}/sharing`, {
    error: null,
    oAuthPopupConfirmation: false,
    token: null,
  } as __esri.IdentityManagerGetCredentialOptions);
  return credential;
}

/**
 * Sign in — returns existing credential or triggers the auth flow.
 */
export async function signIn(): Promise<__esri.Credential> {
  if (!credential) {
    try {
      credential = await checkCurrentStatus();
    } catch {
      credential = await fetchCredentials();
    }
  }
  return credential;
}

/**
 * Sign out — destroys all IdentityManager credentials.
 */
export async function signOut(): Promise<void> {
  await signIn();
  const { IdentityManager } = await loadArcGISModules();
  IdentityManager.destroyCredentials();
  credential = undefined;
  clearTokenFromStorage();
}

/**
 * Full login flow: initialize + signIn.
 * Returns the ESRI Credential object.
 */
export async function login(appId?: string, portalUrl?: string): Promise<__esri.Credential> {
  initialize(appId, portalUrl);
  return signIn();
}

// ─── Token processing (mirrors processToken / getAccessToken) ────────────────

/**
 * Process a raw ESRI credential into our normalized ArcGISTokenData structure
 * and persist to sessionStorage.
 */
export function processCredential(cred: __esri.Credential): ArcGISTokenData {
  const now = Date.now();
  const expiresAt = cred.expires ?? now + DEFAULT_EXPIRATION_MINUTES * 60 * 1000;
  const issueDate = cred.creationTime ?? now;
  const renewalDate = expiresAt - MAX_ACTIVE_TIME_MS;

  const tokenData: ArcGISTokenData = {
    accessToken: cred.token,
    expiresAt,
    renewalDate,
    issueDate,
    username: cred.userId ?? "",
    ssl: cred.ssl ?? false,
    portalUrl: cred.server ?? PORTAL_URL,
  };

  void saveTokenToStorage(tokenData);
  return tokenData;
}

/**
 * Also handle the esriJSAPIOAuth sessionStorage key that the ESRI JS API
 * sets during redirect callbacks.
 */
export function processEsriJSAPIOAuth(): ArcGISTokenData | null {
  try {
    const raw = sessionStorage.getItem("esriJSAPIOAuth");
    if (!raw) return null;

    const esriLogin = JSON.parse(raw);

    // Handle the redirect-format session object
    if (esriLogin["/"]) {
      const esriServer = Object.keys(esriLogin["/"])[0];
      const serverData = esriLogin["/"][esriServer];
      const now = Date.now();
      const expiresAt = serverData.expires ?? now;

      const tokenData: ArcGISTokenData = {
        accessToken: serverData.token,
        expiresAt,
        renewalDate: expiresAt - MAX_ACTIVE_TIME_MS,
        issueDate: now,
        username: serverData.userId ?? "",
        ssl: serverData.ssl ?? false,
        portalUrl: esriServer,
      };

      sessionStorage.removeItem("esriJSAPIOAuth");
      void saveTokenToStorage(tokenData);
      return tokenData;
    }

    // Handle flat format
    if (esriLogin.access_token) {
      const now = Date.now();
      const expiresInMs = parseInt(esriLogin.expires_in ?? "0", 10) * 1000;
      const expiresAt = now + expiresInMs;

      const tokenData: ArcGISTokenData = {
        accessToken: esriLogin.access_token,
        expiresAt,
        renewalDate: expiresAt - MAX_ACTIVE_TIME_MS,
        issueDate: now,
        username: esriLogin.username ?? "",
        ssl: esriLogin.ssl === "true" || esriLogin.ssl === true,
        portalUrl: esriLogin.state?.portalUrl ?? PORTAL_URL,
      };

      sessionStorage.removeItem("esriJSAPIOAuth");
      void saveTokenToStorage(tokenData);
      return tokenData;
    }
  } catch (e) {
    console.warn("ArcGIS Auth: Error processing esriJSAPIOAuth", e);
  }
  return null;
}

/**
 * Get a valid access token string.
 *
 * 1. Check esriJSAPIOAuth (redirect callback)
 * 2. Check sessionStorage for cached token
 * 3. If expired or missing, trigger login flow
 *
 * Returns the token string or null.
 */
export async function getAccessToken(): Promise<string | null> {
  // Check for redirect callback data
  const redirectToken = processEsriJSAPIOAuth();
  if (redirectToken && Date.now() < redirectToken.renewalDate) {
    return redirectToken.accessToken;
  }

  // Check cached token
  const cached = await loadTokenFromStorage();
  if (cached && Date.now() < cached.renewalDate) {
    return cached.accessToken;
  }

  // Need to login
  try {
    const cred = await login();
    const tokenData = processCredential(cred);
    if (Date.now() < tokenData.renewalDate) {
      return tokenData.accessToken;
    }
  } catch (err) {
    console.error("ArcGIS Auth: Failed to get access token", err);
  }

  return null;
}

// ─── Session storage persistence ─────────────────────────────────────────────

/**
 * Non-extractable AES-GCM key used to encrypt the token at rest.
 * Lazily created and held only in module memory — it never touches storage,
 * so the sessionStorage blob is undecryptable outside this page's lifetime.
 */
let storageEncryptionKey: CryptoKey | null = null;

async function getStorageEncryptionKey(): Promise<CryptoKey> {
  if (!storageEncryptionKey) {
    storageEncryptionKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  return storageEncryptionKey;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypt the token with AES-GCM and persist to sessionStorage.
 * The encryption key is non-extractable and memory-only, so the stored blob
 * is useless to anyone reading sessionStorage directly.
 */
export async function saveTokenToStorage(token: ArcGISTokenData): Promise<void> {
  try {
    const key = await getStorageEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(token));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
    const record = {
      v: 1,
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(ciphertext)),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (e) {
    console.warn("ArcGIS Auth: Failed to save token to sessionStorage", e);
  }
}

export async function loadTokenFromStorage(): Promise<ArcGISTokenData | null> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const record = JSON.parse(raw);

    // Only the encrypted { v, iv, data } record shape is accepted.
    // Legacy plaintext or malformed records are discarded.
    if (!record || record.v !== 1 || typeof record.iv !== "string" || typeof record.data !== "string") {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const key = await getStorageEncryptionKey();
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(record.iv) }, key, base64ToBytes(record.data));
    const data: ArcGISTokenData = JSON.parse(new TextDecoder().decode(decrypted));

    if (!data.accessToken || !data.expiresAt || Date.now() >= data.expiresAt) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data;
  } catch {
    // Decryption failure (e.g. key rotated after page reload) — treat as missing
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearTokenFromStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function isArcGISAuthConfigured(): boolean {
  return Boolean(PORTAL_URL && APP_ID);
}

export function getPortalUrl(): string {
  return PORTAL_URL;
}

export function getAppId(): string {
  return APP_ID;
}

export function isInitialized(): boolean {
  return initialized;
}
