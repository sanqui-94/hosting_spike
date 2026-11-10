import { createHash } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { authorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Row 10: read one object from Cloudflare R2 through its S3 API, as the pass service will for images.
// ?object=<key> (default test.png). Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    return Response.json({ error: "R2_* environment variables are not all set" }, { status: 500 });
  }
  const object = new URL(req.url).searchParams.get("object") ?? "test.png";
  const r2 = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const started = Date.now();
  const res = await r2.fetch(
    `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${encodeURIComponent(object)}`,
    { signal: AbortSignal.timeout(15_000) },
  );
  const bytes = Buffer.from(await res.arrayBuffer());
  return Response.json({
    status: res.status,
    ms: Date.now() - started,
    contentType: res.headers.get("content-type"),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...(res.ok ? {} : { error: bytes.toString("utf8").slice(0, 300) }),
  });
}
