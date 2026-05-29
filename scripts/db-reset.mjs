import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

console.warn("⚠ Resetting database...");

await client.query(`
  DROP TABLE IF EXISTS
    user_stickers, parental_consent_tokens,
    verification_tokens, sessions, accounts,
    users, stickers, cep_centroids
  CASCADE
`);

const migration = readFileSync(
  join(__dirname, "../infra/migrations/001_initial_schema.sql"),
  "utf-8"
);
await client.query(migration);
console.log("✓ Schema recreated");

await client.end();
console.log("Reset complete. Run npm run db:seed to populate data.");
