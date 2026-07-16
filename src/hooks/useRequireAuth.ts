"use client";

import { useSession, signIn } from "next-auth/react";
import { useCallback, useMemo } from "react";
import { checkUserAccess } from "@/types/mapSettings";

interface UseRequireAuthOptions {
  /**
   * Required roles for access. If empty, any authenticated user can access.
   */
  requiredRoles?: string[];
  /**
   * If true, redirect to signin immediately when not authenticated.
   * If false (default), just return the auth state without redirecting.
   */
  redirectOnUnauthenticated?: boolean;
  /**
   * Custom callback URL after signin. Defaults to current page.
   */
  callbackUrl?: string;
}

interface UseRequireAuthResult {
  /**
   * The current session object
   */
  session: ReturnType<typeof useSession>["data"];
  /**
   * Session status: "loading" | "authenticated" | "unauthenticated"
   */
  status: ReturnType<typeof useSession>["status"];
  /**
   * True while checking authentication status
   */
  isLoading: boolean;
  /**
   * True if user is authenticated
   */
  isAuthenticated: boolean;
  /**
   * True if user has at least one of the required roles
   */
  hasAccess: boolean;
  /**
   * User's roles from the session
   */
  roles: string[];
  /**
   * User's locations from the session
   */
  locations: string[];
  /**
   * Trigger sign in with Azure AD
   */
  promptLogin: () => void;
  /**
   * Check if user has a specific role or location (case-insensitive)
   */
  hasRole: (role: string) => boolean;
  /**
   * Check if user has any of the specified roles or locations (case-insensitive)
   */
  hasAnyRole: (roles: string[]) => boolean;
}

/**
 * Hook for lazy authentication in secured components.
 *
 * Use this hook in components that require authentication.
 * It checks the session status and provides utilities for:
 * - Checking if user is authenticated
 * - Checking if user has required roles
 * - Prompting user to login
 *
 * @example
 * ```tsx
 * const { isAuthenticated, hasAccess, promptLogin, isLoading } = useRequireAuth({
 *   requiredRoles: ['role_name', 'other_role'],
 * });
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (!isAuthenticated) return <LoginPrompt onLogin={promptLogin} />;
 * if (!hasAccess) return <AccessDenied />;
 *
 * return <SecuredContent />;
 * ```
 */
export function useRequireAuth(options: UseRequireAuthOptions = {}): UseRequireAuthResult {
  const { requiredRoles = [], redirectOnUnauthenticated = false, callbackUrl } = options;
  const { data: session, status } = useSession();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && !!session;

  // Get user roles from session
  const roles = useMemo(() => {
    if (!session?.user?.roles) return [];
    return session.user.roles;
  }, [session]);

  // Get user locations from session
  const locations = useMemo(() => {
    if (!session?.user?.locations) return [];
    return session.user.locations;
  }, [session]);

  // Check if user has a specific role or location (case-insensitive).
  // Delegates to the shared checkUserAccess utility so role/location matching
  // semantics stay consistent with the server-side mapSettings authorization.
  const hasRole = useCallback(
    (role: string): boolean => {
      return checkUserAccess({ roles, locations }, [role], true);
    },
    [roles, locations],
  );

  // Check if user has any of the specified roles or locations (case-insensitive).
  const hasAnyRole = useCallback(
    (checkRoles: string[]): boolean => {
      return checkUserAccess({ roles, locations }, checkRoles, true);
    },
    [roles, locations],
  );

  // Check if user has access based on required roles
  const hasAccess = useMemo(() => {
    if (!isAuthenticated) {
      return false;
    }
    if (requiredRoles.length === 0) {
      return true; // No specific roles required, just authentication
    }
    const result = hasAnyRole(requiredRoles);
    return result;
  }, [isAuthenticated, requiredRoles, hasAnyRole]);

  // Trigger sign in
  const promptLogin = useCallback(() => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : undefined;
    signIn("azuread", { callbackUrl: callbackUrl || currentUrl });
  }, [callbackUrl]);

  // Auto-redirect if configured and not authenticated
  if (redirectOnUnauthenticated && !isLoading && !isAuthenticated) {
    promptLogin();
  }

  return {
    session,
    status,
    isLoading,
    isAuthenticated,
    hasAccess,
    roles,
    promptLogin,
    hasRole,
    hasAnyRole,
    locations,
  };
}

export default useRequireAuth;
