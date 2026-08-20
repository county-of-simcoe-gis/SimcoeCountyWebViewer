/**
 * ArcGIS Auth Provider
 *
 * Client-side component that manages the ArcGIS OAuth / SAML flow using
 * @arcgis/core's OAuthInfo + IdentityManager (mirrors old app's esriHelpers.js).
 *
 *  1. On mount: initialize OAuthInfo / IdentityManager
 *  2. Check for esriJSAPIOAuth redirect callback in sessionStorage
 *  3. Hydrate from cached token in sessionStorage
 *  4. If `required` and no valid token, trigger IdentityManager login
 *     (which handles SAML redirects automatically)
 *
 * Wrap your app (or the portion that needs ArcGIS access) with this provider.
 */

"use client";

import React, { useEffect, useRef } from "react";
import { useArcGISTokenStore } from "@/stores/arcgisTokenStore";
import { initialize, isArcGISAuthConfigured, isInitialized, login, processCredential } from "@/utils/arcgisAuth";

interface ArcGISAuthProviderProps {
  children: React.ReactNode;
  /**
   * When `true`, the provider will trigger IdentityManager login
   * if no valid token is found after hydration. When `false` (default),
   * it only hydrates existing tokens and handles OAuth callbacks.
   */
  required?: boolean;
}

export default function ArcGISAuthProvider({ children, required = false }: ArcGISAuthProviderProps) {
  const setToken = useArcGISTokenStore((s) => s.setToken);
  const hydrate = useArcGISTokenStore((s) => s.hydrate);
  const isAuthenticated = useArcGISTokenStore((s) => s.isAuthenticated);
  const isLoading = useArcGISTokenStore((s) => s.isLoading);
  const initializedRef = useRef(false);

  // ── Initialization effect (runs once) ──────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (!isArcGISAuthConfigured()) {
      console.warn("ArcGIS Auth: PORTAL_URL or APP_ID not configured — skipping init.");
      return;
    }

    // Step 1: Register OAuthInfo with IdentityManager (async — lazy loads @arcgis/core)
    const init = async () => {
      if (!isInitialized()) {
        await initialize();
      }
      // Step 2 & 3: Hydrate from esriJSAPIOAuth callback or sessionStorage
      await hydrate();
    };
    init();
  }, [hydrate]);

  // ── Login effect (triggers when required but not authenticated) ────────────
  useEffect(() => {
    if (!required || isAuthenticated || isLoading || !initializedRef.current || !isArcGISAuthConfigured()) {
      return;
    }

    // Small delay to allow hydration to complete before triggering login
    const timer = setTimeout(async () => {
      const state = useArcGISTokenStore.getState();
      if (state.isAuthenticated || state.isLoading) return;

      try {
        // IdentityManager.getCredential() handles SAML redirect automatically.
        // If the portal uses SAML, the browser will be redirected to the IdP
        // and back; on the return trip, esriJSAPIOAuth will be populated in
        // sessionStorage and picked up by hydrate() on the next mount.
        const cred = await login();
        const tokenData = processCredential(cred);
        setToken(tokenData);
      } catch (err) {
        console.error("ArcGIS Auth: Login failed:", err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [required, isAuthenticated, isLoading, setToken]);

  return <>{children}</>;
}
