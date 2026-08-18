/**
 * Shared database connection singletons.
 * Import from here instead of creating new instances per-route.
 * Uses globalThis to survive module re-evaluation in Next.js dev mode (HMR).
 */
import { SQLServer } from "./sqlServer";
import { Postgres } from "./postgres";

const globalForDb = globalThis as unknown as {
  sqlTabular: SQLServer | undefined;
  sqlGeoEdit: SQLServer | undefined;
  pgWeblive: Postgres | undefined;
  pgTabular: Postgres | undefined;
  dbPoolsWarmedUp: boolean | undefined;
};

export const sqlTabular = globalForDb.sqlTabular ?? new SQLServer({ dbName: "tabular" });
export const sqlGeoEdit = globalForDb.sqlGeoEdit ?? new SQLServer({ dbName: "geoedit" });
export const pgWeblive = globalForDb.pgWeblive ?? new Postgres({ dbName: "weblive" });
export const pgTabular = globalForDb.pgTabular ?? new Postgres({ dbName: "tabular" });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlTabular = sqlTabular;
  globalForDb.sqlGeoEdit = sqlGeoEdit;
  globalForDb.pgWeblive = pgWeblive;
  globalForDb.pgTabular = pgTabular;
}

// Fire-and-forget warmup — only once, skip if pools are already warm
if (!globalForDb.dbPoolsWarmedUp) {
  globalForDb.dbPoolsWarmedUp = true;
  Promise.all([sqlTabular.warmup(), sqlGeoEdit.warmup(), pgWeblive.warmup(), pgTabular.warmup()])
    .then(() => console.log("[DB] Connection pools warmed up"))
    .catch((err) => console.error("[DB] Pool warmup error:", err));
}
