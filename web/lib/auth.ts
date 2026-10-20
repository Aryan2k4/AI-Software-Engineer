import { getServerSession, type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
export const authConfigured = () =>
  Boolean(
    process.env.GITHUB_ID &&
    process.env.GITHUB_SECRET &&
    process.env.NEXTAUTH_SECRET &&
    process.env.DATABASE_URL,
  );
export const authOptions: NextAuthOptions = {
  providers: process.env.GITHUB_ID
    ? [
        GithubProvider({
          clientId: process.env.GITHUB_ID,
          clientSecret: process.env.GITHUB_SECRET!,
        }),
      ]
    : [],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) token.ownerId = `github:${account.providerAccountId}`;
      return token;
    },
    async session({ session, token }) {
      (session as typeof session & { ownerId?: string }).ownerId =
        token.ownerId as string;
      return session;
    },
  },
};
export async function owner() {
  if (!authConfigured()) return null;
  const s = await getServerSession(authOptions);
  return (s as typeof s & { ownerId?: string })?.ownerId ?? null;
}
