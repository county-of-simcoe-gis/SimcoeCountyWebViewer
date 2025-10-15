import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "@/test/testServer";
import React from "react";

// Mock all react-icons at the top level to ensure they're available globally
vi.mock("react-icons/fa", () => ({
  // Existing icons
  FaPlus: (props: any) => React.createElement("div", { ...props, "data-testid": "plus-icon" }, "Plus"),
  FaMinus: (props: any) => React.createElement("div", { ...props, "data-testid": "minus-icon" }, "Minus"),
  FaGlobe: (props: any) => React.createElement("div", { ...props, "data-testid": "globe-icon" }, "Globe"),
  FaCompass: (props: any) => React.createElement("div", { ...props, "data-testid": "compass-icon" }, "Compass"),
  FaExpand: (props: any) => React.createElement("div", { ...props, "data-testid": "expand-icon" }, "Expand"),
  FaCompress: (props: any) => React.createElement("div", { ...props, "data-testid": "compress-icon" }, "Compress"),
  FaForward: (props: any) => React.createElement("div", { ...props, "data-testid": "forward-icon" }, "Forward"),
  FaBackward: (props: any) => React.createElement("div", { ...props, "data-testid": "backward-icon" }, "Backward"),
  FaCrosshairs: (props: any) => React.createElement("div", { ...props, "data-testid": "crosshairs-icon" }, "Crosshairs"),
  FaGithub: (props: any) => React.createElement("div", { ...props, "data-testid": "github-icon" }, "GitHub"),
  FaQuestion: (props: any) => React.createElement("div", { ...props, "data-testid": "question-icon" }, "Question"),

  // Missing icons that were causing test failures
  FaBars: (props: any) => React.createElement("div", { ...props, "data-testid": "bars-icon" }, "Bars"),
  FaSearch: (props: any) => React.createElement("div", { ...props, "data-testid": "search-icon" }, "Search"),
  FaQuestionCircle: (props: any) => React.createElement("div", { ...props, "data-testid": "question-circle-icon" }, "QuestionCircle"),
  FaEnvelope: (props: any) => React.createElement("div", { ...props, "data-testid": "envelope-icon" }, "Envelope"),

  // TOC related icons
  FaPaperclip: (props: any) => React.createElement("div", { ...props, "data-testid": "paperclip-icon" }, "Paperclip"),
  FaInfoCircle: (props: any) => React.createElement("div", { ...props, "data-testid": "info-circle-icon" }, "InfoCircle"),
  FaDownload: (props: any) => React.createElement("div", { ...props, "data-testid": "download-icon" }, "Download"),
  FaLock: (props: any) => React.createElement("div", { ...props, "data-testid": "lock-icon" }, "Lock"),
  FaUser: (props: any) => React.createElement("div", { ...props, "data-testid": "user-icon" }, "User"),
  FaEllipsisV: (props: any) => React.createElement("div", { ...props, "data-testid": "ellipsis-v-icon" }, "EllipsisV"),
  FaEyeSlash: (props: any) => React.createElement("div", { ...props, "data-testid": "eye-slash-icon" }, "EyeSlash"),
  FaChevronDown: (props: any) => React.createElement("div", { ...props, "data-testid": "chevron-down-icon" }, "ChevronDown"),
  FaChevronRight: (props: any) => React.createElement("div", { ...props, "data-testid": "chevron-right-icon" }, "ChevronRight"),
  FaFolder: (props: any) => React.createElement("div", { ...props, "data-testid": "folder-icon" }, "Folder"),
  FaFolderOpen: (props: any) => React.createElement("div", { ...props, "data-testid": "folder-open-icon" }, "FolderOpen"),

  // LayerOptionsMenu specific icons
  FaSearchPlus: (props: any) => React.createElement("div", { ...props, "data-testid": "search-plus-icon" }, "SearchPlus"),
  FaTable: (props: any) => React.createElement("div", { ...props, "data-testid": "table-icon" }, "Table"),
  FaTrash: (props: any) => React.createElement("div", { ...props, "data-testid": "trash-icon" }, "Trash"),
  FaTimes: (props: any) => React.createElement("div", { ...props, "data-testid": "times-icon" }, "Times"),
  FaEye: (props: any) => React.createElement("div", { ...props, "data-testid": "eye-icon" }, "Eye"),

  // LayerInfo specific icons
  FaPrint: (props: any) => React.createElement("div", { ...props, "data-testid": "print-icon" }, "Print"),
  FaExternalLinkAlt: (props: any) => React.createElement("div", { ...props, "data-testid": "external-link-icon" }, "ExternalLink"),
}));

vi.mock("react-icons/md", () => ({
  MdGridOff: (props: any) => React.createElement("div", { ...props, "data-testid": "grid-off-icon" }, "Grid Off"),
  MdGridOn: (props: any) => React.createElement("div", { ...props, "data-testid": "grid-on-icon" }, "Grid On"),
}));

vi.mock("react-icons/fi", () => ({
  FiSettings: (props: any) => React.createElement("div", { ...props, "data-testid": "settings-icon" }, "Settings"),
  FiSave: (props: any) => React.createElement("div", { ...props, "data-testid": "save-icon" }, "Save"),
  FiTrash2: (props: any) => React.createElement("div", { ...props, "data-testid": "trash-icon" }, "Trash"),
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

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

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
