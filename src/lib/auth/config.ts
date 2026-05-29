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
          `SELECT account_status, avatar_url FROM users WHERE id = $1 AND deleted_at IS NULL`,
          [user.id]
        );
        const dbUser = result.rows[0];
        if (dbUser) {
          session.user.accountStatus = dbUser.account_status;
          session.user.image = dbUser.avatar_url;
        }
      }
      return session;
    },
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile) {
        const existing = await pool.query(
          `SELECT id, account_status FROM users WHERE email = $1 AND deleted_at IS NULL`,
          [profile.email]
        );
        if (existing.rows.length === 0) {
          await pool.query(
            `INSERT INTO users (email, email_verified, google_id, display_name, cep, avatar_url, account_status)
             VALUES ($1, true, $2, $3, '', $4, 'incomplete_onboarding')
             ON CONFLICT (email) DO UPDATE SET google_id = $2, avatar_url = $4, email_verified = true`,
            [profile.email, profile.sub, profile.name, profile.picture]
          );
        } else if (existing.rows[0].account_status === "suspended") {
          return false;
        } else {
          await pool.query(
            `UPDATE users SET avatar_url = $1 WHERE email = $2`,
            [profile.picture, profile.email]
          );
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
