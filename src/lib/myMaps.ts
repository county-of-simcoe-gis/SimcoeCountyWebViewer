import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
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
  email: string | null;
  name: string | null;
  lastimported: Date | null;
  jsonhash: string | null;
}

/**
 * Compute SHA-256 hex hash of a JSON string.
 * Matches PostgreSQL: encode(digest(json, 'sha256'), 'hex')
 */
export function computeJsonHash(jsonString: string): string {
  return createHash("sha256").update(jsonString).digest("hex");
}

/**
 * MyMaps data access layer
 */
export class MyMapsService {
  /**
   * Insert a new MyMaps record into the database
   * @param json The MyMaps JSON data to store
   * @param email Optional user email (for authenticated saves)
   * @param name Optional user-assigned name (for authenticated saves)
   * @returns Promise resolving to the inserted record ID
   */
  static async insertMyMaps(
    json: MyMapsSaveData,
    email?: string,
    name?: string
  ): Promise<string> {
    const jsonString = JSON.stringify(json);
    const jsonhash = computeJsonHash(jsonString);

    const record = await prisma.tblMymaps.create({
      data: {
        json: jsonString,
        date_created: new Date(),
        jsonhash,
        ...(email ? { email } : {}),
        ...(name ? { name } : {}),
      },
    });

    return record.id;
  }

  /**
   * Retrieve a MyMaps record by ID
   */
  static async getMyMaps(id: string): Promise<MyMapsRecord | undefined> {
    const record = await prisma.tblMymaps.findUnique({
      where: { id },
    });

    if (!record) {
      return undefined;
    }

    return {
      id: record.id,
      json: record.json,
      date_created: record.date_created,
      email: record.email,
      name: record.name,
      lastimported: record.lastimported,
      jsonhash: record.jsonhash,
    };
  }

  /**
   * Find the first record matching a given JSON hash.
   * Used for public save deduplication.
   */
  static async findByHash(hash: string): Promise<MyMapsRecord | undefined> {
    const record = await prisma.tblMymaps.findFirst({
      where: { jsonhash: hash },
    });

    if (!record) {
      return undefined;
    }

    return {
      id: record.id,
      json: record.json,
      date_created: record.date_created,
      email: record.email,
      name: record.name,
      lastimported: record.lastimported,
      jsonhash: record.jsonhash,
    };
  }

  /**
   * Get all MyMaps records for a given user email.
   * Returns id, name, date_created, lastimported (no json blob for perf).
   */
  static async getMyMapsByUser(
    email: string
  ): Promise<
    Pick<MyMapsRecord, "id" | "name" | "date_created" | "lastimported">[]
  > {
    const records = await prisma.tblMymaps.findMany({
      where: { email },
      select: {
        id: true,
        name: true,
        date_created: true,
        lastimported: true,
      },
      orderBy: { date_created: "desc" },
    });

    return records;
  }

  /**
   * Upsert a MyMaps record by (email, name).
   * If a record with the same email+name exists, update it.
   * Otherwise, create a new record.
   * Returns the record ID.
   */
  static async upsertByNameAndUser(
    email: string,
    name: string,
    json: MyMapsSaveData
  ): Promise<string> {
    const jsonString = JSON.stringify(json);
    const jsonhash = computeJsonHash(jsonString);

    const record = await prisma.tblMymaps.upsert({
      where: {
        email_name: { email, name },
      },
      update: {
        json: jsonString,
        jsonhash,
        date_created: new Date(),
      },
      create: {
        json: jsonString,
        jsonhash,
        email,
        name,
        date_created: new Date(),
      },
    });

    return record.id;
  }

  /**
   * Update the lastimported timestamp for a record.
   * Called when a record is retrieved/imported.
   */
  static async updateLastImported(id: string): Promise<void> {
    await prisma.tblMymaps.update({
      where: { id },
      data: { lastimported: new Date() },
    });
  }
}
