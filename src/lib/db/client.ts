import postgres from "postgres";

const globalForSql = globalThis as unknown as { sql: ReturnType<typeof postgres> };

function createSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL environment variable is not set");

  // A lib `postgres` não interpreta `?host=/cloudsql/...` como socket Unix;
  // parseamos manualmente (mesmo padrão de src/lib/auth/config.ts). Com socket
  // Cloud SQL não há TCP nem SSL.
  const url = new URL(connectionString);
  const socketPath = url.searchParams.get("host");

  return postgres({
    host: socketPath ?? url.hostname,
    port: socketPath ? undefined : parseInt(url.port) || 5432,
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: socketPath ? false : process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export const sql = globalForSql.sql ?? createSql();

if (process.env.NODE_ENV !== "production") {
  globalForSql.sql = sql;
}
