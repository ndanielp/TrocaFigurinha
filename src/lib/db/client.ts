import postgres from "postgres";

const globalForSql = globalThis as unknown as { sql: ReturnType<typeof postgres> };

function createSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL environment variable is not set");
  return postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
}

export const sql = globalForSql.sql ?? createSql();

if (process.env.NODE_ENV !== "production") {
  globalForSql.sql = sql;
}
