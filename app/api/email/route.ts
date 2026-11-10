import { authorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Rows 8 and 10: send one email through the Resend API. ?to=<address> (e.g. a mail-tester.com address).
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const to = new URL(req.url).searchParams.get("to");
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!to) return Response.json({ error: "missing ?to=" }, { status: 400 });
  if (!apiKey || !from) return Response.json({ error: "RESEND_API_KEY and RESEND_FROM must be set" }, { status: 500 });

  const started = Date.now();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Yapa hosting spike: test email",
      text: "Este es un correo de prueba.\n\nThis is a test email sent from the hosting spike through Resend.",
      html: "<p>Este es un correo de prueba.</p><p>This is a test email sent from the hosting spike through Resend.</p>",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  return Response.json({ status: res.status, ms: Date.now() - started, body: await res.json().catch(() => null) });
}
