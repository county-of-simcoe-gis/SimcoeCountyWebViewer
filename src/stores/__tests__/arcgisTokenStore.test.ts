import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useArcGISTokenStore } from "@/stores/arcgisTokenStore";
import * as arcgisAuth from "@/utils/arcgisAuth";

// Reset store before each test and clear any cached module-level promise state.
beforeEach(() => {
  useArcGISTokenStore.setState({
    token: null,
    expiresAt: 0,
    renewalDate: 0,
    username: "",
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  // arcgisTokenStore keeps a module-level refreshPromise; the only public way
  // to reset it is by letting the previous refresh complete. Since we mock
  // login() synchronously below, this is sufficient.
  vi.restoreAllMocks();
});

describe("arcgisTokenStore", () => {
  describe("getValidToken", () => {
    it("should return an existing token without calling login when the token is valid", async () => {
      const loginSpy = vi.spyOn(arcgisAuth, "login").mockResolvedValue({
        token: "fresh-token",
        expires: Date.now() + 24 * 60 * 60 * 1000,
        creationTime: Date.now(),
        userId: "test-user",
        ssl: true,
        server: "https://example.com",
      } as unknown as __esri.Credential);

      useArcGISTokenStore.setState({
        token: "existing-token",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        renewalDate: Date.now() + 12 * 60 * 60 * 1000,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useArcGISTokenStore());
      const token = await result.current.getValidToken();

      expect(token).toBe("existing-token");
      expect(loginSpy).not.toHaveBeenCalled();
    });

    it("should let concurrent callers await the same login and receive the same token", async () => {
      let resolveLogin: ((cred: __esri.Credential) => void) | undefined;

      vi.spyOn(arcgisAuth, "login").mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve;
          }),
      );

      const { result } = renderHook(() => useArcGISTokenStore());

      const promiseA = result.current.getValidToken();
      const promiseB = result.current.getValidToken();

      // Both calls should have started before the login resolves; ensure the
      // store reports a refresh is in flight.
      expect(useArcGISTokenStore.getState().isLoading).toBe(true);
      // login() must be invoked only once despite two concurrent callers.
      expect(arcgisAuth.login).toHaveBeenCalledTimes(1);

      const now = Date.now();
      resolveLogin!({
        token: "shared-token",
        expires: now + 24 * 60 * 60 * 1000,
        creationTime: now,
        userId: "test-user",
        ssl: true,
        server: "https://example.com",
      } as unknown as __esri.Credential);

      const [tokenA, tokenB] = await Promise.all([promiseA, promiseB]);

      expect(tokenA).toBe("shared-token");
      expect(tokenB).toBe("shared-token");
      expect(arcgisAuth.login).toHaveBeenCalledTimes(1);
      expect(useArcGISTokenStore.getState().token).toBe("shared-token");
    });

    it("should return null for all concurrent callers when login fails", async () => {
      vi.spyOn(arcgisAuth, "login").mockRejectedValue(new Error("Login failed"));

      const { result } = renderHook(() => useArcGISTokenStore());

      const promiseA = result.current.getValidToken();
      const promiseB = result.current.getValidToken();

      const [tokenA, tokenB] = await Promise.all([promiseA, promiseB]);

      expect(tokenA).toBeNull();
      expect(tokenB).toBeNull();
      expect(arcgisAuth.login).toHaveBeenCalledTimes(1);
      expect(useArcGISTokenStore.getState().error).toBe("Login failed");
    });

    it("should retry after a failed refresh", async () => {
      vi.spyOn(arcgisAuth, "login")
        .mockRejectedValueOnce(new Error("Login failed"))
        .mockResolvedValue({
          token: "retry-token",
          expires: Date.now() + 24 * 60 * 60 * 1000,
          creationTime: Date.now(),
          userId: "test-user",
          ssl: true,
          server: "https://example.com",
        } as unknown as __esri.Credential);

      const { result } = renderHook(() => useArcGISTokenStore());

      const first = await result.current.getValidToken();
      expect(first).toBeNull();

      const second = await result.current.getValidToken();
      expect(second).toBe("retry-token");
      expect(arcgisAuth.login).toHaveBeenCalledTimes(2);
    });
  });
});
