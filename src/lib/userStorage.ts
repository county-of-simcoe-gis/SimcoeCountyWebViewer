import { createHash } from "crypto";
import { pgTabular } from "@/lib/database/connections";

interface StorageResult {
  storage_value: string | null;
}

/**
 * User storage data access layer.
 * Syncs browser localStorage to/from PostgreSQL using the existing
 * usp_get_user_storage / usp_set_user_storage stored procedures
 * on the "tabular" database.
 */
export class UserStorageService {
  /**
   * Retrieve stored localStorage values for a user.
   * @param oid  Azure AD Object ID
   * @param sub  Azure AD subject claim (will be SHA1-hashed as the secondary key)
   */
  static async getStoredValues(oid: string, sub: string): Promise<string | null> {
    const key = createHash("sha1").update(sub).digest("hex");
    const result = await pgTabular.selectFirstWithValues<StorageResult>(
      "SELECT storage_value FROM usp_get_user_storage($1, $2)",
      [oid, key],
    );
    return result?.storage_value ?? null;
  }

  /**
   * Save localStorage values for a user (upserts the full JSON blob).
   * @param oid       Azure AD Object ID
   * @param username  Azure AD preferred_username (stored for reference)
   * @param value     The JSON string of all localStorage key/value pairs
   * @param sub       Azure AD subject claim (will be SHA1-hashed as the secondary key)
   */
  static async setStoredValues(oid: string, username: string, value: string, sub: string): Promise<void> {
    const key = createHash("sha1").update(sub).digest("hex");
    await pgTabular.selectFirstWithValues(
      "SELECT * FROM usp_set_user_storage($1, $2, $3, $4)",
      [oid, username, value, key],
    );
  }
}
