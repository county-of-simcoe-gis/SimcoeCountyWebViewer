"use client";

import React, { useEffect, useState } from "react";
import { apiUrl } from "@/lib/axiosInstance";
import type { FeatureReportProps } from "@/utils/featureReports";
import { ReportContainer, ReportHeader } from "@/components/FeatureReports/ReportParts";

interface ListingImage {
  url: string;
}

interface RealEstateReportProps {
  id: string;
  info: FeatureReportProps;
  showHeader: boolean;
}

export default function RealEstateReport({ id, info, showHeader }: RealEstateReportProps) {
  const [images, setImages] = useState<ListingImage[]>([]);
  const [index, setIndex] = useState(0);
  const listingUrl = info.url_link ? String(info.url_link) : undefined;

  useEffect(() => {
    let cancelled = false;

    fetch(apiUrl(`/api/public/map/theme/realestate/images/${encodeURIComponent(id)}`))
      .then((response) => (response.ok ? response.json() : []))
      .then((data: ListingImage[]) => {
        if (!cancelled && Array.isArray(data)) setImages(data);
      })
      .catch((err) => console.error("Error loading listing images:", err));

    return () => {
      cancelled = true;
    };
  }, [id]);

  const next = () => setIndex((i) => (i + 1) % images.length);
  const previous = () => setIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <ReportContainer>
      {showHeader && (
        <ReportHeader
          logo="simcoe-logo.png"
          title={info.Address}
          subTitle={info.Municipality}
          description={
            <>
              {`Below is information related to ${info.Address}. If you wish to get detailed information about this real estate listing please visit the `}
              <a href={listingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Realtor® website.
              </a>
            </>
          }
        />
      )}

      {images.length > 0 && (
        <div className="relative bg-black">
          <img src={images[index].url} alt={`Listing ${index + 1}`} className="w-full max-h-[450px] object-contain" />
          {images.length > 1 && (
            <>
              <button className="btn btn-circle btn-sm absolute left-2 top-1/2 -translate-y-1/2" onClick={previous} aria-label="Previous image">
                ‹
              </button>
              <button className="btn btn-circle btn-sm absolute right-2 top-1/2 -translate-y-1/2" onClick={next} aria-label="Next image">
                ›
              </button>
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">{`${index + 1} / ${images.length}`}</div>
            </>
          )}
        </div>
      )}

      <div className="py-2.5 my-2.5 border-y border-gray-300 text-center">
        <a className="btn btn-info" href={listingUrl} target="_blank" rel="noopener noreferrer">
          View Listing on Realtor ®
        </a>
      </div>
      <div className="alert alert-info">Information provided by local real estate boards, Barrie, Southern Georgian Bay and Lakelands</div>
    </ReportContainer>
  );
}
