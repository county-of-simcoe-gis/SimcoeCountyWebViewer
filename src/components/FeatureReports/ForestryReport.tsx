import React from "react";
import type { FeatureReportProps } from "@/utils/featureReports";
import { AllowedIcon, ReportContainer, ReportHeader } from "@/components/FeatureReports/ReportParts";

interface ForestryReportProps {
  info: FeatureReportProps;
  showHeader: boolean;
}

function RestrictedActivity({ name, allowed, link }: { name: string; allowed: unknown; link: string }) {
  return (
    <div>
      <AllowedIcon allowed={allowed === "YES"} alt="Activity" />
      <a className="pl-2.5 text-blue-600 hover:underline" href={link} target="_blank" rel="noopener noreferrer">
        {name}
      </a>
    </div>
  );
}

const PERMITTED = ["Cross Country Skiing", "Cycling", "Dog Walking", "Hiking", "Horseback Riding", "Snowshoeing"];
const PROHIBITED = ["Camping", "Fire", "Paintball", "Target Practice", "Vehicles over 400kg"];

export default function ForestryReport({ info, showHeader }: ForestryReportProps) {
  return (
    <ReportContainer>
      {showHeader && (
        <ReportHeader
          logo="forestry-logo.png"
          title={info.Tract}
          subTitle={info.Municipality}
          description={`Below are the permitted, prohibited and restricted activities for the ${info.Tract} Tract within SPRINGWATER. Please ensure to follow these regulations as they are assigned to the forest tract as part of its overall management plan.`}
        />
      )}

      <div className="grid grid-cols-2 gap-y-4">
        <div className="border-r border-gray-300 pr-7 pb-2.5 border-b">
          <div className="text-base text-[#00539b] mb-1.5">Restricted Activities</div>
          <RestrictedActivity name="ATV Clubs" allowed={info.ATV} link="https://ofatv.org/" />
          <RestrictedActivity name="Snowmobile Clubs" allowed={info.Snowmobile} link="https://www.ofsc.on.ca/" />
          <RestrictedActivity name="Trail Riders (OFTR)" allowed={info["Off Road Vehicle"]} link="https://oftr.ca/" />
          <RestrictedActivity name={`Hunting - WMU (${info["Wildlife Management Unit"]})`} allowed={info.Hunting} link="https://www.ontario.ca/document/ontario-hunting-regulations-summary" />
        </div>

        <div className="pl-7 pb-2.5 border-b border-gray-300">
          <div className="text-base text-[#00539b] mb-1.5">Additional Information</div>
          For more information and complete copy of the Recreation Policy, please visit the{" "}
          <a href="https://www.simcoe.ca/dpt/fbl" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            County Forest website
          </a>
        </div>

        <div className="border-r border-gray-300 pr-7">
          <div className="text-base text-[#00539b] mb-1.5">
            Permitted Activities
            <AllowedIcon allowed alt="Permitted" />
          </div>
          <ul className="list-disc pl-5">
            {PERMITTED.map((activity) => (
              <li key={activity}>{activity}</li>
            ))}
          </ul>
        </div>

        <div className="pl-7">
          <div className="text-base text-[#00539b] mb-1.5">
            Prohibited Activities
            <AllowedIcon allowed={false} alt="Prohibited" />
          </div>
          <ul className="list-disc pl-5">
            {PROHIBITED.map((activity) => (
              <li key={activity}>{activity}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="alert alert-info mt-4">
        <span>
          <b>Note:</b> There are no bathrooms or garbage facilities in any County Forest
        </span>
      </div>
    </ReportContainer>
  );
}
