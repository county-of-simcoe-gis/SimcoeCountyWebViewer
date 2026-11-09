import { describe, it, expect, vi, beforeEach } from "vitest";

const connect = vi.fn();

vi.mock("mssql", () => {
  class ConnectionPool {
    connect = connect;
    on = vi.fn();
  }
  return { default: { ConnectionPool, MAX: 2147483647 } };
});

import { SQLServer } from "../sqlServer";

describe("SQLServer pool", () => {
  beforeEach(() => {
    connect.mockReset();
  });

  it("retries connecting after a failed attempt instead of caching the rejection", async () => {
    const pool = { on: vi.fn(), request: vi.fn(() => ({ input: vi.fn(), query: vi.fn().mockResolvedValue({ recordset: [{ a: 1 }] }) })) };
    connect.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(pool);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const db = new SQLServer({ dbName: "tabular" });
    await expect(db.selectFirstWithValues("select 1", [])).rejects.toThrow("down");
    await expect(db.selectFirstWithValues("select 1", [])).resolves.toEqual({ a: 1 });
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
