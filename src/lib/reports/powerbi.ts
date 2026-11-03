/**
 * PowerBI paginated report export (PDF)
 * Migrated from SimcoeCountyWebApi helpers/powerbi.js + reportGenerator.js
 */

const POWERBI_RESOURCE = "https://analysis.windows.net/powerbi/api";
const POWERBI_API = "https://api.powerbi.com/v1.0/myorg";
const POLL_INTERVAL_MS = 250;
const MAX_POLL_ATTEMPTS = 480;

interface ExportStatus {
  id?: string;
  status?: string;
  percentComplete?: number;
  resourceLocation?: string;
}

function getConfig() {
  return {
    tenantId: process.env.POWERBI_TENANTID,
    workspaceId: process.env.POWERBI_WORKSPACEID,
    clientId: process.env.POWERBI_CLIENTID,
    clientSecret: process.env.POWERBI_CLIENT_SECRET,
  };
}

async function getAccessToken(): Promise<string> {
  const { tenantId, clientId, clientSecret } = getConfig();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId ?? "",
    resource: POWERBI_RESOURCE,
    scope: `${POWERBI_RESOURCE}/.default`,
    client_secret: clientSecret ?? "",
  });
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/token`, {
    method: "POST",
    cache: "no-cache",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await response.json();
  if (!json.access_token) throw new Error("PowerBI token request failed");
  return json.access_token;
}

async function getReportId(token: string, reportName: string): Promise<string> {
  const { workspaceId } = getConfig();
  const response = await fetch(`${POWERBI_API}/groups/${workspaceId}/reports`, {
    cache: "no-cache",
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await response.json();
  const report = (json.value as Array<{ id: string; name: string }> | undefined)?.find((r) => r.name === reportName);
  if (!report) throw new Error(`PowerBI report not found: ${reportName}`);
  return report.id;
}

async function exportReportPdf(reportName: string, parameters: Array<{ name: string; value: string }>): Promise<Buffer> {
  const { workspaceId } = getConfig();
  const token = await getAccessToken();
  const reportId = await getReportId(token, reportName);
  const reportUrl = `${POWERBI_API}/groups/${workspaceId}/reports/${reportId}`;
  const authHeader = { Authorization: `Bearer ${token}` };

  const submit = await fetch(`${reportUrl}/ExportTo`, {
    method: "POST",
    cache: "no-cache",
    headers: { ...authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ format: "PDF", paginatedReportConfiguration: { parameterValues: parameters } }),
  });
  const submitted = (await submit.json()) as ExportStatus;
  if (!submitted.id) throw new Error("PowerBI export submit failed");

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const statusResponse = await fetch(`${reportUrl}/exports/${submitted.id}`, { cache: "no-cache", headers: authHeader });
    const status = (await statusResponse.json()) as ExportStatus;

    if (status.status === "Failed") throw new Error("PowerBI export failed");
    if (status.percentComplete === 100) {
      if (status.status !== "Succeeded" || !status.resourceLocation) throw new Error("PowerBI export did not succeed");
      const file = await fetch(status.resourceLocation, { cache: "no-cache", headers: authHeader });
      if (!file.ok) throw new Error(`PowerBI export download failed: ${file.status}`);
      return Buffer.from(await file.arrayBuffer());
    }
  }
  throw new Error("PowerBI export timed out");
}

export function getPropertyReportPdf(arn: string): Promise<Buffer> {
  return exportReportPdf("Public", [{ name: "ARN", value: arn }]);
}

export function getEconomicDevelopmentReportMlsPdf(mls: string): Promise<Buffer> {
  return exportReportPdf("EconomicDevelopmentPropertyReport", [{ name: "MLSNUMBER", value: mls }]);
}
