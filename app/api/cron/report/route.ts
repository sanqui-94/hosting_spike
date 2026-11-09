import type { RowDataPacket } from "mysql2";
import { authorized } from "@/lib/auth";
import { db, ensureTicksTable } from "@/lib/db";
import { cronReport } from "@/lib/cron-report";

export const dynamic = "force-dynamic";

// ?job=minute (default). ?sinceHours=72 limits the window.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const url = new URL(req.url);
  const job = url.searchParams.get("job") ?? "minute";
  const sinceHours = Number(url.searchParams.get("sinceHours") ?? 0);
  const sinceMs = sinceHours > 0 ? Date.now() - sinceHours * 3_600_000 : 0;

  await ensureTicksTable();
  const [rows] = await db().query<RowDataPacket[]>(
    "SELECT received_ms, fired_s, pid FROM spike_cron_ticks WHERE job = ? AND received_ms >= ? ORDER BY received_ms",
    [job, sinceMs],
  );
  const report = cronReport(
    rows.map((r) => ({
      receivedMs: Number(r.received_ms),
      firedS: r.fired_s === null ? null : Number(r.fired_s),
      pid: Number(r.pid),
    })),
  );
  return Response.json({ job, ...report });
}
