import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/security/auth'
import { getDb } from '@/lib/security/db'

export async function GET(request: NextRequest) {
  const auth = requireApiSession(request, ['user', 'admin'])
  if ('error' in auth) return auth.error

  const db = getDb()

  if (auth.session.role === 'admin') {
	const adminHistory = db
	  .prepare(
		`SELECT id, success, reason, ip, user_agent, created_at
		 FROM login_history
		 WHERE admin_id = ?
		 ORDER BY created_at DESC
		 LIMIT 100`,
	  )
	  .all(auth.session.admin_id)

	return NextResponse.json({ history: adminHistory })
  }

  const userHistory = db
	.prepare(
	  `SELECT id, success, reason, ip, user_agent, created_at
	   FROM login_history
	   WHERE user_id = ?
	   ORDER BY created_at DESC
	   LIMIT 100`,
	)
	.all(auth.session.user_id)

  return NextResponse.json({ history: userHistory })
}
