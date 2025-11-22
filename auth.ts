import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { SupabaseAdapter } from "@auth/supabase-adapter"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client for adapter (server-side only, uses service role key)
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'next_auth'
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({
    url: supabaseUrl,
    secret: supabaseServiceKey,
  }),
  
  // Use JWT sessions (recommended for serverless)
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Optional: Force consent screen to get refresh token
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  
  callbacks: {
    // Extend JWT token with user profile data
    async jwt({ token, user, trigger }) {
      // On sign in, fetch user profile from Supabase
      if (user) {
        token.id = user.id
        
        // Fetch user profile from public.user_profiles
        const { data: profile } = await supabaseClient
          .from('user_profiles')
          .select('tier, debates_remaining, chats_remaining, stripe_customer_id')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          token.tier = profile.tier
          token.debatesRemaining = profile.debates_remaining
          token.chatsRemaining = profile.chats_remaining
          token.stripeCustomerId = profile.stripe_customer_id
        }
      }
      
      // On token update (e.g., after Stripe webhook), refetch profile
      if (trigger === "update") {
        const { data: profile } = await supabaseClient
          .from('user_profiles')
          .select('tier, debates_remaining, chats_remaining, stripe_customer_id')
          .eq('id', token.id as string)
          .single()
        
        if (profile) {
          token.tier = profile.tier
          token.debatesRemaining = profile.debates_remaining
          token.chatsRemaining = profile.chats_remaining
          token.stripeCustomerId = profile.stripe_customer_id
        }
      }
      
      return token
    },
    
    // Extend session with data from JWT token
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.tier = token.tier as string
        session.user.debatesRemaining = token.debatesRemaining as number
        session.user.chatsRemaining = token.chatsRemaining as number
        session.user.stripeCustomerId = token.stripeCustomerId as string | null
      }
      return session
    },
    
    // Optional: Custom sign-in callback for additional checks
    async signIn({ user, account, profile }) {
      // Allow sign in
      return true
    },
  },
  
  pages: {
    signIn: '/',  // Redirect to home page (where AccessCodeModal is)
    error: '/',   // Redirect errors to home page
  },
  
  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
})
