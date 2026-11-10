import { authorized } from "@/lib/auth";
import { json } from "@/lib/json";
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
           UTC_TIMESTAMP(3) AS utcNow,
           @@character_set_server AS charsetServer,
           @@collation_server AS collationServer,
           @@collation_database AS collationDatabase,
           @@collation_connection AS collationConnection,
           @@character_set_client AS charsetClient`);
  const tables = await db.$queryRawUnsafe<Record<string, unknown>[]>(
    "SELECT TABLE_NAME AS name, TABLE_COLLATION AS collation FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
  );
  const [threads] = await db.$queryRawUnsafe<Record<string, unknown>[]>(
    "SHOW STATUS LIKE 'Threads_connected'",
  );
  return json(
    { ...info, tables, threadsConnected: threads?.Value, prismaPool: PRISMA_POOL, pid: process.pid }
  );
}
