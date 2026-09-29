/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts (both dev and production).
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import connections to trigger fire-and-forget pool warmup at startup
    await import("@/lib/database/connections");
  }
}
