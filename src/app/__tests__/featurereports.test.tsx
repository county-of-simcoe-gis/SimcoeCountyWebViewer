import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import FeatureReportsPage from "@/app/featurereports/page";
import * as featureReports from "@/utils/featureReports";

vi.mock("@/utils/featureReports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/featureReports")>()),
  fetchFeatureReport: vi.fn(),
}));

// The global test setup replaces window.location with a plain object.
function setSearch(search: string) {
  window.location.search = search;
}

describe("FeatureReportsPage", () => {
  beforeEach(() => {
    vi.mocked(featureReports.fetchFeatureReport).mockReset();
  });

  it("shows an error when TYPE or ID is missing", async () => {
    setSearch("?TYPE=FORESTRY");
    render(<FeatureReportsPage />);
    expect(await screen.findByText(/needs a TYPE and ID/)).toBeInTheDocument();
    expect(featureReports.fetchFeatureReport).not.toHaveBeenCalled();
  });

  it("shows an error for an unknown TYPE", async () => {
    setSearch("?TYPE=BOGUS&ID=1");
    render(<FeatureReportsPage />);
    expect(await screen.findByText(/needs a TYPE and ID/)).toBeInTheDocument();
  });

  it("renders the forestry report with a header when SHOWHEADER=1", async () => {
    vi.mocked(featureReports.fetchFeatureReport).mockResolvedValue({ Tract: "COPELAND", Municipality: "SPRINGWATER", ATV: "YES" });
    setSearch("?TYPE=FORESTRY&ID=COPELAND&SHOWHEADER=1");
    render(<FeatureReportsPage />);

    expect(await screen.findByText("Restricted Activities")).toBeInTheDocument();
    expect(screen.getByText("COPELAND")).toBeInTheDocument();
    expect(featureReports.fetchFeatureReport).toHaveBeenCalledWith("FORESTRY", "COPELAND");
  });

  it("omits the header without SHOWHEADER", async () => {
    vi.mocked(featureReports.fetchFeatureReport).mockResolvedValue({ name: "YMCA", muni: "Barrie", subsidy: "YES", lc_inf: 1 });
    setSearch("?TYPE=CHILDCARE&ID=YMCA");
    render(<FeatureReportsPage />);

    await waitFor(() => expect(screen.getByText("Childcare Programs Available")).toBeInTheDocument());
    expect(screen.queryByText("(Barrie)")).not.toBeInTheDocument();
  });

  it("shows not found when no feature matches", async () => {
    vi.mocked(featureReports.fetchFeatureReport).mockResolvedValue(null);
    setSearch("?TYPE=FORESTRY&ID=NOPE");
    render(<FeatureReportsPage />);
    expect(await screen.findByText("Feature not found.")).toBeInTheDocument();
  });
});
