import { auth } from "@/auth"
import { cookies } from "next/headers"
import { supabase } from "./supabase"

// User auth type definitions
export type OAuthUser = {
  type: 'oauth'
  userId: string  // Can be UUID or email (JWT-only mode)
  email: string   // Always present for OAuth users
  tier: string
  debatesRemaining: number
  chatsRemaining: number
}

export type AdminAuth = {
  type: 'admin'
}

export type TokenAuth = {
  type: 'token'
  token: string
}

export type UserAuth = OAuthUser | AdminAuth | TokenAuth | null

/**
 * Get current user authentication across both systems (OAuth + Access Codes)
 * Checks NextAuth session first, then falls back to access code cookies
 */
export async function getUserAuth(): Promise<UserAuth> {
  // Try NextAuth OAuth session first
  const session = await auth()
  
  if (session?.user && session.user.email) {
    return {
      type: 'oauth',
      userId: session.user.id,
      email: session.user.email,  // Guaranteed to exist
      tier: session.user.tier,
      debatesRemaining: session.user.debatesRemaining,
      chatsRemaining: session.user.chatsRemaining,
    }
  }
  
  // Fallback to access code system (existing)
  const c = await cookies()
  const mode = c.get('access_mode')?.value
  const token = c.get('access_token')?.value
  
  if (mode === 'admin') {
    return { type: 'admin' }
  }
  
  if (mode === 'token' && token) {
    return { type: 'token', token }
  }
  
  return null
}

/**
 * Check if OAuth user has remaining quota for a specific action
 * @param userEmail - User's email address (more reliable than ID in JWT-only mode)
 */
export async function checkOAuthQuota(
  userEmail: string,
  action: 'debate' | 'chat'
): Promise<{ allowed: boolean; remaining: number }> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }
  
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('debates_remaining, chats_remaining, tier')
    .eq('email', userEmail)
    .single()
  
  if (error || !profile) {
    return { allowed: false, remaining: 0 }
  }
  
  const remaining = action === 'debate' 
    ? profile.debates_remaining 
    : profile.chats_remaining
  
  return {
    allowed: remaining > 0,
    remaining,
  }
}

/**
 * Decrement OAuth user quota after successful action
 * @param userEmail - User's email address (more reliable than ID in JWT-only mode)
 */
export async function decrementOAuthQuota(
  userEmail: string,
  action: 'debate' | 'chat'
): Promise<{ success: boolean; remaining: number }> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }
  
  const field = action === 'debate' ? 'debates_remaining' : 'chats_remaining'
  
  // Direct update (no RPC needed for JWT-only mode)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, debates_remaining, chats_remaining')
    .eq('email', userEmail)
    .single()
  
  
  if (!profile) {
    return { success: false, remaining: 0 }
  }
  
  const currentValue = (field === 'debates_remaining' 
    ? profile.debates_remaining 
    : profile.chats_remaining) as number
  const newValue = Math.max(0, currentValue - 1)
  
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ [field]: newValue })
    .eq('email', userEmail)
  
  if (updateError) {
    return { success: false, remaining: currentValue }
  }
  
  return { success: true, remaining: newValue }
}

/**
 * Refresh OAuth user's quota (called after Stripe webhook or tier change)
 * @param userEmail - User's email address
 */
export async function refreshOAuthQuota(
  userEmail: string,
  tier: 'free' | 'basic' | 'pro'
): Promise<boolean> {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }
  
  // Set limits based on tier (from Phase 2 instructions)
  const limits = {
    free: { debates: 5, chats: 10 },
    basic: { debates: 50, chats: 100 },
    pro: { debates: -1, chats: -1 }, // Unlimited (-1 or very high number)
  }
  
  const { debates, chats } = limits[tier]
  
  const { error } = await supabase
    .from('user_profiles')
    .update({
      tier,
      debates_remaining: debates,
      chats_remaining: chats,
    })
    .eq('email', userEmail)
  
  return !error
}

/**
 * Get OAuth user profile (useful for displaying in UI)
 */
export async function getOAuthUserProfile(userId: string) {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data
}
