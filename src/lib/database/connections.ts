/**
 * Shared database connection singletons.
 * Import from here instead of creating new instances per-route.
 * Instances live on globalThis because Next.js can evaluate this module once per route
 * bundle (and again on HMR); per-module pools would multiply connections to the databases.
 */
import { SQLServer } from "./sqlServer";
import { Postgres } from "./postgres";

const globalForDb = globalThis as unknown as {
  sqlTabular: SQLServer | undefined;
  sqlGeoEdit: SQLServer | undefined;
  sqlWeblive: SQLServer | undefined;
  sqlAppTrack: SQLServer | undefined;
  pgWeblive: Postgres | undefined;
  pgTabular: Postgres | undefined;
  dbPoolsWarmedUp: boolean | undefined;
};

export const sqlTabular = (globalForDb.sqlTabular ??= new SQLServer({ dbName: "tabular" }));
export const sqlGeoEdit = (globalForDb.sqlGeoEdit ??= new SQLServer({ dbName: "geoedit" }));
export const sqlWeblive = (globalForDb.sqlWeblive ??= new SQLServer({ dbName: "weblive" }));
export const sqlAppTrack = (globalForDb.sqlAppTrack ??= new SQLServer({ dbName: "scapptrack" }));
export const pgWeblive = (globalForDb.pgWeblive ??= new Postgres({ dbName: "weblive" }));
export const pgTabular = (globalForDb.pgTabular ??= new Postgres({ dbName: "tabular" }));

// Warm only the pools used by public endpoints, once per process
if (!globalForDb.dbPoolsWarmedUp) {
  globalForDb.dbPoolsWarmedUp = true;
  Promise.all([sqlTabular.warmup(), pgWeblive.warmup(), pgTabular.warmup()])
    .then(() => console.log("[DB] Connection pools warmed up"))
    .catch((err) => console.error("[DB] Pool warmup error:", err));
}
