import { DefaultSession } from "next-auth"

// Extend NextAuth types to include custom user profile fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      tier: string
      debatesRemaining: number
      chatsRemaining: number
      stripeCustomerId: string | null
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    tier?: string
    debatesRemaining?: number
    chatsRemaining?: number
    stripeCustomerId?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    tier?: string
    debatesRemaining?: number
    chatsRemaining?: number
    stripeCustomerId?: string | null
  }
}
