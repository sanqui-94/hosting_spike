import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

export const PRISMA_POOL = Number(process.env.PRISMA_POOL ?? 10);

function poolConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  const u = new URL(raw);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    connectionLimit: PRISMA_POOL,
    acquireTimeout: 10_000,
    // Hostinger closes idle connections after 20 s (wait_timeout); drop them from the pool first.
    idleTimeout: 10,
    // Without this the connection collation is left to the server and Prisma text filters (LIKE)
    // failed with "Illegal mix of collations" against utf8mb4_unicode_ci tables.
    collation: process.env.DB_COLLATION ?? "UTF8MB4_UNICODE_CI",
  };
}

const g = globalThis as unknown as { spikePrisma?: PrismaClient };

export function prisma(): PrismaClient {
  g.spikePrisma ??= new PrismaClient({ adapter: new PrismaMariaDb(poolConfig()) });
  return g.spikePrisma;
}

export async function logEvent(kind: string, detail: string) {
  await prisma().spikeEvent.create({
    data: { kind, detail: detail.slice(0, 255), pid: process.pid, uptimeS: process.uptime() },
  });
}
