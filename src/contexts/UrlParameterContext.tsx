"use client";

/**
 * URL Parameter Context
 *
 * Provides URL parameter handling capabilities to the entire app tree.
 * Uses a stable reference pattern to avoid re-render loops.
 *
 * Key design decisions:
 * - Uses refs for most state to avoid triggering re-renders
 * - Defers URL parameter processing until map is ready
 * - Handlers are called lazily to avoid initialization issues
 *
 * Components can use the context to:
 * - Register their readiness for URL parameter processing
 * - Wait for other components to be ready
 * - Monitor processing status
 *
 * @example
 * ```tsx
 * // In root layout or page
 * <UrlParameterProvider>
 *   <App />
 * </UrlParameterProvider>
 *
 * // In child component
 * const { registerComponentReady } = useUrlParameterContext();
 *
 * useEffect(() => {
 *   // Call when component is fully ready
 *   registerComponentReady('map', { readinessType: 'dataLoaded' });
 * }, [mapIsReady]);
 * ```
 */

import React, { createContext, useContext, useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import type { UseUrlParametersReturn, ComponentDependency, ParameterExecutionState } from "@/types/urlParameters";
import { standardParameters, featureSelectionParameters } from "@/config/urlParametersConfig";

// ============================================================================
// Context Definition
// ============================================================================

const UrlParameterContext = createContext<UseUrlParametersReturn | null>(null);

// ============================================================================
// Types
// ============================================================================

type UrlParams = Record<string, string>;
type HandlerFn = (value: string, params: UrlParams) => Promise<void> | void;

function hasParameterName(config: { name?: unknown }): config is { name: string } {
  return typeof config.name === "string" && config.name.length > 0;
}

// ============================================================================
// Provider Component
// ============================================================================

interface UrlParameterProviderProps {
  children: ReactNode;
}

/**
 * URL parameter provider using a stable reference pattern.
 * Prevents re-render loops by using refs for most state.
 */
export function UrlParameterProvider({ children }: UrlParameterProviderProps) {
  // Store readiness in a ref to avoid re-renders
  const componentReadinessRef = useRef<Record<ComponentDependency, boolean>>({
    map: false,
    toc: false,
    search: false,
    myMaps: false,
    avl: false,
    auth: false,
  });

  // Track if we've done initial URL processing
  const hasProcessedRef = useRef(false);
  const isProcessingRef = useRef(false);

  // For components that need to react to isProcessing changes
  const [isProcessing, setIsProcessing] = useState(false);

  // Use ref for execution state to avoid re-render loops
  const executionStateRef = useRef<Map<string, ParameterExecutionState>>(new Map());
  const completedParamsRef = useRef<string[]>([]);
  const failedParamsRef = useRef<string[]>([]);
  const skippedParamsRef = useRef<string[]>([]);

  // Handler cache - lazily populated
  const handlersRef = useRef<Record<string, HandlerFn | null>>({});

  // Waiting callbacks for component readiness
  const waitingCallbacksRef = useRef<Map<ComponentDependency, Array<() => void>>>(new Map());

  // -------------------------------------------------------------------------
  // Handler Management (Lazy Loading Pattern)
  // -------------------------------------------------------------------------

  /**
   * Get a handler function for a parameter.
   * Handlers are created lazily to avoid initialization issues.
   */
  const getHandler = useCallback((paramName: string): HandlerFn | null => {
    // Return cached handler if available
    if (paramName in handlersRef.current) {
      return handlersRef.current[paramName];
    }

    // Create handler based on parameter config
    // Always create a lazy handler — even for unknown params, the default case
    // in createLazyHandler will check sidebarShortcutParams from config.
    const handler = createLazyHandler(paramName);
    handlersRef.current[paramName] = handler;
    return handler;
  }, []);

  // -------------------------------------------------------------------------
  // URL Parameter Processing
  // -------------------------------------------------------------------------

  /**
   * Process a single URL parameter
   */
  const processParameter = useCallback(
    async (paramName: string, value: string, allParams: UrlParams): Promise<boolean> => {
      const handler = getHandler(paramName);
      if (!handler) {
        skippedParamsRef.current.push(paramName);
        return false;
      }

      try {
        await handler(value, allParams);
        completedParamsRef.current.push(paramName);
        return true;
      } catch (error) {
        console.error(`[UrlParameterProvider] Handler failed for ${paramName}:`, error);
        failedParamsRef.current.push(paramName);
        return false;
      }
    },
    [getHandler],
  );

  /**
   * Main URL parameter processing function
   */
  const processUrlParameters = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (isProcessingRef.current) return;

    // DEBUG: Set a window property so we can verify from browser console
    // @ts-expect-error - Adding debug property to window
    window._urlParamDebug = { status: "processing started" };

    const searchParams = new URLSearchParams(window.location.search);
    const params: UrlParams = {};
    searchParams.forEach((value, key) => {
      params[key.toUpperCase()] = value;
    });

    const paramCount = Object.keys(params).length;
    if (paramCount === 0) {
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);

    // Reset tracking
    completedParamsRef.current = [];
    failedParamsRef.current = [];
    skippedParamsRef.current = [];

    // Process feature selection first (highest priority)
    // These are mutually exclusive - only one can be used
    // Sort by priority (lower number = higher priority)
    const sortedFeatureParams = [...featureSelectionParameters].sort((a, b) => a.priority - b.priority);

    let featureHandled = false;
    for (const config of sortedFeatureParams) {
      if (!hasParameterName(config)) {
        console.warn("[UrlParameterProvider] Skipping feature selection config with no name:", config);
        continue;
      }

      const paramValue = params[config.name.toUpperCase()];
      if (paramValue !== undefined && !featureHandled) {
        await processParameter(config.name, paramValue, params);
        featureHandled = true;
        break; // Only process highest priority matching feature selection
      }
    }

    // Process standard parameters in order of dependencies
    for (const config of standardParameters) {
      if (!hasParameterName(config)) {
        console.warn("[UrlParameterProvider] Skipping standard config with no name:", config);
        continue;
      }

      const paramValue = params[config.name.toUpperCase()];
      if (paramValue !== undefined) {
        // Check dependencies are met
        const depsReady = !config.dependencies || config.dependencies.every((dep) => componentReadinessRef.current[dep]);

        if (depsReady) {
          await processParameter(config.name, paramValue, params);
        } else {
          skippedParamsRef.current.push(config.name);
        }
      }
    }

    // Process any remaining URL params not in standard or feature configs
    // These may match sidebarShortcutParams from config (e.g. "room" → Campus theme)
    const knownParamNames = new Set([
      ...featureSelectionParameters.filter(hasParameterName).map((p) => p.name.toUpperCase()),
      ...standardParameters.filter(hasParameterName).map((p) => p.name.toUpperCase()),
    ]);
    for (const [key, value] of Object.entries(params)) {
      if (!knownParamNames.has(key)) {
        await processParameter(key, value, params);
      }
    }

    // Done processing
    isProcessingRef.current = false;
    setIsProcessing(false);
  }, [processParameter]);

  // -------------------------------------------------------------------------
  // Component Readiness Management
  // -------------------------------------------------------------------------

  const registerComponentReady = useCallback(
    (componentName: ComponentDependency) => {
      componentReadinessRef.current[componentName] = true;

      // Notify any waiting callbacks
      const callbacks = waitingCallbacksRef.current.get(componentName) || [];
      callbacks.forEach((cb) => cb());
      waitingCallbacksRef.current.set(componentName, []);

      // Process URL params when map is ready (deferred)
      if (componentName === "map" && !hasProcessedRef.current) {
        hasProcessedRef.current = true;
        // Use setTimeout to defer processing and let the app stabilize
        setTimeout(() => {
          processUrlParameters();
        }, 200);
      }
    },
    [processUrlParameters],
  );

  const waitForComponent = useCallback(async (name: ComponentDependency): Promise<void> => {
    if (componentReadinessRef.current[name]) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const callbacks = waitingCallbacksRef.current.get(name) || [];
      callbacks.push(resolve);
      waitingCallbacksRef.current.set(name, callbacks);
    });
  }, []);

  const isComponentReady = useCallback((name: ComponentDependency): boolean => {
    return componentReadinessRef.current[name] ?? false;
  }, []);

  // -------------------------------------------------------------------------
  // Context Value (Stable Reference)
  // -------------------------------------------------------------------------

  // Use ref for context value to maintain stable reference
  const contextValue = useRef<UseUrlParametersReturn>({
    isProcessing: false,
    componentReadiness: componentReadinessRef.current,
    executionState: executionStateRef.current,
    completedParameters: [],
    failedParameters: [],
    skippedParameters: [],
    registerComponentReady,
    waitForComponent,
    isComponentReady,
  });

  // Keep context value in sync with callback changes
  useEffect(() => {
    contextValue.current.registerComponentReady = registerComponentReady;
    contextValue.current.waitForComponent = waitForComponent;
    contextValue.current.isComponentReady = isComponentReady;
  }, [registerComponentReady, waitForComponent, isComponentReady]);

  // Update context value when isProcessing changes
  useEffect(() => {
    contextValue.current = {
      ...contextValue.current,
      isProcessing,
      completedParameters: completedParamsRef.current,
      failedParameters: failedParamsRef.current,
      skippedParameters: skippedParamsRef.current,
    };
  }, [isProcessing]);

  return <UrlParameterContext.Provider value={contextValue.current}>{children}</UrlParameterContext.Provider>;
}

// ============================================================================
// Lazy Handler Factory
// ============================================================================

/**
 * Creates a handler function that accesses stores at execution time.
 * This avoids subscription issues that can cause re-render loops.
 */
function createLazyHandler(paramName: string): HandlerFn {
  return async (value: string) => {
    // Import stores dynamically at execution time
    const { useSidebarStore } = await import("@/stores/sidebarStore");

    // Use let so we can refresh the state reference in the wait loops
    let sidebarState = useSidebarStore.getState();

    switch (paramName.toUpperCase()) {
      case "X":
      case "Y":
      case "Z":
      case "ZOOM": {
        // NOTE: X/Y/Z/ZOOM coordinate handling is done in MapContainer.tsx's handleURLParameters
        // to avoid duplicate handlers causing race conditions. MapContainer runs first (100ms delay)
        // and handles coordinate transformation (SR param) and marker placement (ID param).
        // This case is kept as a no-op to prevent "unhandled parameter" warnings.
        break;
      }

      case "THEME": {
        // Enable a specific theme
        // 1. Open the sidebar
        // 2. Set active tab to themes (index 3)
        // 3. Activate the theme by name
        // Wait for themes to be loaded (max 5 seconds)
        const maxWait = 5000;
        const checkInterval = 100;
        let waited = 0;

        while (sidebarState.themes.length === 0 && waited < maxWait) {
          await new Promise((resolve) => setTimeout(resolve, checkInterval));
          waited += checkInterval;
          // Refresh state reference
          sidebarState = useSidebarStore.getState();
        }

        // Find the theme by name (case-insensitive)
        const theme = sidebarState.themes.find((t) => t.name.toUpperCase() === value.toUpperCase() || t.id.toUpperCase() === value.toUpperCase());

        if (theme) {
          // Open sidebar and switch to themes tab
          sidebarState.openSidebar();
          sidebarState.setActiveTab(3); // 3 = themes tab

          // Activate the theme
          sidebarState.activateSidebarItem(theme.id, "themes");
        } else {
          console.warn(
            `[Handler] Theme "${value}" not found. Available themes:`,
            sidebarState.themes.map((t) => t.name),
          );
        }
        break;
      }

      case "TOOL": {
        // Enable a specific tool
        // Wait for tools to be loaded (max 5 seconds)
        const maxWaitTool = 5000;
        const checkIntervalTool = 100;
        let waitedTool = 0;

        while (sidebarState.tools.length === 0 && waitedTool < maxWaitTool) {
          await new Promise((resolve) => setTimeout(resolve, checkIntervalTool));
          waitedTool += checkIntervalTool;
          // Refresh state reference
          sidebarState = useSidebarStore.getState();
        }

        // Find the tool by name (case-insensitive)
        const tool = sidebarState.tools.find((t) => t.name.toUpperCase() === value.toUpperCase() || t.id.toUpperCase() === value.toUpperCase());

        if (tool) {
          // Open sidebar and switch to tools tab
          sidebarState.openSidebar();
          sidebarState.setActiveTab(1); // 1 = tools tab

          // Activate the tool
          sidebarState.activateSidebarItem(tool.id, "tools");
        } else {
          console.warn(
            `[Handler] Tool "${value}" not found. Available tools:`,
            sidebarState.tools.map((t) => t.name),
          );
        }
        break;
      }

      case "MUNI": {
        // Municipality is handled directly by Search.tsx from the app store's urlParameters.
        // This no-op prevents the sidebarShortcutParams default handler from incorrectly
        // emitting a "searchItem" event for this parameter.
        break;
      }

      case "BASEMAP": {
        // Change basemap
        // TODO: Basemap handling - need to implement basemap store/method
        break;
      }

      case "SEARCH": {
        // Perform a search
        // TODO: Search handling - trigger search component
        break;
      }

      case "MYMAPS":
      case "LOAD_MYMAPS": {
        // Load a saved MyMaps configuration
        // TODO: MyMaps loading logic
        break;
      }

      // Add more handlers as needed

      default: {
        // Check sidebarShortcutParams from merged config for custom URL param handling
        const { useAppStore } = await import("@/stores/appStore");
        const appConfig = useAppStore.getState().config;
        const shortcuts =
          (appConfig?.sidebarShortcutParams as Array<{
            url_param: string;
            type: string;
            component: string;
            matchValue?: string;
            hidden?: boolean;
            timeout?: number;
          }>) || [];

        // Find a matching shortcut entry
        const shortcut = shortcuts.find((s) => {
          if (s.url_param.toUpperCase() !== paramName.toUpperCase()) return false;
          // If matchValue is specified, the URL param value must match it
          if (s.matchValue && s.matchValue.toUpperCase() !== value.toUpperCase()) return false;
          return true;
        });

        if (shortcut) {
          if (shortcut.type === "search") {
            // Set a pending search for the Search component to pick up
            const { useSearchStore } = await import("@/stores/searchStore");
            useSearchStore.getState().setPendingSearch({ value, type: shortcut.component });
          } else if (shortcut.type === "themes" || shortcut.type === "tools") {
            // Wait for sidebar items to be loaded
            const maxWaitShortcut = shortcut.timeout || 5000;
            const checkIntervalShortcut = 100;
            let waitedShortcut = 0;
            let sidebarStateShortcut = useSidebarStore.getState();
            const items = shortcut.type === "themes" ? sidebarStateShortcut.themes : sidebarStateShortcut.tools;

            while (items.length === 0 && waitedShortcut < maxWaitShortcut) {
              await new Promise((resolve) => setTimeout(resolve, checkIntervalShortcut));
              waitedShortcut += checkIntervalShortcut;
              sidebarStateShortcut = useSidebarStore.getState();
            }

            // Find the item by component name (case-insensitive)
            const finalItems = shortcut.type === "themes" ? sidebarStateShortcut.themes : sidebarStateShortcut.tools;
            const item = finalItems.find((i) => i.name.toUpperCase() === shortcut.component.toUpperCase() || i.id.toUpperCase() === shortcut.component.toUpperCase());

            if (item) {
              sidebarStateShortcut.openSidebar();
              const tabIndex = shortcut.type === "themes" ? 3 : 1;
              sidebarStateShortcut.setActiveTab(tabIndex);
              sidebarStateShortcut.activateSidebarItem(item.id, shortcut.type);
            } else {
              console.warn(`[Handler] Shortcut component "${shortcut.component}" not found in ${shortcut.type}`);
            }
          } else if (shortcut.type === "MYMAPS") {
            // TODO: Load MyMaps configuration
          }
        }
        break;
      }
    }
  };
}

// ============================================================================
// Hook for consuming context
// ============================================================================

/**
 * Hook to access URL parameter context from any component.
 *
 * @returns URL parameter context with registration and status functions
 * @throws Error if used outside of UrlParameterProvider
 *
 * @example
 * ```tsx
 * const { registerComponentReady, isProcessing } = useUrlParameterContext();
 *
 * useEffect(() => {
 *   if (mapFullyLoaded) {
 *     registerComponentReady('map', { readinessType: 'dataLoaded' });
 *   }
 * }, [mapFullyLoaded, registerComponentReady]);
 * ```
 */
export function useUrlParameterContext(): UseUrlParametersReturn {
  const context = useContext(UrlParameterContext);

  if (!context) {
    throw new Error("useUrlParameterContext must be used within a UrlParameterProvider. " + "Make sure to wrap your component tree with <UrlParameterProvider>.");
  }

  return context;
}

// ============================================================================
// Optional: Hook that doesn't throw if outside provider
// ============================================================================

/**
 * Optional hook that returns null if used outside provider.
 * Useful for components that may or may not be within the provider.
 */
export function useUrlParameterContextOptional(): UseUrlParametersReturn | null {
  return useContext(UrlParameterContext);
}

// ============================================================================
// Export context for advanced use cases
// ============================================================================

export { UrlParameterContext };
