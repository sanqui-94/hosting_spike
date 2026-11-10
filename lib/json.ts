// The MariaDB driver returns BIGINT columns and server variables as bigint, which Response.json can't serialize.
export function json(data: unknown, init?: ResponseInit): Response {
  const body = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v));
  return new Response(body, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
}
