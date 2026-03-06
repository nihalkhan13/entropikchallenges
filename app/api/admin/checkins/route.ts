import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * PATCH /api/admin/checkins
 * Body: { user_id: string, date: string, action: 'add' | 'remove' }
 *
 * Allows an admin to toggle any user's check-in square.
 * Uses the service-role client to bypass RLS.
 */
export async function PATCH(request: NextRequest) {
  // 1. Authenticate + authorise
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

  // 2. Parse body
  let body: { user_id?: string; date?: string; action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { user_id, date, action } = body
  if (!user_id || !date || (action !== 'add' && action !== 'remove')) {
    return NextResponse.json({ error: 'Missing or invalid fields: user_id, date, action (add|remove) required' }, { status: 400 })
  }

  // 3. Toggle check-in using service role (bypasses RLS)
  const service = createSupabaseServiceClient()

  if (action === 'remove') {
    const { error } = await service
      .from('checkins')
      .delete()
      .match({ user_id, date })

    if (error) {
      console.error('Admin checkin delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error } = await service
      .from('checkins')
      .insert({ user_id, date })

    if (error) {
      console.error('Admin checkin insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
