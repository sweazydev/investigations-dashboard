import { NextRequest, NextResponse } from 'next/server'
import {
  createSession,
  findAdminByRawKey,
  findUserKeyByRawKey,
  getOrCreateUserForKey,
  incrementKeyUsage,
  keyCanBeUsed,
  logAction,
  logLoginAttempt,
  setSessionCookies,
} from '@/lib/security/auth'

function getIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { key?: string } | null
  const rawKey = body?.key?.trim()

  if (!rawKey || rawKey.length < 8) {
	return NextResponse.json({ error: 'Ungültiger Key.' }, { status: 400 })
  }

  const ip = getIp(request)
  const userAgent = request.headers.get('user-agent')

  const admin = findAdminByRawKey(rawKey)
  if (admin?.is_active) {
	const session = createSession({ role: 'admin', adminId: admin.id, ip, userAgent })
	logLoginAttempt({ success: true, role: 'admin', adminId: admin.id, ip, userAgent })
	logAction({ action: 'LOGIN', actorRole: 'admin', actorId: admin.id, targetType: 'session', details: 'Admin login successful', ip })

	const response = NextResponse.json({ ok: true, role: 'admin', redirectTo: '/admin' })
	setSessionCookies(response, session)
	return response
  }

  const userKey = findUserKeyByRawKey(rawKey)
  if (!userKey || !keyCanBeUsed(userKey)) {
	logLoginAttempt({ success: false, role: 'user', keyId: userKey?.id ?? null, reason: 'invalid_or_inactive_key', ip, userAgent })
	return NextResponse.json({ error: 'Key ungültig, deaktiviert oder abgelaufen.' }, { status: 401 })
  }

  const userId = getOrCreateUserForKey(userKey.id)
  incrementKeyUsage(userKey.id)

  const session = createSession({ role: 'user', userId, keyId: userKey.id, ip, userAgent })
  logLoginAttempt({ success: true, role: 'user', userId, keyId: userKey.id, ip, userAgent })
  logAction({ action: 'LOGIN', actorRole: 'user', actorId: userId, targetType: 'session', details: 'User login successful', ip })

  const response = NextResponse.json({ ok: true, role: 'user', redirectTo: '/' })
  setSessionCookies(response, session)
  return response
}
