import { useSyncExternalStore } from "react";
import { isMobile } from "@/utils/helpersBrowser";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

// Server snapshot is false so SSR and hydration markup match; the client value applies after hydration.
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, isMobile, () => false);
}
