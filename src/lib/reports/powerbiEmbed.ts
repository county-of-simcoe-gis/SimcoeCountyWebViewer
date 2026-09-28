/**
 * PowerBI Embed — stores report parameters into SQL Server
 * Migrated from SimcoeCountyWebApiSecured powerbiEmbed.js
 *
 * The planning report uses this to save a batch of parameters
 * keyed by a UUID. The front-end then opens the PowerBI report
 * viewer with that key, and the viewer reads the parameters from
 * the database.
 */

import { v4 as uuidv4 } from "uuid";
import { SQLServer } from "@/lib/database/sqlServer";

interface ReportParameter {
  name: string;
  value: string | number;
  type: string;
}

/**
 * Insert report parameters into the tabular database and return the batchId.
 *
 * Each parameter becomes a row in the PBI parameter table.
 */
export async function setReportParameters(reportName: string, params: ReportParameter[]): Promise<string> {
  const batchId = uuidv4();
  const db = new SQLServer({ dbName: "tabular" });

  try {
    const promises = params.map(async (param) => {
      const sql = "EXEC [usp_PBI_add_report_parameter] @report, @name, @value, @type, @batchId";
      const values = [
        { name: "report", type: "NVarChar", typeOpts: { length: 50 }, value: reportName },
        { name: "name", type: "NVarChar", typeOpts: { length: 50 }, value: param.name },
        { name: "value", type: "NVarChar", typeOpts: { length: 8000 }, value: String(param.value) },
        { name: "type", type: "NVarChar", typeOpts: { length: 50 }, value: param.type },
        { name: "batchId", type: "NVarChar", typeOpts: { length: 50 }, value: batchId },
      ];

      await db.executeWithValues(sql, values);
    });

    await Promise.all(promises);
    return batchId;
  } finally {
    await db.close();
  }
}
