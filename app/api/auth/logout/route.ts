import { NextRequest, NextResponse } from 'next/server'
import {
  clearSessionCookies,
  invalidateSession,
  logAction,
  requireApiSession,
  verifyCsrf,
} from '@/lib/security/auth'

export async function POST(request: NextRequest) {
  const auth = requireApiSession(request)
  if ('error' in auth) return auth.error

  if (!verifyCsrf(request, auth.session)) {
	return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  const sessionToken = request.cookies.get('osint_session')?.value
  invalidateSession(sessionToken)

  logAction({
	action: 'LOGOUT',
	actorRole: auth.session.role,
	actorId: auth.session.role === 'admin' ? auth.session.admin_id : auth.session.user_id,
	targetType: 'session',
	details: 'Logout successful',
	ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  const response = NextResponse.json({ ok: true })
  clearSessionCookies(response)
  return response
}
