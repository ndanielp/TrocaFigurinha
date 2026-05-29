import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      accountStatus?: string;
    } & DefaultSession["user"];
  }

  interface User {
    accountStatus?: string;
  }
}
