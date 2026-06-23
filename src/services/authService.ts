import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/profile'

export interface SignUpInput {
  email: string
  password: string
  displayName?: string
}

export interface SignInInput {
  email: string
  password: string
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw error
  }
  return data.session
}

export async function signIn(input: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (error) {
    throw error
  }

  return data
}

export async function signUp(input: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.displayName?.trim() || undefined,
      },
    },
  })

  if (error) {
    throw error
  }

  if (data.user) {
    await createProfile(data.user, input.displayName)
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function createProfile(user: User, displayName?: string) {
  const name =
    displayName?.trim() ||
    (typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : undefined) ||
    user.email?.split('@')[0] ||
    null

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      display_name: name,
    },
    { onConflict: 'id' },
  )

  if (error) {
    throw error
  }
}
