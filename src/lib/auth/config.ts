import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";

function createPool() {
  const connStr = process.env.DATABASE_URL!;
  const url = new URL(connStr);
  const socketPath = url.searchParams.get("host");
  return new Pool({
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    host: socketPath ?? url.hostname,
    port: socketPath ? undefined : (parseInt(url.port) || 5432),
    ssl: false,
  });
}

const pool = createPool();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PostgresAdapter(pool),
  session: { strategy: "database", maxAge: 24 * 60 * 60 },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (user) {
        session.user.id = user.id;
        const result = await pool.query(
          `SELECT account_status, image FROM users WHERE id = $1 AND deleted_at IS NULL`,
          [user.id]
        );
        const dbUser = result.rows[0];
        if (dbUser) {
          session.user.accountStatus = dbUser.account_status;
          session.user.image = dbUser.image;
        }
      }
      return session;
    },
    async signIn({ account, profile }) {
      // O adapter cria usuario e vincula conta Google.
      // Aqui bloqueamos contas suspensas e usuarios soft-deletados.
      if (account?.provider === "google" && profile?.email) {
        // Usuarios retornantes: verificar via accounts table pelo providerAccountId.
        // Isso detecta soft-delete mesmo apos mudanca de email na tabela users.
        if (account.providerAccountId) {
          const linked = await pool.query(
            `SELECT u.account_status, u.deleted_at
             FROM users u
             JOIN accounts a ON u.id = a."userId"
             WHERE a.provider = $1 AND a."providerAccountId" = $2`,
            [account.provider, account.providerAccountId]
          );
          if (linked.rows[0]) {
            if (linked.rows[0].deleted_at) return false;
            if (linked.rows[0].account_status === "suspended") return false;
            return true;
          }
        }
        // Usuarios novos (sem vinculo em accounts ainda): verificar por email.
        const byEmail = await pool.query(
          `SELECT account_status, deleted_at FROM users WHERE email = $1`,
          [profile.email]
        );
        if (byEmail.rows[0]?.deleted_at) return false;
        if (byEmail.rows[0]?.account_status === "suspended") return false;
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
