/**
 * Property Report API Route
 * GET /api/public/reports/property/[arn]
 */
import { NextRequest, NextResponse } from "next/server";
import { sqlTabular, pgWeblive } from "@/lib/database/connections";
import { createCanvas } from "canvas";


interface PropertyReportResult {
  ARN: string;
  Municipality?: string;
  PropertyType?: string;
  Address: string;
  AssessedValue: string;
  ReportURL?: string;
  HasZoning?: boolean;
  EmergencyService: {
    PoliceStation?: string;
    PoliceStationArn?: string;
    FireStation?: string;
    FireStationArn?: string;
  };
  WasteCollection: {
    GarbageDay?: string;
    LandfillLocation_General?: string;
    LandfillLocation_GeneralPin?: string;
    LandfillLocation_Hazardous?: string;
    LandfillLocation_HazardousPin?: string;
    BagTagleLocation1?: string;
    BagTagleLocation2?: string;
    BagTagleLocation3?: string;
    WasteURL?: string;
  };
  Schools: {
    CatholicElementry?: string;
    CatholicSecondary?: string;
    CatholicBoardWebsiteURL?: string;
    PublicElementry?: string;
    PublicSecondary?: string;
    PublicLookup?: string;
    PublicBoardWebsiteURL?: string;
  };
  Other: {
    Library?: string;
    LibraryUrl?: string;
    LibraryArn?: string;
    ClosestFireHydrant?: string;
    MunicipalAdminCentre?: string;
    MunicipalAdminCentreUrl?: string;
    MunicipalAdminCentreArn?: string;
    ClosestHospital?: string;
    ClosestHospitalAddress?: string;
    ClosestHospitalUrl?: string;
    BroadbandSpeed?: string;
  };
}

interface SQLResult {
  ARN: string;
  PropertyDescripter?: string;
  StNum?: string;
  FullName?: string;
  Muni?: string;
  AssessedValue?: number;
  REPORT_PUBLIC?: string;
  HasZoning?: boolean;
  POLICE_NAME?: string;
  POLICE_ARN?: string;
  FIREHALL_STATION_NAME?: string;
  FIREHALL_KM?: number;
  FIREHALL_ARN?: string;
  REGULAR_COLLECTION_DAY?: string;
  LANDFILL_CLOSEST_NAME?: string;
  LANDFILL_CLOSEST_KM?: number;
  LANDFILL_CLOSEST_PIN?: string;
  LANDFILL_HAZARD_NAME?: string;
  LANDFILL_HAZARD_KM?: number;
  LANDFILL_HAZARD_PIN?: string;
  BAG_TAG1_NAME?: string;
  BAG_TAG1_KM?: number;
  BAG_TAG2_NAME?: string;
  BAG_TAG2_KM?: number;
  BAG_TAG3_NAME?: string;
  BAG_TAG3_KM?: number;
  SCHOOL_CATHOLIC_ELEMENTARY?: string;
  SCHOOL_CATHOLIC_SECONDARY?: string;
  SCHOOL_PUBLIC_ELEMENTARY?: string;
  SCHOOL_PUBLIC_SECONDARY?: string;
  LIBRARY_NAME?: string;
  LIBRARY_KM?: number;
  LIBRARY_URL?: string;
  LIBRARY_ARN?: string;
  FIRE_HYDRANT_KM?: number;
  ADMIN_NAME?: string;
  ADMIN_KM?: number;
  ADMIN_URL?: string;
  ADMIN_ARN?: string;
  HOSPITAL_NAME?: string;
  HOSPITAL_URL?: string;
}

interface BroadbandResult {
  potential_coverage: string;
  order_field: number;
}

/**
 * Generate assessed value image as base64 PNG
 */
function getAssessedValueImage(value: number | string): string {
  const assessedValueFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  });

  const assessedValueCanvas = createCanvas(300, 15);
  const assessedValueTextContext = assessedValueCanvas.getContext("2d");

  assessedValueTextContext.textAlign = "left";
  assessedValueTextContext.fillStyle = "#fff";
  assessedValueTextContext.fillRect(0, 0, assessedValueCanvas.width, assessedValueCanvas.height);
  assessedValueTextContext.fillStyle = "#000";
  assessedValueTextContext.font = "normal 10px Garuda, Arial, Helvetica";
  assessedValueTextContext.textBaseline = "top";

  if (typeof value === "number" && !isNaN(value)) {
    assessedValueTextContext.fillText(value > 0 ? assessedValueFormatter.format(value) : "unknown", 0, 0);
  } else {
    assessedValueTextContext.fillText(String(value), 0, 0);
  }

  return assessedValueCanvas.toDataURL();
}

/**
 * Get broadband speed information
 */
const broadbandSql = `
  SELECT potential_coverage,
         CASE potential_coverage 
           WHEN 'Up to or exceeds 50 Mbps Down/10 Mbps Up' THEN 1
           WHEN 'Up to 25 Mbps Down/5 Mbps Up' THEN 2 
           WHEN 'Up to 10 Mbps Down/2 Mbps Up' THEN 3
           WHEN 'Up to 5 Mbps Down/1 Mbps Up' THEN 4 
           WHEN 'Less than 5 Mbps Down/1 Mbps Up' THEN 5 
           ELSE 6 
         END AS order_field 
  FROM public.ssmatview_can_isp_combined_parcels 
  WHERE arn = $1 
  ORDER BY order_field 
  LIMIT 1
`;

async function getBroadbandSpeed(arn: string): Promise<string> {
  try {
    const broadbandResult = await pgWeblive.selectFirstWithValues<BroadbandResult>(broadbandSql, [arn]);

    if (broadbandResult?.potential_coverage) {
      return broadbandResult.potential_coverage;
    }
    return "No information available";
  } catch (error) {
    console.error("Error fetching broadband speed:", error);
    return "No information available";
  }
}

/**
 * GET handler for property report
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ arn: string }> }) {
  const { arn } = await params;

  if (!arn) {
    return NextResponse.json({ error: "ARN parameter is required" }, { status: 400 });
  }

  try {
    const sql = `
      SELECT *
      FROM TABULAR.dbo.view_PropertyReportInfo_map
      WHERE ARN = @arn
    `;
    const values = [{ name: "arn", type: "NVarChar", typeOpts: { length: 250 }, value: arn }];

    // Run both DB queries in parallel
    const [result, broadbandSpeed] = await Promise.all([
      sqlTabular.selectFirstWithValues<SQLResult>(sql, values),
      getBroadbandSpeed(arn),
    ]);

    if (!result) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Messages for special municipalities
    const barrieMsg = "Please contact City of Barrie.";
    const orilliaMsg = "Please contact City of Orillia.";

    // Format result
    const arnPrefix = result.ARN.substring(0, 4);
    const isBarrie = arnPrefix === "4342";
    const isOrillia = arnPrefix === "4352";
    const resultFormatted: PropertyReportResult = {
      ARN: result.ARN,
      Municipality: result.Muni || undefined,
      PropertyType: isBarrie ? "N/A" : result.PropertyDescripter,
      Address: result.StNum || result.FullName || result.Muni ? `${result.StNum || ""} ${result.FullName || ""}, ${result.Muni || ""}`.trim() : "(Not Available)",
      AssessedValue: getAssessedValueImage(isBarrie ? "N/A" : result.AssessedValue || 0),
      ReportURL: result.REPORT_PUBLIC,
      HasZoning: result.HasZoning,
      EmergencyService: {
        PoliceStation: result.POLICE_NAME,
        PoliceStationArn: result.POLICE_ARN,
        FireStation: result.FIREHALL_STATION_NAME ? `${result.FIREHALL_STATION_NAME} (${result.FIREHALL_KM} KM)` : undefined,
        FireStationArn: result.FIREHALL_ARN,
      },
      WasteCollection: isBarrie
        ? {
            GarbageDay: barrieMsg,
            LandfillLocation_General: barrieMsg,
            LandfillLocation_GeneralPin: barrieMsg,
            LandfillLocation_Hazardous: barrieMsg,
            LandfillLocation_HazardousPin: barrieMsg,
            BagTagleLocation1: barrieMsg,
            BagTagleLocation2: barrieMsg,
            BagTagleLocation3: barrieMsg,
            WasteURL: barrieMsg,
          }
        : isOrillia
          ? {
              GarbageDay: orilliaMsg,
              LandfillLocation_General: orilliaMsg,
              LandfillLocation_GeneralPin: orilliaMsg,
              LandfillLocation_Hazardous: orilliaMsg,
              LandfillLocation_HazardousPin: orilliaMsg,
              BagTagleLocation1: orilliaMsg,
              BagTagleLocation2: orilliaMsg,
              BagTagleLocation3: orilliaMsg,
              WasteURL: orilliaMsg,
            }
          : {
              GarbageDay: result.REGULAR_COLLECTION_DAY,
              LandfillLocation_General: result.LANDFILL_CLOSEST_NAME ? `${result.LANDFILL_CLOSEST_NAME} (${result.LANDFILL_CLOSEST_KM} KM)` : undefined,
              LandfillLocation_GeneralPin: result.LANDFILL_CLOSEST_PIN,
              LandfillLocation_Hazardous: result.LANDFILL_HAZARD_NAME ? `${result.LANDFILL_HAZARD_NAME} (${result.LANDFILL_HAZARD_KM} KM)` : undefined,
              LandfillLocation_HazardousPin: result.LANDFILL_HAZARD_PIN,
              BagTagleLocation1: result.BAG_TAG1_NAME ? `${result.BAG_TAG1_NAME} (${result.BAG_TAG1_KM} KM)` : undefined,
              BagTagleLocation2: result.BAG_TAG2_NAME ? `${result.BAG_TAG2_NAME} (${result.BAG_TAG2_KM} KM)` : undefined,
              BagTagleLocation3: result.BAG_TAG3_NAME ? `${result.BAG_TAG3_NAME} (${result.BAG_TAG3_KM} KM)` : undefined,
              WasteURL: "http://www.simcoe.ca/SolidWasteManagement/Pages/schedules.aspx",
            },
      Schools: {
        CatholicElementry: result.SCHOOL_CATHOLIC_ELEMENTARY,
        CatholicSecondary: result.SCHOOL_CATHOLIC_SECONDARY,
        CatholicBoardWebsiteURL: "http://smcdsb.on.ca",
        PublicElementry: result.SCHOOL_PUBLIC_ELEMENTARY,
        PublicSecondary: result.SCHOOL_PUBLIC_SECONDARY,
        PublicLookup: "https://www4.scdsb.on.ca/app/HomeSchoolLocator/public/SchoolLookup",
        PublicBoardWebsiteURL: "http://scdsb.on.ca",
      },
      Other: {
        Library: result.LIBRARY_NAME ? `${result.LIBRARY_NAME} (${result.LIBRARY_KM} KM)` : undefined,
        LibraryUrl: result.LIBRARY_URL,
        LibraryArn: result.LIBRARY_ARN,
        ClosestFireHydrant: isBarrie ? barrieMsg : isOrillia ? orilliaMsg : result.FIRE_HYDRANT_KM ? `(${result.FIRE_HYDRANT_KM} KM)` : "Greater than 2",
        MunicipalAdminCentre: result.ADMIN_NAME ? `${result.ADMIN_NAME} (${result.ADMIN_KM} KM)` : undefined,
        MunicipalAdminCentreUrl: result.ADMIN_URL,
        MunicipalAdminCentreArn: result.ADMIN_ARN,
        ClosestHospital: result.HOSPITAL_NAME,
        ClosestHospitalAddress: result.HOSPITAL_URL,
        ClosestHospitalUrl: result.HOSPITAL_URL,
        BroadbandSpeed: broadbandSpeed,
      },
    };

    return NextResponse.json(resultFormatted);
  } catch (error) {
    console.error("Error fetching property report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
