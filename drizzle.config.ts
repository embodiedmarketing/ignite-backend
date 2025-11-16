import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "../shared/schema.ts", // Schema is in the shared folder at root level
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Fix ES5 target issues with const transformations
  introspect: {
    casing: "camel",
  },
});
