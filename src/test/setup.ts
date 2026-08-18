import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "@/test/testServer";
import React from "react";

// Mock next-auth/react globally so any component calling useSession works
// without a real <SessionProvider />.
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  getSession: vi.fn(() => Promise.resolve(null)),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock all react-icons at the top level to ensure they're available globally
vi.mock("react-icons/fa", () => ({
  // Existing icons
  FaPlus: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "plus-icon" }, "Plus"),
  FaMinus: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "minus-icon" }, "Minus"),
  FaGlobe: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "globe-icon" }, "Globe"),
  FaCompass: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "compass-icon" }, "Compass"),
  FaExpand: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "expand-icon" }, "Expand"),
  FaCompress: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "compress-icon" }, "Compress"),
  FaForward: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "forward-icon" }, "Forward"),
  FaBackward: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "backward-icon" }, "Backward"),
  FaCrosshairs: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "crosshairs-icon" }, "Crosshairs"),
  FaGithub: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "github-icon" }, "GitHub"),
  FaQuestion: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "question-icon" }, "Question"),

  // Playback / sync icons used by Weather components
  FaSyncAlt: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "sync-icon" }, "Sync"),
  FaPlay: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "play-icon" }, "Play"),
  FaPause: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "pause-icon" }, "Pause"),

  // Missing icons that were causing test failures
  FaBars: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "bars-icon" }, "Bars"),
  FaSearch: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "search-icon" }, "Search"),
  FaQuestionCircle: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "question-circle-icon" }, "QuestionCircle"),
  FaEnvelope: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "envelope-icon" }, "Envelope"),

  // TOC related icons
  FaGripVertical: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "grip-vertical-icon" }, "GripVertical"),
  FaPaperclip: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "paperclip-icon" }, "Paperclip"),
  FaInfoCircle: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "info-circle-icon" }, "InfoCircle"),
  FaDownload: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "download-icon" }, "Download"),
  FaLock: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "lock-icon" }, "Lock"),
  FaCog: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "cog-icon" }, "Cog"),
  FaUser: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "user-icon" }, "User"),
  FaEllipsisV: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "ellipsis-v-icon" }, "EllipsisV"),
  FaEyeSlash: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "eye-slash-icon" }, "EyeSlash"),
  FaChevronDown: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "chevron-down-icon" }, "ChevronDown"),
  FaChevronLeft: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "chevron-left-icon" }, "ChevronLeft"),
  FaChevronRight: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "chevron-right-icon" }, "ChevronRight"),
  FaFolder: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "folder-icon" }, "Folder"),
  FaFolderOpen: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "folder-open-icon" }, "FolderOpen"),

  // LayerOptionsMenu specific icons
  FaSearchPlus: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "search-plus-icon" }, "SearchPlus"),
  FaTable: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "table-icon" }, "Table"),
  FaTrash: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "trash-icon" }, "Trash"),
  FaTimes: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "times-icon" }, "Times"),
  FaEye: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "eye-icon" }, "Eye"),

  // LayerInfo specific icons
  FaPrint: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "print-icon" }, "Print"),
  FaExternalLinkAlt: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "external-link-icon" }, "ExternalLink"),

  // MapContextMenu specific icons
  FaFileAlt: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "file-alt-icon" }, "FileAlt"),
  FaMapMarkerAlt: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "map-marker-alt-icon" }, "MapMarkerAlt"),
  FaGlobeAmericas: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "globe-americas-icon" }, "GlobeAmericas"),
  FaExclamationTriangle: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "exclamation-triangle-icon" }, "ExclamationTriangle"),
  FaGoogle: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "google-icon" }, "Google"),
  FaEllipsisH: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "ellipsis-h-icon" }, "EllipsisH"),
  FaCompressArrowsAlt: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "compress-arrows-alt-icon" }, "CompressArrowsAlt"),

  // MoreMenu specific icons
  FaCamera: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "camera-icon" }, "Camera"),
  FaCommentDots: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "comment-dots-icon" }, "CommentDots"),
  FaMap: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "map-icon" }, "Map"),
  FaFileContract: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "file-contract-icon" }, "FileContract"),
  FaNewspaper: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "newspaper-icon" }, "Newspaper"),
  FaPalette: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "palette-icon" }, "Palette"),
  FaTools: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "tools-icon" }, "Tools"),
  FaDrawPolygon: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "draw-polygon-icon" }, "DrawPolygon"),

  // AVL Theme specific icons
  FaSpinner: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "spinner-icon" }, "Spinner"),
  FaSignInAlt: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "sign-in-icon" }, "SignIn"),
  FaTruck: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "truck-icon" }, "Truck"),
  FaHistory: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "history-icon" }, "History"),
  FaClock: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "clock-icon" }, "Clock"),
  FaRoute: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "route-icon" }, "Route"),

  // 511 Theme specific icons
  FaSync: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "sync-icon-fa" }, "Sync"),

  // AddLayerTool specific icons
  FaUpload: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "upload-icon" }, "Upload"),

  // Commercial Real Estate theme icons
  FaListUl: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "list-ul-icon" }, "ListUl"),
  FaArrowLeft: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "arrow-left-icon" }, "ArrowLeft"),
  FaStar: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "star-icon" }, "Star"),
  FaChevronUp: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "chevron-up-icon" }, "ChevronUp"),

  // AppTrack specific icons
  FaPlusSquare: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "plus-square-icon" }, "PlusSquare"),

  // EMaps specific icons
  FaAddressBook: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "address-book-icon" }, "AddressBook"),

  // Secure report extension icons (MPac / Teranet)
  FaBuilding: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "building-icon" }, "Building"),
  FaLandmark: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "landmark-icon" }, "Landmark"),

  // Campus theme icons
  FaRegCheckCircle: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "reg-check-circle-icon" }, "RegCheckCircle"),
  FaRegCircle: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "reg-circle-icon" }, "RegCircle"),

  // InfoWindowRow and PanelComponent icons
  FaLevelUpAlt: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "level-up-alt-icon" }, "LevelUpAlt"),
  FaWrench: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "wrench-icon" }, "Wrench"),

  // AttributeTable specific icons
  FaMapMarkedAlt: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "map-marked-alt-icon" }, "MapMarkedAlt"),
  FaFilter: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "filter-icon" }, "Filter"),
  FaWindowMinimize: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "window-minimize-icon" }, "WindowMinimize"),
  FaSort: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "sort-icon" }, "Sort"),
  FaSortUp: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "sort-up-icon" }, "SortUp"),
  FaSortDown: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "sort-down-icon" }, "SortDown"),
  FaMousePointer: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "mouse-pointer-icon" }, "MousePointer"),
  FaExchangeAlt: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "exchange-alt-icon" }, "ExchangeAlt"),

  // LayerInformationTool icons
  FaLayerGroup: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "layer-group-icon" }, "LayerGroup"),
}));

vi.mock("react-icons/md", () => ({
  MdGridOff: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "grid-off-icon" }, "Grid Off"),
  MdGridOn: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "grid-on-icon" }, "Grid On"),
}));

vi.mock("react-icons/fi", () => ({
  FiSettings: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "settings-icon" }, "Settings"),
  FiSave: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "save-icon" }, "Save"),
  FiTrash2: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "trash-icon" }, "Trash"),
  FiSearch: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "fi-search-icon" }, "Search"),
  FiX: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "fi-x-icon" }, "X"),
  FiTable: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "fi-table-icon" }, "Table"),
  FiZoomIn: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "fi-zoom-in-icon" }, "ZoomIn"),
  FiChevronDown: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "fi-chevron-down-icon" }, "ChevronDown"),
  FiChevronRight: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "fi-chevron-right-icon" }, "ChevronRight"),
}));

vi.mock("react-icons/gi", () => ({
  GiBroom: (props: Record<string, unknown>) => React.createElement("div", { ...props, "data-testid": "broom-icon" }, "Broom"),
}));

// Setup MSW for API mocking
beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

beforeEach(() => {
  // Clear all timers before each test
  vi.clearAllTimers();
});

afterEach(() => {
  // Comprehensive cleanup after each test
  server.resetHandlers();
  cleanup(); // Clean up React Testing Library
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  vi.resetAllMocks();
  vi.restoreAllMocks();

  // Force garbage collection if available (helps with memory)
  if (global.gc) {
    global.gc();
  }
});

afterAll(() => {
  server.close();
  cleanup();
});

// Mock HTMLDialogElement which JSDOM doesn't fully implement
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal =
    HTMLDialogElement.prototype.showModal ||
    function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  HTMLDialogElement.prototype.close =
    HTMLDialogElement.prototype.close ||
    function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
}

// Mock HTMLFormElement.requestSubmit which JSDOM doesn't implement
HTMLFormElement.prototype.requestSubmit = function (this: HTMLFormElement) {
  // For method="dialog" forms, close the parent dialog
  const dialog = this.closest("dialog") as HTMLDialogElement | null;
  if (dialog && this.getAttribute("method") === "dialog") {
    dialog.close();
  }
};

// Mock browser APIs that JSDOM doesn't provide
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver (must be constructible for components that use `new IntersectionObserver`)
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock URL.createObjectURL
Object.defineProperty(window.URL, "createObjectURL", {
  writable: true,
  value: vi.fn(() => "mocked-object-url"),
});

// Mock window.URL constructor for search params
global.URL = global.URL || URL;

// Mock fetch for any tests that might use it directly
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// React-icons mocks are now defined at the top level for proper hoisting

// Set up window location mock
Object.defineProperty(window, "location", {
  value: {
    href: "http://localhost:3000",
    search: "",
    pathname: "/",
    hostname: "localhost",
    port: "3000",
    protocol: "http:",
  },
  writable: true,
});
