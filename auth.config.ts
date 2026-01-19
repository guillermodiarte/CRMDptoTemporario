import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        // If user is logged in and on login page, redirect to dashboard
        if (nextUrl.pathname === '/login') {
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
      }
      return true;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        // @ts-ignore
        session.user.role = token.role;
        // Image removed from session cookie to prevent header overflow
      }
      return session;
    },
    jwt({ token, user }) {
      if (user) {
        // @ts-ignore
        token.role = user.role
        // Explicitly remove image from token to prevent header overflow (HTTP 431)
        token.picture = null;
        token.image = null;
      }
      return token
    }
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
