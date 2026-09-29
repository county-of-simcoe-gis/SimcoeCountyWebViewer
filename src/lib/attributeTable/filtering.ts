/**
 * Attribute-table column filtering
 * ----------------------------------------------------------------------------
 * Pure matcher used by the grid's client-side filter pass. Kept out of the
 * React component so it can be unit-tested (and eventually moved into the
 * Web Worker with the rest of the store logic).
 *
 * ArcGIS coded-value domains: cells are rendered with the domain *name*
 * (e.g. "Polyvinyl Chloride") while the store keeps the raw code ("PVC").
 * Filtering must therefore match against BOTH the resolved name (what the
 * user sees) and the raw/formatted value (so power users can still type the
 * code). See AttributeTableGrid's cell renderer for the display-side twin.
 */

import { formatFieldValueAsText } from "@/utils/identifyHelpers";
import { resolveDomainValue, type ArcgisCodedValue } from "@/utils/arcgisFieldMetadata";
import type { ColumnType } from "./columnarStore";

/**
 * Return true when a cell should survive the given column filter.
 *
 * @param domains  ArcGIS coded-value domains for the tab (field name lowercase
 *                 → coded values); null for WFS layers.
 * @param field    Column name as stored (may be qualified, e.g. "DBO.x.MATERIAL").
 * @param cell     Raw cell value from `ColumnarStore.getCell`.
 * @param type     Declared column type, used to format the same way the cell
 *                 renderer does (dates, booleans, numbers).
 * @param normalizedFilter  Lowercased filter text.
 */
export function matchesColumnFilter(domains: Record<string, ArcgisCodedValue[]> | null | undefined, field: string, cell: unknown, type: ColumnType | undefined, normalizedFilter: string): boolean {
  const raw = formatFieldValueAsText(field, cell, type).toLowerCase();
  if (raw.includes(normalizedFilter)) return true;

  const domainName = resolveDomainValue(domains, field, cell)?.toLowerCase();
  return domainName !== undefined && domainName.includes(normalizedFilter);
}
