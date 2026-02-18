
import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"
import { Role } from "@prisma/client"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string
      sessionId?: string | null
      role?: Role | null
      isSuperAdmin?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role?: Role | null
    isSuperAdmin?: boolean
    sessionId?: string | null // For passing from authorize to jwt if needed, or derived
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    sub: string
    sessionId?: string | null
    role?: Role | null
    isSuperAdmin?: boolean
  }
}
