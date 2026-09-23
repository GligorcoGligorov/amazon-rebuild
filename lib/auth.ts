import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/lib/db/queries/users";

/**
 * Email + password via Auth.js credentials (D4). Sessions are JWTs, so there is
 * no session table to join on every request.
 *
 * `authorize` returns null for every failure — wrong password and unknown email
 * are indistinguishable from outside, so this cannot be used to discover which
 * addresses have accounts. The sign-in form turns that single null into one
 * honest message (D28).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required behind Vercel's proxy, and by Auth.js v5 when the host is not
  // inferable from AUTH_URL.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await getUserByEmail(email);
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
