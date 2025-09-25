import { prisma } from "./prisma";
import type { MyMapsItem, DrawType } from "@/stores/myMapsStore";

/**
 * Interface for MyMaps save data structure
 */
export interface MyMapsSaveData {
  items: MyMapsItem[];
  drawType: DrawType;
  drawColor: string;
}

/**
 * Interface for MyMaps database record
 */
export interface MyMapsRecord {
  id: string;
  json: string | null;
  date_created: Date | null;
}

/**
 * MyMaps data access layer
 */
export class MyMapsService {
  /**
   * Insert a new MyMaps record into the database
   * @param json The MyMaps JSON data to store
   * @returns Promise resolving to the inserted record ID
   */
  static async insertMyMaps(json: MyMapsSaveData): Promise<string> {
    try {
      const record = await prisma.tblMymaps.create({
        data: {
          json: JSON.stringify(json),
          date_created: new Date(),
        },
      });

      return record.id;
    } catch (error) {
      console.error("Error inserting MyMaps record:", error);
      throw error;
    }
  }

  /**
   * Retrieve a MyMaps record by ID
   * @param id The ID of the MyMaps record to retrieve
   * @returns Promise resolving to the MyMaps record or undefined if not found
   */
  static async getMyMaps(id: string): Promise<MyMapsRecord | undefined> {
    try {
      const record = await prisma.tblMymaps.findUnique({
        where: {
          id: id,
        },
      });

      if (!record) {
        return undefined;
      }

      return {
        id: record.id,
        json: record.json,
        date_created: record.date_created,
      };
    } catch (error) {
      console.error("Error fetching MyMaps record:", error);
      throw error;
    }
  }
}
