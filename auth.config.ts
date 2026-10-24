import type { NextAuthConfig } from 'next-auth';

const STATIC_SECRET = 'crm-super-secret-key-diarte-2026-auth-persistent-session-permanent';

export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || STATIC_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días: las sesiones se mantienen abiertas indefinidamente
    updateAge: 24 * 60 * 60,   // Se refresca el token automáticamente si el usuario navega
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  pages: {
    signIn: '/admin',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        // If user is logged in and on admin page, redirect to dashboard
        if (nextUrl.pathname === '/admin') {
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
