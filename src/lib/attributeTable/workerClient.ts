/**
 * Worker RPC client for the Attribute Table.
 * ----------------------------------------------------------------------------
 * Lazily spins up a single shared Web Worker, exposes a promise-based API
 * for each message kind, and idles the worker down after a period of no use
 * so we don't hold an extra thread forever.
 *
 * No third-party RPC dep — the wire format is already typed by the worker's
 * request/response unions.
 */

import type { WorkerRequest, WorkerResponse } from "@/workers/attributeTable.worker";

const IDLE_SHUTDOWN_MS = 30_000;

let workerRef: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void }>();
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function getWorker(): Worker {
  if (workerRef) return workerRef;
  // Next.js / Turbopack / Webpack 5 all support this URL pattern.
  // `new URL(..., import.meta.url)` is statically analyzable and produces a
  // bundled worker chunk at build time.
  const w = new Worker(new URL("../../workers/attributeTable.worker.ts", import.meta.url), { type: "module" });
  w.addEventListener("message", (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.kind === "error") p.reject(new Error(msg.message));
    else p.resolve(msg);
    scheduleShutdown();
  });
  w.addEventListener("error", (e) => {
    // Fail all pending requests — the worker is toast.
    for (const [id, p] of pending) {
      p.reject(new Error(`Worker error: ${e.message}`));
      pending.delete(id);
    }
    workerRef?.terminate();
    workerRef = null;
  });
  workerRef = w;
  return w;
}

function scheduleShutdown(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (pending.size === 0 && workerRef) {
      workerRef.terminate();
      workerRef = null;
    }
  }, IDLE_SHUTDOWN_MS);
}

function send<TResponse extends WorkerResponse>(req: Omit<WorkerRequest, "id">, transfer?: Transferable[]): Promise<TResponse> {
  const id = nextId++;
  const worker = getWorker();
  return new Promise<TResponse>((resolve, reject) => {
    pending.set(id, {
      resolve: (r) => resolve(r as TResponse),
      reject,
    });
    try {
      worker.postMessage({ ...req, id } as WorkerRequest, transfer ?? []);
    } catch (e) {
      pending.delete(id);
      reject(e as Error);
    }
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function workerExportCsv(columns: string[], rows: Array<Array<string | number | boolean | null>>): Promise<Blob> {
  const res = await send<Extract<WorkerResponse, { kind: "exportCsv" }>>({
    kind: "exportCsv",
    columns,
    rows,
  });
  return res.blob;
}

export async function workerParseGeoJson(
  buffer: ArrayBuffer,
  keepGeometry = false,
): Promise<{
  features: Array<{ id?: string | number; properties: Record<string, unknown> | null; geometry?: unknown }>;
  numberMatched?: number;
  numberReturned: number;
}> {
  const res = await send<Extract<WorkerResponse, { kind: "parseGeoJson" }>>({ kind: "parseGeoJson", buffer, keepGeometry }, [buffer]);
  return {
    features: res.features,
    numberMatched: res.numberMatched,
    numberReturned: res.numberReturned,
  };
}

/** Terminate eagerly — useful in tests and for app-wide teardown. */
export function terminateAttributeTableWorker(): void {
  if (workerRef) {
    workerRef.terminate();
    workerRef = null;
  }
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  pending.clear();
}

/** Whether the worker environment is actually usable (false in SSR/jsdom without blob URL support). */
export function isWorkerSupported(): boolean {
  return typeof Worker !== "undefined" && typeof URL !== "undefined";
}
