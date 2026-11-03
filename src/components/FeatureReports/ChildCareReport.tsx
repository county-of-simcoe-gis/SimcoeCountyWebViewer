import React from "react";
import type { FeatureReportProps } from "@/utils/featureReports";
import { AllowedIcon, ReportContainer, ReportHeader } from "@/components/FeatureReports/ReportParts";

interface ChildCareReportProps {
  info: FeatureReportProps;
  showHeader: boolean;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center py-1">
      <label className="w-40 font-semibold">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function Program({ name, available }: { name: string; available: unknown }) {
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <AllowedIcon allowed={Number(available) > 0} alt={name} />
      <label>{name}</label>
    </div>
  );
}

export default function ChildCareReport({ info, showHeader }: ChildCareReportProps) {
  return (
    <ReportContainer>
      {showHeader && <ReportHeader logo="childcare-logo.png" title={info.name} subTitle={info.muni} description="Below is detailed information related to this childcare facility." />}

      <div className="pb-2.5 mb-2.5 border-b border-gray-300">
        <InfoRow label="Address">{info.address}</InfoRow>
        <InfoRow label="Phone">{info.phonenumber}</InfoRow>
        <InfoRow label="In School">{info.inschool === null || info.inschool === undefined ? "N/A" : info.inschool}</InfoRow>
        <InfoRow label="Fee Subsidy">
          <AllowedIcon allowed={info.subsidy === "YES"} alt="Subsidy" />
        </InfoRow>
      </div>

      <div className="text-base text-[#00539b] mb-1.5">Childcare Programs Available</div>
      <div className="grid grid-cols-2">
        <div>
          <Program name="Infants" available={info.lc_inf} />
          <Program name="Toddlers" available={info.lc_todd} />
          <Program name="Preschoolers" available={info.lc_ps} />
        </div>
        <div>
          <Program name="School Age" available={info.lc_sa} />
          <Program name="Nursery School Age" available={info.lc_ns} />
          <Program name="Jr/Sr Kindergarten" available={info.lc_jksk} />
        </div>
      </div>
    </ReportContainer>
  );
}
