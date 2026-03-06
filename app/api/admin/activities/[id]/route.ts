import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * DELETE /api/admin/activities/[id]
 *
 * Permanently removes a Squad Pulse activity entry (service role).
 * Reactions cascade-delete automatically via FK.
 * Only accessible to authenticated admins.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: activityId } = await params

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

  // 2. Delete activity using service role (bypasses RLS)
  const service = createSupabaseServiceClient()
  const { error } = await service
    .from('activities')
    .delete()
    .eq('id', activityId)

  if (error) {
    console.error('Admin delete activity error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
