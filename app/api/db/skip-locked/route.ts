import { authorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Row = { id: number };

// Row 7: two transactions on separate connections each lock 5 pending jobs with SKIP LOCKED
// while the other still holds its locks. Pass = both get 5 rows and the sets don't overlap.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const db = prisma();

  let release!: () => void;
  const bothLocked = new Promise<void>((r) => (release = r));
  let locked = 0;

  const claim = (name: string) =>
    db.$transaction(
      async (tx) => {
        const rows = await tx.$queryRawUnsafe<Row[]>(
          "SELECT id FROM spike_jobs WHERE status = 'pending' ORDER BY id LIMIT 5 FOR UPDATE SKIP LOCKED",
        );
        if (++locked === 2) release();
        await Promise.race([bothLocked, new Promise((r) => setTimeout(r, 5_000))]);
        return { name, ids: rows.map((r) => Number(r.id)) };
      },
      { timeout: 15_000 },
    );

  const started = Date.now();
  const [a, b] = await Promise.all([claim("a"), claim("b")]);
  const overlap = a.ids.filter((id) => b.ids.includes(id));
  return Response.json({
    pass: a.ids.length === 5 && b.ids.length === 5 && overlap.length === 0 && locked === 2,
    heldConcurrently: locked === 2,
    a: a.ids,
    b: b.ids,
    overlap,
    ms: Date.now() - started,
  });
}
