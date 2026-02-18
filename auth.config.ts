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
        // @ts-ignore
        session.user.sessionId = token.sessionId;
        // @ts-ignore
        session.user.isSuperAdmin = token.isSuperAdmin;

        // Image removed from session cookie to prevent header overflow
      }
      return session;
    },
    // jwt callback removed - role is handled in auth.ts from UserSession
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
