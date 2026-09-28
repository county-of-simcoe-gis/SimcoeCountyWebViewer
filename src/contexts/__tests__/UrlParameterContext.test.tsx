import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { UrlParameterProvider, useUrlParameterContext } from "@/contexts/UrlParameterContext";
import { useSidebarStore } from "@/stores/sidebarStore";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockOpenSidebar = vi.fn();
const mockSetActiveTab = vi.fn();
const mockActivateSidebarItem = vi.fn();
const mockSetPendingSearch = vi.fn();

let mockThemes: ReturnType<typeof useSidebarStore.getState>["themes"] = [];
let mockTools: ReturnType<typeof useSidebarStore.getState>["tools"] = [];
let mockShortcuts:
  | Array<{
      id?: number;
      url_param: string;
      type: string;
      component: string;
      matchValue?: string;
      hidden?: boolean;
      timeout?: number;
    }>
  | undefined = undefined;

vi.mock("@/stores/appStore", async () => {
  const actual = await vi.importActual<typeof import("@/stores/appStore")>("@/stores/appStore");
  const buildState = () => ({
    ...actual.useAppStore.getState(),
    config: {
      ...actual.useAppStore.getState().config,
      sidebarShortcutParams: mockShortcuts,
    },
  });
  return {
    useAppStore: Object.assign(
      vi.fn((selector?: (state: ReturnType<typeof buildState>) => unknown) => {
        const state = buildState();
        return typeof selector === "function" ? selector(state) : state;
      }),
      {
        getState: vi.fn(buildState),
      },
    ),
  };
});

vi.mock("@/stores/sidebarStore", async () => {
  const actual = await vi.importActual<typeof import("@/stores/sidebarStore")>("@/stores/sidebarStore");
  return {
    useSidebarStore: Object.assign(
      vi.fn((selector?: (state: ReturnType<typeof actual.useSidebarStore.getState>) => unknown) => {
        const state: ReturnType<typeof actual.useSidebarStore.getState> = {
          ...actual.useSidebarStore.getState(),
          themes: mockThemes,
          tools: mockTools,
          openSidebar: mockOpenSidebar,
          setActiveTab: mockSetActiveTab,
          activateSidebarItem: mockActivateSidebarItem,
        };
        return typeof selector === "function" ? selector(state) : state;
      }),
      {
        getState: vi.fn(
          () =>
            ({
              ...actual.useSidebarStore.getState(),
              themes: mockThemes,
              tools: mockTools,
              openSidebar: mockOpenSidebar,
              setActiveTab: mockSetActiveTab,
              activateSidebarItem: mockActivateSidebarItem,
            }) as ReturnType<typeof actual.useSidebarStore.getState>,
        ),
      },
    ),
  };
});

vi.mock("@/stores/searchStore", async () => {
  const actual = await vi.importActual<typeof import("@/stores/searchStore")>("@/stores/searchStore");
  return {
    useSearchStore: Object.assign(
      vi.fn((selector?: unknown) => {
        const state = {
          ...actual.useSearchStore.getState(),
          setPendingSearch: mockSetPendingSearch,
        };
        return typeof selector === "function" ? (selector as (state: unknown) => unknown)(state) : state;
      }),
      {
        getState: vi.fn(() => ({
          ...actual.useSearchStore.getState(),
          setPendingSearch: mockSetPendingSearch,
        })),
      },
    ),
  };
});

// Test harness that registers map readiness and exposes processing state
function TestHarness() {
  const { registerComponentReady, isProcessing } = useUrlParameterContext();

  React.useEffect(() => {
    registerComponentReady("map");
  }, [registerComponentReady]);

  return <div data-testid="processing">{isProcessing ? "processing" : "idle"}</div>;
}

function renderProvider(initialSearch = "") {
  Object.defineProperty(window, "location", {
    value: { search: initialSearch },
    writable: true,
  });

  return render(
    <UrlParameterProvider>
      <TestHarness />
    </UrlParameterProvider>,
  );
}

describe("UrlParameterContext theme/tool shortcut handling", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockOpenSidebar.mockClear();
    mockSetActiveTab.mockClear();
    mockActivateSidebarItem.mockClear();
    mockSetPendingSearch.mockClear();
    mockThemes = [];
    mockTools = [];
    mockShortcuts = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("activates a theme via THEME + configured sidebarShortcutParams (matchValue)", async () => {
    mockThemes = [
      {
        id: "7",
        name: "Commercial Real Estate",
        type: "theme",
        component: "CommercialRealEstate",
        imageName: "commercialRealEstate.png",
        enabled: true,
      },
    ];
    mockShortcuts = [
      {
        id: 7,
        url_param: "THEME",
        matchValue: "Economic Development",
        type: "themes",
        component: "Commercial Real Estate",
      },
    ];

    renderProvider("?THEME=Economic%20Development");

    await waitFor(() => {
      expect(mockOpenSidebar).toHaveBeenCalledTimes(1);
      expect(mockSetActiveTab).toHaveBeenCalledWith(3);
      expect(mockActivateSidebarItem).toHaveBeenCalledWith("7", "themes");
    });
  });

  it("falls back to legacy THEME lookup by theme name when no shortcut matches", async () => {
    mockThemes = [
      {
        id: "7",
        name: "Commercial Real Estate",
        type: "theme",
        component: "CommercialRealEstate",
        imageName: "commercialRealEstate.png",
        enabled: true,
      },
    ];
    mockShortcuts = [];

    renderProvider("?THEME=Commercial%20Real%20Estate");

    await waitFor(() => {
      expect(mockOpenSidebar).toHaveBeenCalledTimes(1);
      expect(mockSetActiveTab).toHaveBeenCalledWith(3);
      expect(mockActivateSidebarItem).toHaveBeenCalledWith("7", "themes");
    });
  });

  it("warns when THEME value does not match any theme or shortcut", async () => {
    mockThemes = [
      {
        id: "1",
        name: "Forestry",
        type: "theme",
        component: "Forestry",
        imageName: "forestry.png",
        enabled: true,
      },
    ];
    mockShortcuts = [];
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderProvider("?THEME=UnknownTheme");

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Theme "UnknownTheme" not found'), expect.any(Array));
    });

    warnSpy.mockRestore();
  });

  it("activates a tool via TOOL + configured sidebarShortcutParams", async () => {
    mockTools = [
      {
        id: "1",
        name: "Measure",
        type: "tool",
        component: "Measure",
        imageName: "measure.png",
        enabled: true,
      },
    ];
    mockShortcuts = [
      {
        id: 100,
        url_param: "TOOL",
        matchValue: "distance",
        type: "tools",
        component: "Measure",
      },
    ];

    renderProvider("?TOOL=distance");

    await waitFor(() => {
      expect(mockOpenSidebar).toHaveBeenCalledTimes(1);
      expect(mockSetActiveTab).toHaveBeenCalledWith(1);
      expect(mockActivateSidebarItem).toHaveBeenCalledWith("1", "tools");
    });
  });

  it("falls back to legacy TOOL lookup by tool name when no shortcut matches", async () => {
    mockTools = [
      {
        id: "1",
        name: "Measure",
        type: "tool",
        component: "Measure",
        imageName: "measure.png",
        enabled: true,
      },
    ];
    mockShortcuts = [];

    renderProvider("?TOOL=Measure");

    await waitFor(() => {
      expect(mockOpenSidebar).toHaveBeenCalledTimes(1);
      expect(mockSetActiveTab).toHaveBeenCalledWith(1);
      expect(mockActivateSidebarItem).toHaveBeenCalledWith("1", "tools");
    });
  });

  it("handles non-standard shortcut params (e.g. room=Campus) via default handler", async () => {
    mockThemes = [
      {
        id: "130",
        name: "Campus",
        type: "theme",
        component: "Campus",
        imageName: "campus.png",
        enabled: true,
      },
    ];
    mockShortcuts = [
      {
        id: 16,
        url_param: "room",
        type: "themes",
        component: "Campus",
      },
    ];

    renderProvider("?room=Campus");

    await waitFor(() => {
      expect(mockOpenSidebar).toHaveBeenCalledTimes(1);
      expect(mockSetActiveTab).toHaveBeenCalledWith(3);
      expect(mockActivateSidebarItem).toHaveBeenCalledWith("130", "themes");
    });
  });

  it("handles search shortcuts via default handler", async () => {
    mockShortcuts = [
      {
        id: 4,
        url_param: "CUSTOMSEARCH",
        type: "search",
        component: "Municipality",
        hidden: true,
      },
    ];

    renderProvider("?CUSTOMSEARCH=Midland");

    await waitFor(() => {
      expect(mockSetPendingSearch).toHaveBeenCalledWith({ value: "Midland", type: "Municipality" });
    });
  });

  it("respects matchValue case-insensitively for THEME shortcuts", async () => {
    mockThemes = [
      {
        id: "7",
        name: "Commercial Real Estate",
        type: "theme",
        component: "CommercialRealEstate",
        imageName: "commercialRealEstate.png",
        enabled: true,
      },
    ];
    mockShortcuts = [
      {
        id: 7,
        url_param: "THEME",
        matchValue: "Economic Development",
        type: "themes",
        component: "Commercial Real Estate",
      },
    ];

    renderProvider("?THEME=ECONOMIC%20DEVELOPMENT");

    await waitFor(() => {
      expect(mockOpenSidebar).toHaveBeenCalledTimes(1);
      expect(mockSetActiveTab).toHaveBeenCalledWith(3);
      expect(mockActivateSidebarItem).toHaveBeenCalledWith("7", "themes");
    });
  });
});
