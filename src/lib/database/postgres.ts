/**
 * PostgreSQL database connection utility
 */
import { Pool, PoolConfig } from "pg";

interface PostgresConfig {
  dbName: string;
  user?: string;
  password?: string;
  host?: string;
  port?: number;
}

export class Postgres {
  private pool: Pool;

  constructor(options: PostgresConfig) {
    const { dbName, user, password, host, port } = options;

    const config: PoolConfig = {
      host: host || process.env.PG_HOST || "localhost",
      port: port || parseInt(process.env.PG_PORT || "5432"),
      database: dbName,
      user: user || this.getUserForDatabase(dbName),
      password: password || this.getPasswordForDatabase(dbName),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(config);

    // Handle pool errors
    this.pool.on("error", (err) => {
      console.error("Unexpected PostgreSQL pool error:", err);
    });
  }

  /**
   * Get user credentials based on database name
   */
  private getUserForDatabase(dbName: string): string {
    const dbLower = dbName.toLowerCase();
    if (dbLower === "tabular") {
      return process.env.PG_TABULAR_USER || "";
    }
    if (dbLower === "weblive") {
      return process.env.PG_WEBLIVE_USER || "";
    }
    return "";
  }

  /**
   * Get password based on database name
   */
  private getPasswordForDatabase(dbName: string): string {
    const dbLower = dbName.toLowerCase();
    if (dbLower === "tabular") {
      return process.env.PG_TABULAR_PASS || "";
    }
    if (dbLower === "weblive") {
      return process.env.PG_WEBLIVE_PASS || "";
    }
    return "";
  }

  /**
   * Execute query and return all results
   */
  async selectAllWithValues<T = Record<string, unknown>>(query: string, values: unknown[]): Promise<T[]> {
    try {
      const result = await this.pool.query(query, values);
      return result.rows as T[];
    } catch (error) {
      console.error("PostgreSQL query error:", error);
      throw error;
    }
  }

  /**
   * Execute query with no parameters and return all results
   */
  async selectAll<T = Record<string, unknown>>(query: string): Promise<T[]> {
    try {
      const result = await this.pool.query(query);
      return result.rows as T[];
    } catch (error) {
      console.error("PostgreSQL query error:", error);
      throw error;
    }
  }

  /**
   * Execute query and return first result
   */
  async selectFirstWithValues<T = Record<string, unknown>>(query: string, values: unknown[]): Promise<T | null> {
    try {
      const result = await this.pool.query(query, values);
      if (result.rows && result.rows.length > 0) {
        return result.rows[0] as T;
      }
      return null;
    } catch (error) {
      console.error("PostgreSQL query error:", error);
      throw error;
    }
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Eagerly establish a connection in the pool (call at startup to avoid cold-start latency).
   * Returns a promise that resolves when a connection is ready.
   */
  async warmup(): Promise<void> {
    const client = await this.pool.connect();
    client.release();
  }
}

export default Postgres;
