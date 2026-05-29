import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const seeds = [
  join(__dirname, "../infra/seeds/stickers.sql"),
  join(__dirname, "../infra/seeds/cep_centroids.sql"),
];

for (const seedFile of seeds) {
  try {
    const sql = readFileSync(seedFile, "utf-8");
    await client.query(sql);
    console.log(`✓ Seeded: ${seedFile}`);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.warn(`⚠ Skipped (not found): ${seedFile}`);
    } else {
      console.error(`✗ Error seeding ${seedFile}:`, err.message);
      process.exit(1);
    }
  }
}

await client.end();
console.log("Seed complete.");
