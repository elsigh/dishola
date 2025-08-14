import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase-client"
import type { PublicProfileResponse } from "@dishola/types"

export interface UserProfile {
  id: string
  email: string | null
  display_name?: string | null
  avatar_url?: string | null
  username?: string | null
}

// Create a separate admin client with service role key
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase service role credentials")
    return null
  }

  return createAdminClient(supabaseUrl, supabaseServiceKey)
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  // Use service role client for admin operations
  const adminClient = createServiceRoleClient()
  if (!adminClient) return null

  try {
    // First get the auth user data
    const { data, error } = await adminClient.auth.admin.getUserById(userId)
    const { user } = data

    if (error) {
      console.error("Error fetching user:", error)
      return null
    }

    if (!user) return null

    // Then get the profile data from the profiles table
    const { data: profileData } = await adminClient
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("user_id", userId)
      .single()

    return {
      id: user.id,
      email: user.email || null,
      display_name: profileData?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name,
      avatar_url: profileData?.avatar_url || user.user_metadata?.avatar_url,
      username: profileData?.username || null
    }
  } catch (error) {
    console.error("Error in getUserProfile:", error)
    return null
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return null

  // Get profile data from the profiles table
  const { data: profileData } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("user_id", user.id)
    .single()

  return {
    id: user.id,
    email: user.email || null,
    display_name: profileData?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name,
    avatar_url: profileData?.avatar_url || user.user_metadata?.avatar_url,
    username: profileData?.username || null
  }
}

export async function updateUserProfile(
  userId: string,
  updates: {
    display_name?: string
    username?: string
  }
): Promise<UserProfile | null> {
  const adminClient = createServiceRoleClient()
  if (!adminClient) return null

  try {
    // Validate username format if provided
    if (updates.username) {
      const usernameRegex = /^[a-z0-9_]+$/
      if (!usernameRegex.test(updates.username)) {
        throw new Error("Username must be lowercase alphanumeric with underscores only")
      }
    }

    // Update the profiles table
    const { error: updateError } = await adminClient.from("profiles").upsert(
      {
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    )

    if (updateError) {
      console.error("Error updating profile:", updateError)
      return null
    }

    // Return the updated profile
    return await getUserProfile(userId)
  } catch (error) {
    console.error("Error in updateUserProfile:", error)
    return null
  }
}

export async function getUserProfileByUsername(username: string): Promise<PublicProfileResponse | null> {
  const adminClient = createServiceRoleClient()
  if (!adminClient) return null

  try {
    // Get profile by username
    const { data: profileData, error: profileError } = await adminClient
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .eq("username", username)
      .single()

    if (profileError || !profileData) {
      return null
    }

    // Get user's tastes
    const { data: tastesData, error: tastesError } = await adminClient
      .from("user_tastes")
      .select(`
        id,
        order_position,
        taste_dictionary:taste_dictionary_id (
          id,
          name,
          type,
          image_url
        )
      `)
      .eq("user_id", profileData.user_id)
      .order("order_position")

    if (tastesError) {
      console.error("Error fetching user tastes:", tastesError)
    }

    // Transform the tastes data to match the expected type
    const transformedTastes = (tastesData || []).map((taste: any) => ({
      id: taste.id,
      order_position: taste.order_position,
      taste_dictionary: taste.taste_dictionary
    }))

    return {
      username: profileData.username,
      display_name: profileData.display_name,
      avatar_url: profileData.avatar_url,
      tastes: transformedTastes
    }
  } catch (error) {
    console.error("Error in getUserProfileByUsername:", error)
    return null
  }
}

// getUserTastes function removed - now available via useAuth().getUserTastes()

export async function syncProfileFromAuthUser(userId: string) {
  // Use service role client for admin operations
  const adminClient = createServiceRoleClient()
  if (!adminClient) return null

  try {
    const { data, error } = await adminClient.auth.admin.getUserById(userId)
    const { user } = data
    if (error || !user) return null
    const display_name = user.user_metadata?.display_name || user.user_metadata?.full_name || null
    const avatar_url = user.user_metadata?.avatar_url || null
    // Upsert into profiles (don't overwrite username if it exists)
    const { error: upsertError } = await adminClient.from("profiles").upsert(
      {
        user_id: user.id,
        display_name,
        avatar_url,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    )
    if (upsertError) {
      console.error("Error upserting profile:", upsertError)
      return null
    }
    return { user_id: user.id, display_name, avatar_url }
  } catch (error) {
    console.error("Error in syncProfileFromAuthUser:", error)
    return null
  }
}
