import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema/auth";
import { eq } from "drizzle-orm";

// 12時間でセッション期限切れ（業務端末の共有・置き忘れ対策）
const SESSION_MAX_AGE_SEC = 60 * 60 * 12;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SEC,
    updateAge: 60 * 60,
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (user.length === 0 || !user[0].passwordHash) {
          return null;
        }

        const passwordValid = await bcrypt.compare(
          credentials.password as string,
          user[0].passwordHash
        );

        if (!passwordValid) {
          return null;
        }

        return {
          id: user[0].id,
          email: user[0].email,
          name: user[0].displayName ?? user[0].name,
          role: user[0].role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.role = token.role ?? "staff";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
