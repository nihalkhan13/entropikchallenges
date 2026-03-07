import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/users
 *
 * Returns all auth users (id + email) for the admin panel.
 * Requires an authenticated admin session.
 */
export async function GET() {
  // 1. Authenticate + authorise caller
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden — admins only' }, { status: 403 })
  }

  // 2. Fetch all users via service role (bypasses RLS, can read auth.users)
  const service = createSupabaseServiceClient()
  const { data: authUsers, error } = await service.auth.admin.listUsers()

  if (error) {
    console.error('Admin listUsers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return only what the admin page needs: id + email
  const users = (authUsers?.users ?? []).map((u: { id: string; email?: string }) => ({
    id: u.id,
    email: u.email ?? '',
  }))

  return NextResponse.json({ users })
}
