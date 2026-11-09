import { timingSafeEqual } from "node:crypto";

export function authorized(req: Request): boolean {
  const expected = process.env.SPIKE_KEY;
  if (!expected) return false;
  const given =
    req.headers.get("x-spike-key") ?? new URL(req.url).searchParams.get("key") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
