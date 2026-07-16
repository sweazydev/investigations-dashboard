import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/security/auth'
import { getDb } from '@/lib/security/db'

export async function GET(request: NextRequest) {
  const auth = requireApiSession(request, ['admin'])
  if ('error' in auth) return auth.error

  const db = getDb()

  const stats = {
	totalKeys: (db.prepare('SELECT COUNT(*) as c FROM keys').get() as { c: number }).c,
	activeKeys: (db.prepare('SELECT COUNT(*) as c FROM keys WHERE is_active = 1').get() as { c: number }).c,
	totalUsers: (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c,
	failedLogins24h: (db
	  .prepare(
		`SELECT COUNT(*) as c
		 FROM login_history
		 WHERE success = 0
		 AND created_at >= datetime('now', '-1 day')`,
	  )
	  .get() as { c: number }).c,
  }

  const users = db
	.prepare(
	  `SELECT u.id, u.username, u.key_id, u.created_at,
			  k.key_prefix, k.key_type, k.expires_at, k.is_active
	   FROM users u
	   LEFT JOIN keys k ON k.id = u.key_id
	   ORDER BY u.created_at DESC
	   LIMIT 100`,
	)
	.all()

  const loginHistory = db
	.prepare(
	  `SELECT id, role, user_id, admin_id, key_id, success, reason, ip, user_agent, created_at
	   FROM login_history
	   ORDER BY created_at DESC
	   LIMIT 200`,
	)
	.all()

  const logs = db
	.prepare(
	  `SELECT id, action, actor_role, actor_id, target_type, target_id, details, ip, created_at
	   FROM logs
	   ORDER BY created_at DESC
	   LIMIT 300`,
	)
	.all()

  return NextResponse.json({ stats, users, loginHistory, logs })
}
