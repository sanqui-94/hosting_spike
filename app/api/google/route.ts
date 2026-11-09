import { authorized } from "@/lib/auth";
import { serviceAccount, signedAssertion } from "@/lib/google";

export const dynamic = "force-dynamic";

const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

// Row 3: fetch an OAuth token for the Wallet scope, then make one call to the Wallet API host.
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  const started = Date.now();
  const sa = serviceAccount();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedAssertion(sa, SCOPE),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const token = await tokenRes.json();
  const tokenMs = Date.now() - started;
  if (!token.access_token) {
    return Response.json({ tokenStatus: tokenRes.status, tokenMs, error: token.error, description: token.error_description });
  }

  // Any HTTP status proves the Wallet API is reachable; 403/404 is expected without an issuer account.
  const walletRes = await fetch("https://walletobjects.googleapis.com/walletobjects/v1/issuer", {
    headers: { authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(15_000),
  });

  return Response.json({
    tokenStatus: tokenRes.status,
    tokenReturned: true,
    tokenType: token.token_type,
    expiresIn: token.expires_in,
    tokenMs,
    walletApiStatus: walletRes.status,
    walletApiMs: Date.now() - started - tokenMs,
  });
}
