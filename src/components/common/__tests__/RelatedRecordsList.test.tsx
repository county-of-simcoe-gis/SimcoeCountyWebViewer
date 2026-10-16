import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/testServer";
import { RelatedRecordsList } from "@/components/common/RelatedRecordsList";
import { clearArcgisFieldMetadataCache } from "@/utils/arcgisFieldMetadata";

const SERVICE_URL = "https://example.com/arcgis/rest/services/Operations/Roads/MapServer";
const LAYER_URL = `${SERVICE_URL}/31`;
const RELATED_URL = `${SERVICE_URL}/67`;
const relationship = { id: 5, name: "Has Videos", relatedTableId: 67 };
const metadata = { aliases: {}, domains: {}, relationships: [relationship], layerUrl: LAYER_URL, secured: false };

describe("RelatedRecordsList", () => {
  beforeEach(() => {
    clearArcgisFieldMetadataCache();
  });

  it("lists related items by display field and expands to show their fields", async () => {
    server.use(
      http.get(`${LAYER_URL}/queryRelatedRecords`, () =>
        HttpResponse.json({
          relatedRecordGroups: [{ objectId: 12345, relatedRecords: [{ attributes: { OBJECTID: 1, TYPE: "Inspection", LINK: "https://example.com/v1.mp4" } }] }],
        }),
      ),
      http.get(RELATED_URL, () => HttpResponse.json({ displayField: "TYPE", fields: [] })),
    );

    render(<RelatedRecordsList metadata={metadata} relationship={relationship} objectId="12345" />);

    const item = await screen.findByRole("button", { name: "Inspection" });
    fireEvent.click(item);
    expect(await screen.findByText("LINK:")).toBeTruthy();
  });

  it("shows epoch-ms dates in local time", async () => {
    const ms = 1669599600000;
    server.use(
      http.get(`${LAYER_URL}/queryRelatedRecords`, () => HttpResponse.json({ relatedRecordGroups: [{ objectId: 12345, relatedRecords: [{ attributes: { OBJECTID: 1, DOCDATE: ms } }] }] })),
      http.get(RELATED_URL, () => HttpResponse.json({ displayField: "DOCDATE", fields: [] })),
    );

    render(<RelatedRecordsList metadata={metadata} relationship={relationship} objectId="12345" />);

    const expected = new Date(ms).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit" });
    expect(await screen.findByRole("button", { name: expected })).toBeTruthy();
  });

  it("shows an empty state when no related items exist", async () => {
    server.use(
      http.get(`${LAYER_URL}/queryRelatedRecords`, () => HttpResponse.json({ relatedRecordGroups: [{ objectId: 12345, relatedRecords: [] }] })),
      http.get(RELATED_URL, () => HttpResponse.json({ displayField: "TYPE", fields: [] })),
    );

    render(<RelatedRecordsList metadata={metadata} relationship={relationship} objectId="12345" />);

    expect(await screen.findByText("No related items.")).toBeTruthy();
  });
});
