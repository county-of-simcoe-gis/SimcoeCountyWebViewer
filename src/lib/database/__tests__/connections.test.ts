import { describe, it, expect, vi, beforeEach } from "vitest";

const sqlInstances: unknown[] = [];
const pgInstances: unknown[] = [];

vi.mock("../sqlServer", () => ({
  SQLServer: class {
    constructor() {
      sqlInstances.push(this);
    }
    warmup = vi.fn().mockResolvedValue(undefined);
  },
}));
vi.mock("../postgres", () => ({
  Postgres: class {
    constructor() {
      pgInstances.push(this);
    }
    warmup = vi.fn().mockResolvedValue(undefined);
  },
}));

describe("database connections", () => {
  beforeEach(() => {
    vi.resetModules();
    sqlInstances.length = 0;
    pgInstances.length = 0;
    const g = globalThis as Record<string, unknown>;
    for (const key of ["sqlTabular", "sqlGeoEdit", "sqlWeblive", "sqlAppTrack", "pgWeblive", "pgTabular", "dbPoolsWarmedUp"]) delete g[key];
  });

  it("reuses the same instances when the module is evaluated again in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const first = await import("../connections");
    vi.resetModules();
    const second = await import("../connections");

    expect(second.sqlTabular).toBe(first.sqlTabular);
    expect(second.pgWeblive).toBe(first.pgWeblive);
    expect(sqlInstances).toHaveLength(4);
    expect(pgInstances).toHaveLength(2);
    vi.unstubAllEnvs();
  });
});
