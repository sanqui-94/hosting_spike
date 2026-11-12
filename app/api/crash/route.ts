import { authorized } from "@/lib/auth";
import { logEvent } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Crash-recovery test: ?mode=throw (uncaught exception, the realistic crash) or ?mode=exit (process.exit(1)).
// Replies first, then crashes the process half a second later.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const mode = new URL(req.url).searchParams.get("mode") === "exit" ? "exit" : "throw";
  await logEvent("crash", `${mode} pid=${process.pid} uptime=${Math.round(process.uptime())}s`);
  setTimeout(() => {
    if (mode === "exit") process.exit(1);
    throw new Error("spike: deliberate uncaught exception");
  }, 500);
  return Response.json({ crashing: mode, pid: process.pid, at: new Date().toISOString() });
}
