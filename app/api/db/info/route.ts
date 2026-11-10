import { authorized } from "@/lib/auth";
import { prisma, PRISMA_POOL } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Rows 7, 12, 14: server version, connection limits and clocks.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const db = prisma();
  const [info] = await db.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT VERSION() AS version,
           @@max_connections AS maxConnections,
           @@max_user_connections AS maxUserConnections,
           @@wait_timeout AS waitTimeout,
           @@global.time_zone AS globalTimeZone,
           @@session.time_zone AS sessionTimeZone,
           @@system_time_zone AS systemTimeZone,
           NOW(3) AS now,
           UTC_TIMESTAMP(3) AS utcNow`);
  const [threads] = await db.$queryRawUnsafe<Record<string, unknown>[]>(
    "SHOW STATUS LIKE 'Threads_connected'",
  );
  return Response.json(
    { ...info, threadsConnected: threads?.Value, prismaPool: PRISMA_POOL, pid: process.pid },
    { headers: { "content-type": "application/json" } },
  );
}
