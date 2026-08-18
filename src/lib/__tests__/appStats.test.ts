import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { addAppStat, trackTheme, trackTool, trackMapLoad, trackBasemap, trackLayer, trackGroup, trackMyMaps } from "@/lib/appStats";
import { useAppStore } from "@/stores/appStore";

describe("appStats", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.doUnmock("@/stores/appStore");
    vi.stubEnv("NEXT_PUBLIC_COLLECT_APP_STATS", "true");
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const setAppState = (overrides?: {
    name?: string;
    version?: string;
    homepage?: string;
    title?: string;
    userName?: string | null;
  }) => {
    const {
      name = "simcoecountywebviewernextjs",
      version = "2.0.0",
      homepage = "",
      title = "Interactive Map",
      userName = null,
    } = overrides ?? {};

    useAppStore.setState({
      config: { title } as any,
      appInfo: { name, version, homepage },
      userName,
    });
  };

  it("sends stat via fetch with correct URL", () => {
    setAppState();
    addAppStat("Theme", "Weather");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/stats/write/simcoecountywebviewernextjs-2.0.0/Theme/Weather"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("includes homepage in build name when available", () => {
    setAppState({ homepage: "webviewer" });
    addAppStat("Tool", "Measure");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/stats/write/simcoecountywebviewernextjs-2.0.0-webviewer/Tool/Measure"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("falls back to config title when appInfo name/version are missing", () => {
    setAppState({ name: "", version: "", title: "Test Web Viewer" });
    addAppStat("Map", "public");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/stats/write/Test-Web-Viewer/Map/public"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("encodes special characters in type and description", () => {
    setAppState();
    addAppStat("Basemap", "Imagery - 2020 & beyond");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/stats/write/simcoecountywebviewernextjs-2.0.0/Basemap/Imagery%20-%202020%20%26%20beyond"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("includes user_name query param when user is logged in", () => {
    setAppState({ userName: "jdoe@example.com" });
    addAppStat("Theme", "Weather");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/stats/write/simcoecountywebviewernextjs-2.0.0/Theme/Weather?user_name=jdoe%40example.com"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("omits user_name query param when no user is logged in", () => {
    setAppState({ userName: null });
    addAppStat("Theme", "Weather");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/public/stats/write/simcoecountywebviewernextjs-2.0.0/Theme/Weather"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.not.stringContaining("user_name"),
      expect.any(Object),
    );
  });

  it("does nothing when NEXT_PUBLIC_COLLECT_APP_STATS is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_COLLECT_APP_STATS", "");
    setAppState();
    addAppStat("Theme", "Weather");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does nothing when NEXT_PUBLIC_COLLECT_APP_STATS is false", () => {
    vi.stubEnv("NEXT_PUBLIC_COLLECT_APP_STATS", "false");
    setAppState();
    addAppStat("Theme", "Weather");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does nothing when config is null", () => {
    useAppStore.setState({ config: null, appInfo: { name: "", version: "", homepage: "" } });
    addAppStat("Theme", "Weather");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("swallows fetch errors silently", () => {
    setAppState();
    fetchSpy.mockRejectedValue(new Error("Network failure"));

    expect(() => addAppStat("Theme", "Weather")).not.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("swallows unexpected errors silently", () => {
    // Force a throw by replacing the store with an invalid object
    vi.doMock("@/stores/appStore", () => ({
      useAppStore: {
        getState: () => null,
      },
    }));

    expect(() => addAppStat("Theme", "Weather")).not.toThrow();

    vi.doUnmock("@/stores/appStore");
  });

  describe("typed helpers", () => {
    it("trackTheme sends Theme stat", () => {
      setAppState();
      trackTheme("Weather");
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/Theme/Weather"), expect.any(Object));
    });

    it("trackTool sends Tool stat", () => {
      setAppState();
      trackTool("Measure");
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/Tool/Measure"), expect.any(Object));
    });

    it("trackMapLoad sends Map stat", () => {
      setAppState();
      trackMapLoad("public");
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/Map/public"), expect.any(Object));
    });

    it("trackBasemap sends Basemap stat", () => {
      setAppState();
      trackBasemap("Topographic");
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/Basemap/Topographic"), expect.any(Object));
    });

    it("trackLayer sends Layer stat with group", () => {
      setAppState();
      trackLayer("Assessment Parcel", "Popular");
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/Layer/Assessment%20Parcel%20(Popular)"), expect.any(Object));
    });

    it("trackLayer sends Layer stat without group", () => {
      setAppState();
      trackLayer("Assessment Parcel");
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/Layer/Assessment%20Parcel"), expect.any(Object));
    });

    it("trackGroup sends Group stat", () => {
      setAppState();
      trackGroup("Popular");
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/Group/Popular"), expect.any(Object));
    });

    it("trackMyMaps sends MyMaps stat", () => {
      setAppState();
      trackMyMaps();
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/MyMaps/My%20Maps"), expect.any(Object));
    });
  });
});
