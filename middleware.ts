import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const origin = req.headers.get('origin');

  // Handle OPTIONS request (Preflight)
  if (req.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else {
      response.headers.set('Access-Control-Allow-Origin', '*');
      // Do NOT set Access-Control-Allow-Credentials if origin is '*'
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, Cookie');
    return response;
  }

  // Pass through to NextAuth or next middleware content
  // We need to clone the response to attach headers? 
  // Wait, 'auth' middleware returns void or response. 
  // But NextAuth middleware wrapper logic is tricky to inject headers into AFTER validation if we just export 'auth'.
  // 
  // The standard way with NextAuth v5 middleware is:
  // export default auth((req) => { ... logic ... })
  //
  // So if we are here, we are inside the 'auth' callback.
  // If request is authenticated, we continue.
  // But we need to attach headers to the RESPONSE.
  // In Middleware, we can return NextResponse.next() and add headers.

  const response = NextResponse.next();

  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, Cookie');

  return response;
});

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: [
    // We need to run middleware on API routes too for CORS!
    // Original matcher excluded API. We must INCLUDE API now.
    '/((?!_next/static|_next/image|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.ico$|.*\\.webmanifest$).*)'
  ],
};
