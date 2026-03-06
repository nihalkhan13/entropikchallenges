import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * PUT /api/admin/settings
 * Body: { key: string, value: string }
 *
 * Updates a challenge_settings row using the service-role client
 * (bypasses RLS). Only accessible to authenticated admins.
 */
export async function PUT(request: NextRequest) {
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
  let body: { key?: string; value?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { key, value } = body
  if (!key || value === undefined || value === null) {
    return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })
  }

  // 3. Upsert using service role (bypasses RLS)
  const service = createSupabaseServiceClient()
  const { error } = await service
    .from('challenge_settings')
    .upsert({ key, value: String(value) }, { onConflict: 'key' })

  if (error) {
    console.error('Admin settings update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
