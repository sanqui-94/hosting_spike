import { authorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Row 7 load test: each request claims one job with SKIP LOCKED, holds it 200 ms, marks it done.
// Fire 20 at once from outside; pass = 20 distinct ids and no errors.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const started = Date.now();
  try {
    const id = await prisma().$transaction(
      async (tx) => {
        const [row] = await tx.$queryRawUnsafe<{ id: number }[]>(
          "SELECT id FROM spike_jobs WHERE status = 'pending' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED",
        );
        if (!row) return null;
        await new Promise((r) => setTimeout(r, 200));
        await tx.spikeJob.update({
          where: { id: Number(row.id) },
          data: { status: "done", claimedBy: String(process.pid), claimedAt: new Date() },
        });
        return Number(row.id);
      },
      { timeout: 15_000, maxWait: 15_000 },
    );
    return Response.json({ ok: true, id, pid: process.pid, ms: Date.now() - started });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), pid: process.pid, ms: Date.now() - started },
      { status: 500 },
    );
  }
}
