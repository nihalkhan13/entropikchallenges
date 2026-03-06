import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'

/**
 * DELETE /api/admin/users/[id]
 *
 * Permanently removes a user from auth.users (service role).
 * The FK CASCADE on profiles/checkins/activities/reactions
 * cleans up all their data automatically.
 * Only accessible to authenticated admins. Cannot self-delete.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params

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

  // 2. Prevent self-deletion
  if (targetId === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  // 3. Delete from auth.users (cascades to all user data)
  const service = createSupabaseServiceClient()
  const { error } = await service.auth.admin.deleteUser(targetId)

  if (error) {
    console.error('Admin delete user error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
