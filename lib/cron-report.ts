export type Tick = { receivedMs: number; firedS: number | null; pid: number };

export type CronReport = {
  ticks: number;
  firstUtc: string | null;
  lastUtc: string | null;
  spanMinutes: number;
  expectedMinutes: number;
  missingMinutes: number;
  gaps: { fromUtc: string; minutes: number }[];
  duplicateMinutes: { minuteUtc: string; count: number }[];
  intervalSeconds: Stats | null;
  firedToReceivedMs: Stats | null;
  pids: number[];
};

export type Stats = { min: number; median: number; p95: number; max: number };

const MINUTE = 60_000;

export function stats(values: number[]): Stats | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const at = (q: number) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return { min: s[0], median: at(0.5), p95: at(0.95), max: s[s.length - 1] };
}

const iso = (ms: number) => new Date(ms).toISOString();

export function cronReport(input: Tick[]): CronReport {
  const ticks = [...input].sort((a, b) => a.receivedMs - b.receivedMs);
  if (ticks.length === 0) {
    return {
      ticks: 0, firstUtc: null, lastUtc: null, spanMinutes: 0, expectedMinutes: 0,
      missingMinutes: 0, gaps: [], duplicateMinutes: [], intervalSeconds: null,
      firedToReceivedMs: null, pids: [],
    };
  }

  const perMinute = new Map<number, number>();
  for (const t of ticks) {
    const m = Math.floor(t.receivedMs / MINUTE);
    perMinute.set(m, (perMinute.get(m) ?? 0) + 1);
  }

  const firstMin = Math.floor(ticks[0].receivedMs / MINUTE);
  const lastMin = Math.floor(ticks[ticks.length - 1].receivedMs / MINUTE);
  const gaps: CronReport["gaps"] = [];
  let missing = 0;
  for (let m = firstMin; m <= lastMin; m++) {
    if (perMinute.has(m)) continue;
    let end = m;
    while (end + 1 <= lastMin && !perMinute.has(end + 1)) end++;
    gaps.push({ fromUtc: iso(m * MINUTE), minutes: end - m + 1 });
    missing += end - m + 1;
    m = end;
  }

  const duplicateMinutes = [...perMinute]
    .filter(([, n]) => n > 1)
    .map(([m, count]) => ({ minuteUtc: iso(m * MINUTE), count }));

  const intervals = ticks.slice(1).map((t, i) => (t.receivedMs - ticks[i].receivedMs) / 1000);
  const latencies = ticks
    .filter((t) => t.firedS !== null)
    .map((t) => t.receivedMs - (t.firedS as number) * 1000);

  return {
    ticks: ticks.length,
    firstUtc: iso(ticks[0].receivedMs),
    lastUtc: iso(ticks[ticks.length - 1].receivedMs),
    spanMinutes: lastMin - firstMin,
    expectedMinutes: lastMin - firstMin + 1,
    missingMinutes: missing,
    gaps,
    duplicateMinutes,
    intervalSeconds: stats(intervals),
    firedToReceivedMs: stats(latencies),
    pids: [...new Set(ticks.map((t) => t.pid))].sort((a, b) => a - b),
  };
}
