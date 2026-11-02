import React from "react";
import { basePath } from "@/lib/axiosInstance";

export const reportImage = (fileName: string): string => `${basePath}/images/featurereports/${fileName}`;

interface ReportHeaderProps {
  logo: string;
  title?: string | number | null;
  subTitle?: string | number | null;
  description: React.ReactNode;
}

export function ReportHeader({ logo, title, subTitle, description }: ReportHeaderProps) {
  return (
    <>
      <div className="flex items-center gap-6 pb-2.5 mb-2.5 border-b border-gray-300">
        <img src={reportImage(logo)} alt="logo" />
        <span className="text-xl tracking-[4px] text-[#00539b]">{title}</span>
        {subTitle && <span className="text-lg tracking-[4px] text-gray-700">{`(${subTitle})`}</span>}
      </div>
      <div className="pb-2.5 mb-2.5 border-b border-gray-300">{description}</div>
    </>
  );
}

export function ReportContainer({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[700px] mx-auto mt-2.5 mb-12 px-4 text-gray-900">{children}</div>;
}

export function AllowedIcon({ allowed, alt }: { allowed: boolean; alt: string }) {
  return <img src={reportImage(allowed ? "check.png" : "cross.png")} alt={alt} className="inline-block" />;
}
