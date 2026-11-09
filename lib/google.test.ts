import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { signedAssertion } from "./google.ts";

test("assertion is an RS256 JWT for Google's token endpoint, verifiable with the public key", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const jwt = signedAssertion({ client_email: "sa@x.iam.gserviceaccount.com", private_key: pem }, "scope-a", 1000);
  const [h, c, s] = jwt.split(".");
  const claims = JSON.parse(Buffer.from(c, "base64url").toString());
  assert.deepEqual(claims, {
    iss: "sa@x.iam.gserviceaccount.com", scope: "scope-a",
    aud: "https://oauth2.googleapis.com/token", iat: 1000, exp: 4600,
  });
  assert.ok(createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, Buffer.from(s, "base64url")));
});
