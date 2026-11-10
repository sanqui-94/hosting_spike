import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { authorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Row 4: ?op=write stamps a file in three places; ?op=read (default) reports which still exist.
// Write, then redeploy and read; then restart and read.
const places = () => ({
  appDir: join(process.cwd(), "spike-data"),
  home: join(homedir(), "spike-data"),
  tmp: join(tmpdir(), "spike-data"),
});

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const op = new URL(req.url).searchParams.get("op") ?? "read";
  const stamp = `${new Date().toISOString()} pid=${process.pid}`;
  const results: Record<string, unknown> = {};

  for (const [name, dir] of Object.entries(places())) {
    const file = join(dir, "persist.txt");
    try {
      if (op === "write") {
        await mkdir(dir, { recursive: true });
        await writeFile(file, stamp);
        results[name] = { path: file, wrote: stamp };
      } else {
        const [content, info] = await Promise.all([readFile(file, "utf8"), stat(file)]);
        results[name] = { path: file, exists: true, content, mtime: info.mtime };
      }
    } catch (e) {
      results[name] = { path: file, exists: false, error: (e as NodeJS.ErrnoException).code ?? String(e) };
    }
  }
  return Response.json({ op, pid: process.pid, uptimeS: process.uptime(), cwd: process.cwd(), results });
}
