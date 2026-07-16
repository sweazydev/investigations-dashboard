import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/security/db'
import { requireApiSession } from '@/lib/security/auth'

export async function GET(request: NextRequest) {
  const auth = requireApiSession(request)
  if ('error' in auth) return auth.error

  const db = getDb()

  if (auth.session.role === 'admin') {
	return NextResponse.json({
	  role: 'admin',
	  adminId: auth.session.admin_id,
	  expiresAt: auth.session.expires_at,
	})
  }

  const user = db
	.prepare('SELECT id, username, key_id, created_at FROM users WHERE id = ? LIMIT 1')
	.get(auth.session.user_id) as
	| { id: number; username: string; key_id: number | null; created_at: string }
	| undefined

  const key = user?.key_id
	? (db
		.prepare('SELECT id, key_prefix, key_type, is_active, usage_count, max_uses, expires_at, created_at FROM keys WHERE id = ? LIMIT 1')
		.get(user.key_id) as
		| {
			id: number
			key_prefix: string
			key_type: string
			is_active: number
			usage_count: number
			max_uses: number | null
			expires_at: string | null
			created_at: string
		  }
		| undefined)
	: undefined

  return NextResponse.json({
	role: 'user',
	user,
	key,
	expiresAt: auth.session.expires_at,
  })
}
