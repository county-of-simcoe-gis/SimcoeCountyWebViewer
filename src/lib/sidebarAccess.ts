import type { Session } from "next-auth";
import type { SidebarItem } from "@/stores/sidebarStore";
import { checkUserAccess } from "@/types/mapSettings";

/**
 * Returns the sidebar tools/themes the current session may see.
 * Secure items require a session; if they define securityKeywords, the user must match one role or location.
 */
export function filterAccessibleSidebarItems(items: SidebarItem[], session: Session | null): SidebarItem[] {
  if (!session) return items.filter((item) => !item.secure);

  const user = { roles: session.user?.roles ?? [], locations: session.user?.locations ?? [] };
  return items.filter((item) => {
    if (!item.secure || !item.securityKeywords?.length) return true;
    return checkUserAccess(user, item.securityKeywords, true);
  });
}
