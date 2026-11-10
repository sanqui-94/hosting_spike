import { authorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Creates the row 4/6/7 tables and resets spike_jobs to ?jobs=100 pending rows.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const jobs = Math.min(Number(new URL(req.url).searchParams.get("jobs") ?? 100), 1000);
  const db = prisma();
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS spike_jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      claimed_by VARCHAR(64) NULL,
      claimed_at DATETIME(3) NULL,
      INDEX (status)
    )`);
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS spike_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kind VARCHAR(32) NOT NULL,
      detail VARCHAR(255) NOT NULL,
      pid INT NOT NULL,
      uptime_s DOUBLE NOT NULL,
      at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )`);
  await db.spikeJob.deleteMany();
  await db.spikeJob.createMany({ data: Array.from({ length: jobs }, () => ({})) });
  return Response.json({ ok: true, jobs: await db.spikeJob.count() });
}
