import { authorized } from "@/lib/auth";
import { json } from "@/lib/json";
import { logEvent, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Row 6: ?s=110 or ?s=130. Logs start and finish server-side, so a cut connection still shows
// whether the handler kept running, and whether the process was restarted (new pid / low uptime).
// ?events=1 lists the recorded sleep events instead.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const url = new URL(req.url);
  if (url.searchParams.get("events")) {
    const events = await prisma().spikeEvent.findMany({
      where: { kind: { startsWith: "sleep" } },
      orderBy: { id: "desc" },
      take: 20,
    });
    return json({ now: new Date().toISOString(), pid: process.pid, uptimeS: process.uptime(), events });
  }

  const s = Math.min(Number(url.searchParams.get("s") ?? 110), 290);
  const run = `${s}s-${Date.now()}`;
  await logEvent("sleep-start", run);
  for (let i = 10; i <= s; i += 10) {
    await new Promise((r) => setTimeout(r, 10_000));
    await logEvent("sleep-progress", `${run} ${i}s`);
  }
  await new Promise((r) => setTimeout(r, (s % 10) * 1000));
  await logEvent("sleep-end", run);
  return json({ ok: true, run, pid: process.pid, uptimeS: process.uptime() });
}
