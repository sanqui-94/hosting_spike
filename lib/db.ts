import mysql from "mysql2/promise";

const g = globalThis as unknown as { spikePool?: mysql.Pool };

export function db(): mysql.Pool {
  if (!g.spikePool) {
    const uri = process.env.DATABASE_URL;
    if (!uri) throw new Error("DATABASE_URL is not set");
    g.spikePool = mysql.createPool({ uri, connectionLimit: 3 });
  }
  return g.spikePool;
}

let ticksTableReady = false;

export async function ensureTicksTable(): Promise<void> {
  if (ticksTableReady) return;
  await db().query(`
    CREATE TABLE IF NOT EXISTS spike_cron_ticks (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      received_ms BIGINT NOT NULL,
      fired_s BIGINT NULL,
      job VARCHAR(32) NOT NULL DEFAULT 'minute',
      pid INT NOT NULL,
      uptime_s DOUBLE NOT NULL,
      host VARCHAR(255) NULL,
      INDEX (job, received_ms)
    )`);
  ticksTableReady = true;
}
