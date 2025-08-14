import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './testServer'

// Setup MSW for API mocking
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

beforeEach(() => {
  // Clear all timers before each test
  vi.clearAllTimers()
})

afterEach(() => {
  // Comprehensive cleanup after each test
  server.resetHandlers()
  cleanup() // Clean up React Testing Library
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  vi.resetAllMocks()
  vi.restoreAllMocks()
  
  // Force garbage collection if available (helps with memory)
  if (global.gc) {
    global.gc()
  }
})

afterAll(() => {
  server.close()
  cleanup()
})

// Mock browser APIs that JSDOM doesn't provide
Object.defineProperty(window, 'matchMedia', {
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
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock URL.createObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mocked-object-url'),
})

// Mock window.URL constructor for search params
global.URL = global.URL || URL

// Mock fetch for any tests that might use it directly
global.fetch = vi.fn()

// Mock console methods to reduce noise in tests
vi.spyOn(console, 'warn').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

// Set up window location mock
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    search: '',
    pathname: '/',
    hostname: 'localhost',
    port: '3000',
    protocol: 'http:',
  },
  writable: true,
})


