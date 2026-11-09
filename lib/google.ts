import { createSign } from "node:crypto";

type ServiceAccount = { client_email: string; private_key: string };

// GOOGLE_SA_KEY_B64: base64 of the whole JSON key file.
// Fallback if that is too long for hPanel: GOOGLE_SA_EMAIL + GOOGLE_SA_PRIVATE_KEY (\n may be literal).
export function serviceAccount(): ServiceAccount {
  const b64 = process.env.GOOGLE_SA_KEY_B64;
  if (b64) return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  const client_email = process.env.GOOGLE_SA_EMAIL;
  const private_key = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!client_email || !private_key) throw new Error("No Google service account configured");
  return { client_email, private_key };
}

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

export function signedAssertion(sa: ServiceAccount, scope: string, nowS = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: nowS,
      exp: nowS + 3600,
    }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(sa.private_key);
  return `${header}.${claims}.${b64url(signature)}`;
}
