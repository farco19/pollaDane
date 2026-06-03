import argon2 from "argon2";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/db";
import { ensureSeedData } from "@/lib/seed";
import { User } from "@/models/User";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? "dev-auth-secret",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contrasena", type: "password" },
      },
      async authorize(credentials) {
        await connectToDatabase();
        await ensureSeedData();

        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await User.findOne({
          email: credentials.email.toLowerCase(),
          isActive: true,
        }).lean();

        if (!user) {
          return null;
        }

        const isValid = await argon2.verify(user.passwordHash, credentials.password);

        if (!isValid) {
          return null;
        }

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "participant";
        session.user.name = token.name ?? session.user.name ?? "";
        session.user.email = token.email ?? session.user.email ?? "";
      }

      return session;
    },
  },
};
