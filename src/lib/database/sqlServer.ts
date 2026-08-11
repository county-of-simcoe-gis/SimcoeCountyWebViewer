/**
 * SQL Server database connection utility
 */
import sql from "mssql";

interface SQLServerConfig {
  dbName: string;
  user?: string;
  password?: string;
  server?: string;
  port?: number;
}

export class SQLServer {
  private config: sql.config;
  private poolPromise: Promise<sql.ConnectionPool> | null = null;
  private pool: sql.ConnectionPool | null = null;

  constructor(options: SQLServerConfig) {
    const { dbName, user, password, server, port } = options;

    this.config = {
      server: server || process.env.SQL_HOST || "localhost",
      port: port || parseInt(process.env.SQL_PORT || "1433"),
      database: dbName,
      user: user || this.getUserForDatabase(dbName),
      password: password || this.getPasswordForDatabase(dbName),
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };
  }

  /**
   * Get user credentials based on database name
   */
  private getUserForDatabase(dbName: string): string {
    const dbLower = dbName.toLowerCase();
    if (dbLower === "tabular") {
      return process.env.SQL_TABULAR_USER || "";
    }
    if (dbLower === "weblive") {
      return process.env.SQL_WEBLIVE_USER || "";
    }
    if (dbLower === "geoedit") {
      return process.env.SQL_GEOEDIT_USER || "";
    }
    return "";
  }

  /**
   * Get password based on database name
   */
  private getPasswordForDatabase(dbName: string): string {
    const dbLower = dbName.toLowerCase();
    if (dbLower === "tabular") {
      return process.env.SQL_TABULAR_PASS || "";
    }
    if (dbLower === "weblive") {
      return process.env.SQL_WEBLIVE_PASS || "";
    }
    if (dbLower === "geoedit") {
      return process.env.SQL_GEOEDIT_PASS || "";
    }
    return "";
  }

  /**
   * Get or create connection pool (safe against concurrent calls)
   */
  private async getPool(): Promise<sql.ConnectionPool> {
    if (!this.poolPromise) {
      this.poolPromise = new sql.ConnectionPool(this.config).connect().then((pool) => {
        this.pool = pool;
        return pool;
      });
    }
    return this.poolPromise;
  }

  /**
   * Execute query and return first result
   */
  async selectFirstWithValues<T = Record<string, unknown>>(query: string, values: Array<{ name: string; type: string; typeOpts?: Record<string, unknown>; value: unknown }>): Promise<T | null> {
    try {
      const pool = await this.getPool();
      const request = pool.request();

      // Add parameters
      for (const param of values) {
        const sqlType = this.getSQLType(param.type, param.typeOpts);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        request.input(param.name, sqlType as any, param.value);
      }

      const result = await request.query(query);

      if (result.recordset && result.recordset.length > 0) {
        return result.recordset[0] as T;
      }

      return null;
    } catch (error) {
      console.error("SQL Server query error:", error);
      throw error;
    }
  }

  /**
   * Execute query and return all results
   */
  async selectAllWithValues<T = Record<string, unknown>>(query: string, values: Array<{ name: string; type: string; typeOpts?: Record<string, unknown>; value: unknown }>): Promise<T[]> {
    try {
      const pool = await this.getPool();
      const request = pool.request();

      // Add parameters
      for (const param of values) {
        const sqlType = this.getSQLType(param.type, param.typeOpts);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        request.input(param.name, sqlType as any, param.value);
      }

      const result = await request.query(query);
      return (result.recordset || []) as T[];
    } catch (error) {
      console.error("SQL Server query error:", error);
      throw error;
    }
  }

  /**
   * Execute a query and return every recordset. Useful for stored procedures that
   * may emit intermediate debug result sets before the final output set.
   */
  async executeWithRecordsets<T = Record<string, unknown>>(query: string, values: Array<{ name: string; type: string; typeOpts?: Record<string, unknown>; value: unknown }>): Promise<T[][]> {
    try {
      const pool = await this.getPool();
      const request = pool.request();

      for (const param of values) {
        const sqlType = this.getSQLType(param.type, param.typeOpts);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        request.input(param.name, sqlType as any, param.value);
      }

      const result = await request.query(query);
      return (result.recordsets || []) as T[][];
    } catch (error) {
      console.error("SQL Server executeWithRecordsets error:", error);
      throw error;
    }
  }

  /**
   * Get SQL type from string
   */
  private getSQLType(type: string, typeOpts?: Record<string, unknown>): sql.ISqlType | sql.ISqlTypeFactory {
    switch (type.toLowerCase()) {
      case "nvarchar": {
        const length = typeof typeOpts?.length === "number" ? typeOpts.length : sql.MAX;
        return sql.NVarChar(length);
      }
      case "varchar": {
        const length = typeof typeOpts?.length === "number" ? typeOpts.length : sql.MAX;
        return sql.VarChar(length);
      }
      case "int":
        return sql.Int();
      case "bigint":
        return sql.BigInt();
      case "float":
        return sql.Float();
      case "decimal": {
        const precision = typeof typeOpts?.precision === "number" ? typeOpts.precision : undefined;
        const scale = typeof typeOpts?.scale === "number" ? typeOpts.scale : undefined;
        return sql.Decimal(precision, scale);
      }
      case "bit":
        return sql.Bit();
      case "tinyint":
        return sql.TinyInt();
      case "smallint":
        return sql.SmallInt();
      case "datetime":
        return sql.DateTime();
      case "date":
        return sql.Date();
      default:
        return sql.NVarChar(sql.MAX);
    }
  }

  /**
   * Execute a statement that does not return a recordset (INSERT / UPDATE / DELETE / EXEC).
   * Returns the number of rows affected.
   */
  async executeWithValues(query: string, values: Array<{ name: string; type: string; typeOpts?: Record<string, unknown>; value: unknown }>): Promise<number> {
    try {
      const pool = await this.getPool();
      const request = pool.request();

      for (const param of values) {
        const sqlType = this.getSQLType(param.type, param.typeOpts);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        request.input(param.name, sqlType as any, param.value);
      }

      const result = await request.query(query);
      return result.rowsAffected?.[0] ?? 0;
    } catch (error) {
      console.error("SQL Server execute error:", error);
      throw error;
    }
  }

  /**
   * Warm up the connection pool so the first real query is fast.
   */
  async warmup(): Promise<void> {
    await this.getPool();
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    if (this.poolPromise) {
      const pool = await this.poolPromise;
      await pool.close();
      this.pool = null;
      this.poolPromise = null;
    }
  }
}

export default SQLServer;
