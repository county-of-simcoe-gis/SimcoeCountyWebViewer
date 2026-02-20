"use client";

import { useSession, signIn } from "next-auth/react";
import { useCallback, useMemo } from "react";

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
   * Trigger sign in with Azure AD
   */
  promptLogin: () => void;
  /**
   * Check if user has a specific role
   */
  hasRole: (role: string) => boolean;
  /**
   * Check if user has any of the specified roles
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

  // Debug logging
  // console.log("[useRequireAuth] Session status:", status);
  // console.log("[useRequireAuth] Session data:", session);
  // console.log("[useRequireAuth] Session user:", session?.user);
  // console.log("[useRequireAuth] User roles from session:", session?.user?.roles);
  // console.log("[useRequireAuth] Required roles:", requiredRoles);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && !!session;

  // Get user roles from session
  const roles = useMemo(() => {
    if (!session?.user?.roles) return [];
    return session.user.roles;
  }, [session]);

  // Check if user has a specific role (case-insensitive)
  const hasRole = useCallback(
    (role: string): boolean => {
      return roles.some((r) => r.toLowerCase() === role.toLowerCase());
    },
    [roles],
  );

  // Check if user has any of the specified roles (case-insensitive)
  const hasAnyRole = useCallback(
    (checkRoles: string[]): boolean => {
      return checkRoles.some((role) => roles.some((r) => r.toLowerCase() === role.toLowerCase()));
    },
    [roles],
  );

  // Check if user has access based on required roles
  const hasAccess = useMemo(() => {
    // console.log("[useRequireAuth] Checking hasAccess:");
    // console.log("[useRequireAuth] - isAuthenticated:", isAuthenticated);
    // console.log("[useRequireAuth] - requiredRoles:", requiredRoles);
    // console.log("[useRequireAuth] - user roles:", roles);

    if (!isAuthenticated) {
      // console.log("[useRequireAuth] - Result: false (not authenticated)");
      return false;
    }
    if (requiredRoles.length === 0) {
      // console.log("[useRequireAuth] - Result: true (no specific roles required)");
      return true; // No specific roles required, just authentication
    }
    const result = hasAnyRole(requiredRoles);
    // console.log("[useRequireAuth] - hasAnyRole result:", result);
    return result;
  }, [isAuthenticated, requiredRoles, hasAnyRole, roles]);

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
  };
}

export default useRequireAuth;
