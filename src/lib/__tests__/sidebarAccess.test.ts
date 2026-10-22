import { describe, it, expect } from "vitest";
import type { Session } from "next-auth";
import type { SidebarItem } from "@/stores/sidebarStore";
import { filterAccessibleSidebarItems } from "@/lib/sidebarAccess";

const publicItem: SidebarItem = { id: "1", name: "Public", type: "tool", imageName: "p.png", enabled: true, secure: false };
const secureNoKeywords: SidebarItem = { id: "2", name: "SecureOpen", type: "tool", imageName: "s.png", enabled: true, secure: true, securityKeywords: [] };
const secureRoleItem: SidebarItem = { id: "3", name: "SecureRole", type: "tool", imageName: "r.png", enabled: true, secure: true, securityKeywords: ["toggler_solid_waste"] };
const items = [publicItem, secureNoKeywords, secureRoleItem];

function sessionWith(roles: string[], locations: string[] = []): Session {
  return { user: { name: "Test", roles, locations }, expires: "2099-01-01T00:00:00.000Z" };
}

describe("filterAccessibleSidebarItems", () => {
  it("returns only non-secure items when there is no session", () => {
    expect(filterAccessibleSidebarItems(items, null).map((i) => i.name)).toEqual(["Public"]);
  });

  it("shows secure items without keywords to any authenticated user", () => {
    expect(filterAccessibleSidebarItems(items, sessionWith([])).map((i) => i.name)).toEqual(["Public", "SecureOpen"]);
  });

  it("hides secure items whose keywords the user does not have", () => {
    expect(filterAccessibleSidebarItems([secureRoleItem], sessionWith(["planning"]))).toEqual([]);
  });

  it("shows secure items when the user has a matching role (case-insensitive)", () => {
    expect(filterAccessibleSidebarItems([secureRoleItem], sessionWith(["TOGGLER_SOLID_WASTE"])).map((i) => i.name)).toEqual(["SecureRole"]);
  });

  it("shows secure items when the user has a matching location", () => {
    const locationItem: SidebarItem = { ...secureRoleItem, securityKeywords: ["COUNTY OF SIMCOE"] };
    expect(filterAccessibleSidebarItems([locationItem], sessionWith([], ["County of Simcoe"]))).toHaveLength(1);
  });

  it("treats a session without roles or locations as having no keyword access", () => {
    const session = { expires: "2099-01-01T00:00:00.000Z" } as Session;
    expect(filterAccessibleSidebarItems([secureRoleItem], session)).toEqual([]);
  });
});
