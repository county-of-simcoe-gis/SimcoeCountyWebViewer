import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/types/mapSettings";

const queryRawMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
  },
}));

const { mapSettings } = await import("@/lib/mapSettings");

function makeUser(overrides: Partial<User> = {}): User {
  return { roles: [], locations: [], ...overrides };
}

describe("mapSettings authorization", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  describe("getAllMaps", () => {
    it("excludes a secured map with empty allowed_roles for a user without the county location", async () => {
      queryRawMock
        .mockResolvedValueOnce([]) // public maps
        .mockResolvedValueOnce([{ map_name: "Secured Empty Roles", description: "", allowed_roles: "", is_secured: true, is_default: false }]); // secured maps

      const user = makeUser({ roles: ["planning"] });

      const result = await new Promise((resolve) => mapSettings.getAllMaps(user, resolve));

      expect(result).toEqual([]);
    });

    it("includes a secured map with empty allowed_roles for a user with the County of Simcoe location", async () => {
      queryRawMock.mockResolvedValueOnce([]).mockResolvedValueOnce([{ map_name: "Secured Empty Roles", description: "", allowed_roles: "", is_secured: true, is_default: false }]);

      const user = makeUser({ locations: ["COUNTY OF SIMCOE"] });

      const result = await new Promise((resolve) => mapSettings.getAllMaps(user, resolve));

      expect(result).toEqual([expect.objectContaining({ map_name: "Secured Empty Roles" })]);
    });

    it("includes a secured map with explicit allowed_roles matching the user's role, regardless of location", async () => {
      queryRawMock.mockResolvedValueOnce([]).mockResolvedValueOnce([{ map_name: "Planning Map", description: "", allowed_roles: "planning", is_secured: true, is_default: false }]);

      const user = makeUser({ roles: ["planning"] });

      const result = await new Promise((resolve) => mapSettings.getAllMaps(user, resolve));

      expect(result).toEqual([expect.objectContaining({ map_name: "Planning Map" })]);
    });

    it("still queries secured maps for a location-only user with no roles", async () => {
      queryRawMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const user = makeUser({ locations: ["COUNTY OF SIMCOE"] });

      await new Promise((resolve) => mapSettings.getAllMaps(user, resolve));

      // Secured maps query (2nd $queryRaw call) must have been made for a location-only user.
      expect(queryRawMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("getMap", () => {
    it("returns the access-denied sentinel for a secured map with empty allowed_roles when the user has no county location", async () => {
      queryRawMock.mockResolvedValueOnce([{ json: "{}", allowed_roles: "", is_secured: true, published: true }]);

      const user = makeUser({ roles: ["planning"] });

      const result = await mapSettings.getMap("SomeMap", user);

      expect(result).toEqual({ accessDenied: true });
    });

    it("returns the access-denied sentinel for a secured map when the user is anonymous", async () => {
      queryRawMock.mockResolvedValueOnce([{ json: "{}", allowed_roles: "", is_secured: true, published: true }]);

      const user = makeUser();

      const result = await mapSettings.getMap("SomeMap", user);

      expect(result).toEqual({ accessDenied: true });
    });

    it("returns undefined when the map does not exist", async () => {
      queryRawMock.mockResolvedValueOnce([]);

      const user = makeUser({ roles: ["planning"] });

      const result = await mapSettings.getMap("MissingMap", user);

      expect(result).toBeUndefined();
    });

    it("returns the map for a secured map with empty allowed_roles when the user has the county location", async () => {
      queryRawMock.mockResolvedValueOnce([{ json: "{}", allowed_roles: "", is_secured: true, published: true }]);

      const user = makeUser({ locations: ["County of Simcoe"] });

      const result = await mapSettings.getMap("SomeMap", user);

      expect(result).toBeDefined();
      expect(result).not.toEqual({ accessDenied: true });
    });
  });

  describe("getDefaultMap", () => {
    it("does not leak a secured default map with empty allowed_roles to a non-county user", async () => {
      queryRawMock.mockResolvedValueOnce([{ json: "{}", allowed_roles: "", is_secured: true, published: true }]);

      const user = makeUser({ roles: ["some_other_role"] });

      const result = await new Promise((resolve) => mapSettings.getDefaultMap(user, resolve));

      expect(result).toEqual({ accessDenied: true });
    });

    it("returns a non-secured default map even if allowed_roles happens to be populated", async () => {
      queryRawMock.mockResolvedValueOnce([{ json: "{}", allowed_roles: "planning", is_secured: false, published: true }]);

      const user = makeUser();

      const result = await new Promise((resolve) => mapSettings.getDefaultMap(user, resolve));

      expect(result).toBeDefined();
    });
  });
});
