const normalizeRole = (role: string) =>
  role
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "_");

/** Exact (case-insensitive) role match; substring matching would let e.g. "planning_readonly" pass as "planning". */
export function hasAnyRole(userRoles: string[] | undefined, requiredRoles: readonly string[]): boolean {
  if (!userRoles?.length) return false;
  const required = new Set(requiredRoles.map(normalizeRole));
  return userRoles.some((role) => required.has(normalizeRole(role)));
}
