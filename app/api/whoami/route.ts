export const dynamic = "force-dynamic";

// Rows 1, 6, 11, 12, 14: which host reached which process, and what the runtime looks like.
export async function GET(req: Request) {
  return Response.json({
    host: req.headers.get("host"),
    forwardedProto: req.headers.get("x-forwarded-proto"),
    pid: process.pid,
    uptimeS: process.uptime(),
    node: process.version,
    tzEnv: process.env.TZ ?? null,
    tzResolved: Intl.DateTimeFormat().resolvedOptions().timeZone,
    nowUtc: new Date().toISOString(),
    nowLocal: new Date().toString(),
  });
}
