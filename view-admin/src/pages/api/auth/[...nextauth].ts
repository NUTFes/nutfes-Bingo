import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const authMode = process.env.AUTH_MODE || "keycloak";

const credentialsProvider = CredentialsProvider({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "text" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) return null;

    const multi = process.env.ADMIN_USERS;
    let allowed: Record<string, string> = {};
    if (multi) {
      multi
        .split(",")
        .map((pair) => pair.trim())
        .forEach((pair) => {
          const [e, h] = pair.split(":");
          if (e && h) allowed[e.toLowerCase()] = h;
        });
    } else if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH) {
      allowed[process.env.ADMIN_EMAIL.toLowerCase()] =
        process.env.ADMIN_PASSWORD_HASH;
    }

    const hash = allowed[credentials.email.toLowerCase()];
    if (!hash) return null;
    const ok = await bcrypt.compare(credentials.password, hash);
    if (!ok) return null;
    return { id: credentials.email, email: credentials.email };
  },
});

const providers = [] as NextAuthOptions["providers"];

if (authMode === "keycloak") {
  if (
    !process.env.KEYCLOAK_ID ||
    !process.env.KEYCLOAK_SECRET ||
    !process.env.KEYCLOAK_ISSUER
  ) {
    console.warn(
      "[auth] AUTH_MODE=keycloak but Keycloak env vars missing → fallback to credentials if available.",
    );
  } else {
    providers.push(
      KeycloakProvider({
        clientId: process.env.KEYCLOAK_ID,
        clientSecret: process.env.KEYCLOAK_SECRET,
        issuer: process.env.KEYCLOAK_ISSUER,
      }),
    );
  }
}

if (authMode === "credentials" || providers.length === 0) {
  providers.push(credentialsProvider);
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (token?.email)
        session.user = { ...(session.user || {}), email: token.email } as any;
      return session;
    },
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      return token;
    },
  },
};

export default NextAuth(authOptions);
