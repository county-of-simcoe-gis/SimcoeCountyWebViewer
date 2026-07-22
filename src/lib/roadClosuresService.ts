import { sqlTabular } from "@/lib/database/connections";

export type RoadClosureInput = {
  closureId?: string | null;
  streetName: string;
  direction?: string | null;
  reason?: string | null;
  laneImpacted?: string | null;
  accessAllowed?: string | null;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  alternateRoute?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  featureGeoJSON?: string | null;
  createdBy?: string | null;
  /** "Blocks" | "Closures" | "Detours" */
  closureType?: string | null;
  blockId?: string | null;
  detourId?: string | null;
  url?: string | null;
  activeIncident?: string | null;
  streetOverride?: string | null;
  contactPhone?: string | null;
};

/** Insert a road closure into the TABULAR SQL Server database using stored procedure.
 * Returns the new record id on success or null.
 */
export async function insertRoadClosure(input: RoadClosureInput): Promise<number | null> {
  const values = [
    { name: "closureId", type: "NVarChar", typeOpts: { length: 250 }, value: input.closureId ?? null },
    { name: "streetName", type: "NVarChar", typeOpts: { length: 500 }, value: input.streetName ?? null },
    { name: "direction", type: "NVarChar", typeOpts: { length: 50 }, value: input.direction ?? null },
    { name: "reason", type: "NVarChar", typeOpts: { length: 500 }, value: input.reason ?? null },
    { name: "laneImpacted", type: "NVarChar", typeOpts: { length: 250 }, value: input.laneImpacted ?? null },
    { name: "accessAllowed", type: "NVarChar", typeOpts: { length: 250 }, value: input.accessAllowed ?? null },
    { name: "description", type: "NVarChar", value: input.description ?? null },
    { name: "startTime", type: "DateTime", value: input.startTime ?? null },
    { name: "endTime", type: "DateTime", value: input.endTime ?? null },
    { name: "alternateRoute", type: "NVarChar", typeOpts: { length: 1000 }, value: input.alternateRoute ?? null },
    { name: "contactName", type: "NVarChar", typeOpts: { length: 250 }, value: input.contactName ?? null },
    { name: "contactEmail", type: "NVarChar", typeOpts: { length: 500 }, value: input.contactEmail ?? null },
    { name: "featureGeoJSON", type: "NVarChar", value: input.featureGeoJSON ?? null },
    { name: "createdBy", type: "NVarChar", typeOpts: { length: 500 }, value: input.createdBy ?? null },
    { name: "closureType", type: "NVarChar", typeOpts: { length: 20 }, value: input.closureType ?? null },
    { name: "blockId", type: "NVarChar", typeOpts: { length: 50 }, value: input.blockId ?? null },
    { name: "detourId", type: "NVarChar", typeOpts: { length: 50 }, value: input.detourId ?? null },
    { name: "url", type: "NVarChar", typeOpts: { length: 1000 }, value: input.url ?? null },
    { name: "activeIncident", type: "NVarChar", typeOpts: { length: 5 }, value: input.activeIncident ?? null },
    { name: "streetOverride", type: "NVarChar", typeOpts: { length: 5 }, value: input.streetOverride ?? null },
    { name: "contactPhone", type: "NVarChar", typeOpts: { length: 15 }, value: input.contactPhone ?? null },
  ];

  const query =
    "EXEC dbo.usp_insert_road_closure @closureId, @streetName, @direction, @reason, @laneImpacted, @accessAllowed, @description, @startTime, @endTime, @alternateRoute, @contactName, @contactEmail, @featureGeoJSON, @createdBy, @closureType, @blockId, @detourId, @url, @activeIncident, @streetOverride, @contactPhone";

  const result = await sqlTabular.selectFirstWithValues<{ id: number }>(query, values);

  if (result && Object.prototype.hasOwnProperty.call(result, "id")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result as any).id ? Number((result as any).id) : null;
  }

  return null;
}
