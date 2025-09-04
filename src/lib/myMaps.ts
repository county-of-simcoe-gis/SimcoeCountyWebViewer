import { Postgres } from './database';
import { getSqlDateString } from './common';

/**
 * MyMaps data access layer
 */
export class MyMapsService {
  /**
   * Insert a new MyMaps record into the database
   * @param json The MyMaps JSON data to store
   * @returns Promise resolving to the inserted record ID
   */
  static async insertMyMaps(json: any): Promise<number> {
    // Format the date
    const dtString = getSqlDateString(new Date());

    // Build SQL
    const insertSql = `INSERT INTO public.tbl_mymaps (json, date_created) VALUES ($1, $2) RETURNING id;`;
    const values = [JSON.stringify(json), dtString];

    // Insert record
    const pg = new Postgres({ dbName: 'tabular' });
    try {
      const id = await pg.insertWithReturnId(insertSql, values);
      return id;
    } finally {
      await pg.close();
    }
  }

  /**
   * Retrieve a MyMaps record by ID
   * @param id The ID of the MyMaps record to retrieve
   * @returns Promise resolving to the MyMaps record or undefined if not found
   */
  static async getMyMaps(id: string): Promise<any> {
    const sql = `SELECT * FROM public.tbl_mymaps WHERE id = $1`;
    const values = [id];

    const pg = new Postgres({ dbName: 'tabular' });
    try {
      const result = await pg.selectFirstWithValues(sql, values);
      return result;
    } finally {
      await pg.close();
    }
  }
}
