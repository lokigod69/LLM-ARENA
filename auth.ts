import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"

// ============================================================================
// ENVIRONMENT VARIABLES VALIDATION
// ============================================================================
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const authSecret = process.env.AUTH_SECRET
const nextAuthUrl = process.env.NEXTAUTH_URL

// Log environment variable status (without exposing secrets)
console.log('🔐 AUTH CONFIG: Environment variables check:')
console.log('  ✓ SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ MISSING')
console.log('  ✓ SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? `✓ Set (${supabaseServiceKey.substring(0, 10)}...)` : '✗ MISSING')
console.log('  ✓ GOOGLE_CLIENT_ID:', googleClientId ? '✓ Set' : '✗ MISSING')
console.log('  ✓ GOOGLE_CLIENT_SECRET:', googleClientSecret ? '✓ Set' : '✗ MISSING')
console.log('  ✓ AUTH_SECRET:', authSecret ? '✓ Set' : '✗ MISSING')
console.log('  ✓ NEXTAUTH_URL:', nextAuthUrl || 'Using default')

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('❌ AUTH CONFIG ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
}
if (!googleClientId || !googleClientSecret) {
  throw new Error('❌ AUTH CONFIG ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required')
}
if (!authSecret) {
  throw new Error('❌ AUTH CONFIG ERROR: AUTH_SECRET is required. Generate with: openssl rand -hex 32')
}

// Create Supabase client for manual user management (server-side only)
console.log('🔗 AUTH CONFIG: Creating Supabase client...')
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})
console.log('✓ Supabase client created successfully (JWT-only mode)')

console.log('⚙️  AUTH CONFIG: Initializing NextAuth...')

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT-only mode (no database adapter)
  // Users are manually managed in public.user_profiles via callbacks
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      // Add profile callback for debugging
      profile(profile) {
        console.log('📧 Google profile received:', {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          picture: profile.picture
        })
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    }),
  ],
  
  callbacks: {
    // Extend JWT token with user profile data
    async jwt({ token, user, trigger, account }) {
      console.log('🔑 JWT Callback triggered:', { 
        hasUser: !!user, 
        trigger, 
        tokenId: token.id,
        provider: account?.provider 
      })
      
      // On sign in, fetch user profile from Supabase by email
      if (user?.email) {
        console.log('👤 New user sign-in, fetching profile for:', user.email)
        token.email = user.email
        token.name = user.name
        token.picture = user.image
        
        // Fetch user profile from public.user_profiles by email
        const { data: profile, error } = await supabaseClient
          .from('user_profiles')
          .select('id, email, tier, debates_remaining, chats_remaining, stripe_customer_id')
          .eq('email', user.email)
          .single()
        
        if (error) {
          console.error('❌ Failed to fetch user profile:', error)
          // Use defaults
          token.id = user.email // Fallback to email as ID
          token.tier = 'free'
          token.debatesRemaining = 5
          token.chatsRemaining = 10
          token.stripeCustomerId = null
        } else if (profile) {
          console.log('✓ User profile loaded:', { tier: profile.tier, debates: profile.debates_remaining })
          token.id = profile.id
          token.tier = profile.tier
          token.debatesRemaining = profile.debates_remaining
          token.chatsRemaining = profile.chats_remaining
          token.stripeCustomerId = profile.stripe_customer_id
        }
      }
      
      // On token update (e.g., after Stripe webhook), refetch profile by email
      if (trigger === "update" && token.email) {
        console.log('🔄 Token update triggered, refetching profile...')
        const { data: profile, error } = await supabaseClient
          .from('user_profiles')
          .select('id, tier, debates_remaining, chats_remaining, stripe_customer_id')
          .eq('email', token.email as string)
          .single()
        
        if (error) {
          console.error('❌ Failed to refetch user profile:', error)
        } else if (profile) {
          console.log('✓ Profile updated:', { tier: profile.tier, debates: profile.debates_remaining })
          token.id = profile.id
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
      console.log('📋 Session callback:', { 
        hasUser: !!session.user, 
        tokenId: token.id,
        tier: token.tier 
      })
      
      if (session.user) {
        session.user.id = token.id as string
        session.user.tier = (token.tier as string) || 'free'
        session.user.debatesRemaining = (token.debatesRemaining as number) ?? 5
        session.user.chatsRemaining = (token.chatsRemaining as number) ?? 10
        session.user.stripeCustomerId = (token.stripeCustomerId as string | null) || null
      }
      return session
    },
    
    // Custom sign-in callback - manually create/update user in Supabase
    async signIn({ user, account, profile }) {
      console.log('🚪 Sign-in callback triggered:', { 
        provider: account?.provider,
        userId: user?.id,
        email: user?.email,
        name: user?.name
      })
      
      if (!user.email) {
        console.error('❌ No email provided, cannot create user')
        return false
      }
      
      try {
        // Check if user already exists
        const { data: existingUser, error: fetchError } = await supabaseClient
          .from('user_profiles')
          .select('id, email, tier, name, image')
          .eq('email', user.email)
          .single()
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 is "not found" which is OK
          console.error('❌ Error checking existing user:', fetchError)
          return false
        }
        
        if (existingUser) {
          console.log('✓ User already exists:', existingUser.email)
          // User exists, update last sign-in time
          await supabaseClient
            .from('user_profiles')
            .update({ 
              updated_at: new Date().toISOString(),
              name: user.name || existingUser.name,
              image: user.image || existingUser.image
            })
            .eq('email', user.email)
        } else {
          console.log('👤 Creating new user profile for:', user.email)
          // Create new user with free tier
          const { error: insertError } = await supabaseClient
            .from('user_profiles')
            .insert({
              email: user.email,
              name: user.name,
              image: user.image,
              tier: 'free',
              debates_remaining: 5,
              chats_remaining: 10,
              stripe_customer_id: null
            })
          
          if (insertError) {
            console.error('❌ Failed to create user profile:', insertError)
            return false
          }
          
          console.log('✅ User profile created successfully')
        }
        
        return true
      } catch (error) {
        console.error('❌ Sign-in callback error:', error)
        return false
      }
    },
  },
  
  pages: {
    signIn: '/',  // Redirect to home page (where AccessCodeModal is)
    error: '/',   // Redirect errors to home page
  },
  
  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
})

console.log('✅ NextAuth configuration complete')
