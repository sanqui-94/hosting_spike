import { test } from "node:test";
import assert from "node:assert/strict";
import { cronReport, pidSegments } from "./cron-report.ts";

const t0 = Date.UTC(2026, 10, 9, 12, 0, 5);
const at = (min: number, sec = 5, pid = 1) => ({
  receivedMs: t0 + min * 60_000 + (sec - 5) * 1000,
  firedS: Math.floor((t0 + min * 60_000) / 1000) - 1,
  pid,
});

test("empty input", () => {
  assert.equal(cronReport([]).ticks, 0);
});

test("steady minute ticks have no gaps or duplicates", () => {
  const r = cronReport([0, 1, 2, 3].map((m) => at(m)));
  assert.equal(r.expectedMinutes, 4);
  assert.equal(r.missingMinutes, 0);
  assert.deepEqual(r.gaps, []);
  assert.deepEqual(r.duplicateMinutes, []);
  assert.equal(r.intervalSeconds?.median, 60);
});

test("finds gaps, duplicates and distinct pids regardless of input order", () => {
  const r = cronReport([at(5), at(0), at(1), at(1, 40, 2), at(4)]);
  assert.equal(r.missingMinutes, 2);
  assert.deepEqual(r.gaps, [{ fromUtc: "2026-11-09T12:02:00.000Z", minutes: 2 }]);
  assert.deepEqual(r.duplicateMinutes, [{ minuteUtc: "2026-11-09T12:01:00.000Z", count: 2 }]);
  assert.equal(r.intervalSeconds?.min, 35);
  assert.deepEqual(r.pids, [1, 2]);
  assert.equal(r.firedToReceivedMs?.min, 1000);
});

test("pid segments list each process's first and last tick in start order", () => {
  const segs = pidSegments([
    { ...at(2, 5, 7), uptimeS: 30 },
    { ...at(0, 5, 3), uptimeS: 900 },
    { ...at(1, 5, 3), uptimeS: 960 },
  ]);
  assert.deepEqual(
    segs.map((s) => [s.pid, s.ticks, s.uptimeAtFirstS]),
    [[3, 2, 900], [7, 1, 30]],
  );
});
