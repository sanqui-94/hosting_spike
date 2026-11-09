import { authorized } from "@/lib/auth";
import { db, ensureTicksTable } from "@/lib/db";

export const dynamic = "force-dynamic";

// Row 5 (and row 12): hPanel cron calls this every minute.
// Optional ?fired=<epoch seconds> from the cron's own `date +%s` measures cron clock and latency.
// Optional ?job=<name> separates the every-minute job from a scheduled one (e.g. "nightly").
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const url = new URL(req.url);
  const fired = Number(url.searchParams.get("fired"));
  const job = (url.searchParams.get("job") ?? "minute").slice(0, 32);

  await ensureTicksTable();
  await db().execute(
    "INSERT INTO spike_cron_ticks (received_ms, fired_s, job, pid, uptime_s, host) VALUES (?, ?, ?, ?, ?, ?)",
    [Date.now(), Number.isFinite(fired) && fired > 0 ? fired : null, job, process.pid, process.uptime(), req.headers.get("host")],
  );
  return Response.json({ ok: true });
}
