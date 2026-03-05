/**
 * Street address lookup service — ported from SimcoeCountyWebApi/helpers/streetAddresses.js
 */
import { pgWeblive } from "@/lib/database/connections";

export interface Street {
  streetname: string;
  [key: string]: unknown;
}

/**
 * Search streets by name (partial, case-insensitive match).
 */
export async function getStreets(streetName: string): Promise<Street[]> {
  const sql = `SELECT * FROM public.view_all_streets WHERE streetname ILIKE '%' || $1 || '%' ORDER BY streetname LIMIT 50`;
  return pgWeblive.selectAllWithValues<Street>(sql, [streetName]);
}
