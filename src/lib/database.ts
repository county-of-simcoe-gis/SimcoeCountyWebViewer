import { Pool, PoolConfig } from 'pg';

interface PostgresOptions {
  dbName: string;
}

export class Postgres {
  private pool: Pool;
  private dbName: string;

  constructor(options: PostgresOptions) {
    this.dbName = options.dbName;
    
    let connectionConfig: PoolConfig;
    
    if (options.dbName === 'tabular') {
      connectionConfig = {
        user: process.env.PG_TABULAR_USER,
        host: process.env.PG_HOST,
        database: process.env.PG_TABULAR_DB,
        password: process.env.PG_TABULAR_PASS,
        port: parseInt(process.env.PG_PORT || '5432'),
      };
    } else {
      throw new Error(`Unknown database name: ${options.dbName}`);
    }

    this.pool = new Pool(connectionConfig);

    // Error logging for pool events
    this.pool.on('error', (err) => {
      console.error(`[POSTGRES-${this.dbName.toUpperCase()}] Pool error:`, {
        error: err.message,
        stack: err.stack,
        time: new Date().toISOString(),
      });
    });
  }

  private _logError(error: Error, sql: string, values?: any[], method?: string): void {
    const truncatedSql = sql.length > 200 ? sql.substring(0, 200) + '...' : sql;
    console.error(`[POSTGRES-${this.dbName.toUpperCase()}] ${method} error:`, {
      error: error.message,
      sql: truncatedSql,
      values: values,
      stack: error.stack,
      time: new Date().toISOString(),
    });
  }

  async insertWithReturnId(sql: string, values: any[]): Promise<number> {
    try {
      const result = await this.pool.query(sql, values);
      return result.rows[0]?.id || null;
    } catch (error) {
      this._logError(error as Error, sql, values, 'insertWithReturnId');
      throw error;
    }
  }

  async selectFirstWithValues(sql: string, values: any[]): Promise<any> {
    try {
      const result = await this.pool.query(sql, values);
      return result.rows[0] || undefined;
    } catch (error) {
      this._logError(error as Error, sql, values, 'selectFirstWithValues');
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export default Postgres;
