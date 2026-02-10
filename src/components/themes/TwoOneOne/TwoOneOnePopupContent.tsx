"use client";

import { FaExternalLinkAlt } from "react-icons/fa";

interface TwoOneOnePopupContentProps {
  name: string;
  description: string | null;
  website: string | null;
  recordNumber: string | null;
  isFrench: boolean;
}

export default function TwoOneOnePopupContent({ name, description, website, recordNumber, isFrench }: TwoOneOnePopupContentProps) {
  const detailsUrl = isFrench ? `https://simcoecounty.cioc.ca/record/${recordNumber}?Ln=fr-CA` : `https://simcoecounty.cioc.ca/record/${recordNumber}`;

  return (
    <div className="min-w-[280px] max-w-[350px]">
      {/* Name */}
      <div className="mb-3">
        <div className="font-semibold text-xs text-base-content/70 mb-1">{isFrench ? "Nom" : "Name"}</div>
        <div className="text-sm">{name}</div>
      </div>

      {/* Description */}
      {description && (
        <div className="mb-3">
          <div className="font-semibold text-xs text-base-content/70 mb-1">Description</div>
          <div className="text-sm max-h-24 overflow-y-auto">{description}</div>
        </div>
      )}

      {/* Website */}
      {website && (
        <div className="mb-3">
          <div className="font-semibold text-xs text-base-content/70 mb-1">{isFrench ? "Site Web" : "Website"}</div>
          <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
            <FaExternalLinkAlt className="w-3 h-3" />
            {isFrench ? "Cliquer pour ouvrir" : "Click To Open"}
          </a>
        </div>
      )}

      {/* View on 211 */}
      {recordNumber && (
        <div className="mb-2">
          <div className="font-semibold text-xs text-base-content/70 mb-1">{isFrench ? "Voir les détails sur 211" : "View details on 211 Community Connections"}</div>
          <a href={detailsUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
            <FaExternalLinkAlt className="w-3 h-3" />
            {isFrench ? "Cliquer pour ouvrir" : "Click To Open"}
          </a>
        </div>
      )}
    </div>
  );
}
