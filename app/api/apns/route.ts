import { connect } from "node:http2";
import { authorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Row 2: open HTTP/2 to Apple's sandbox push host and send an unauthenticated push.
// Any HTTP status from Apple (403 MissingProviderToken, 400 BadDeviceToken) is a pass; a timeout or refusal is a fail.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const host = new URL(req.url).searchParams.get("prod") ? "api.push.apple.com" : "api.sandbox.push.apple.com";
  const started = Date.now();

  const result = await new Promise<Record<string, unknown>>((resolve) => {
    const client = connect(`https://${host}:443`);
    const done = (r: Record<string, unknown>) => {
      client.close();
      resolve({ host, ms: Date.now() - started, ...r });
    };
    const timer = setTimeout(() => done({ reached: false, error: "timeout after 15s" }), 15_000);
    client.on("error", (e) => {
      clearTimeout(timer);
      done({ reached: false, error: `${(e as NodeJS.ErrnoException).code ?? ""} ${e.message}` });
    });
    const stream = client.request({
      ":method": "POST",
      ":path": `/3/device/${"0".repeat(64)}`,
      "apns-topic": "pass.example.spike",
    });
    let body = "";
    let status = 0;
    stream.on("response", (h) => (status = Number(h[":status"])));
    stream.on("data", (c) => (body += c));
    stream.on("end", () => {
      clearTimeout(timer);
      done({ reached: true, status, body });
    });
    stream.on("error", () => {});
    stream.end("{}");
  });

  return Response.json(result);
}
