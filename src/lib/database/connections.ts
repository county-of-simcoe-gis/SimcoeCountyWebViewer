/**
 * Shared database connection singletons.
 * Import from here instead of creating new instances per-route.
 * Uses globalThis to survive module re-evaluation in Next.js dev mode (HMR).
 */
import { SQLServer } from "./sqlServer";
import { Postgres } from "./postgres";

const globalForDb = globalThis as unknown as {
  sqlTabular: SQLServer | undefined;
  pgWeblive: Postgres | undefined;
  dbPoolsWarmedUp: boolean | undefined;
};

export const sqlTabular = globalForDb.sqlTabular ?? new SQLServer({ dbName: "tabular" });
export const pgWeblive = globalForDb.pgWeblive ?? new Postgres({ dbName: "weblive" });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlTabular = sqlTabular;
  globalForDb.pgWeblive = pgWeblive;
}

// Fire-and-forget warmup — only once, skip if pools are already warm
if (!globalForDb.dbPoolsWarmedUp) {
  globalForDb.dbPoolsWarmedUp = true;
  Promise.all([
    sqlTabular.warmup(),
    pgWeblive.warmup(),
  ]).then(() => console.log("[DB] Connection pools warmed up"))
    .catch((err) => console.error("[DB] Pool warmup error:", err));
}
