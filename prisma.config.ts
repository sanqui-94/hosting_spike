import { defineConfig } from "prisma/config";

// The datasource URL is only needed by CLI commands that talk to the database; this spike only runs `prisma generate`.
export default defineConfig({
  schema: "prisma/schema.prisma",
});
