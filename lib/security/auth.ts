import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME, SESSION_TTL_MS } from './constants'
import { getDb } from './db'

export type Role = 'admin' | 'user'

export interface SessionRecord {
  id: number
  role: Role
  user_id: number | null
  admin_id: number | null
  key_id: number | null
  csrf_token: string
  expires_at: string
}

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function generateSecretToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function nowIso() {
  return new Date().toISOString()
}

function addMs(date: Date, ms: number) {
  return new Date(date.getTime() + ms)
}

export function createUserKeyRaw(): string {
  return `key_${crypto.randomBytes(18).toString('base64url')}`
}

export function createSession(params: {
  role: Role
  userId?: number | null
  adminId?: number | null
  keyId?: number | null
  ip?: string | null
  userAgent?: string | null
}) {
  const db = getDb()
  const sessionToken = generateSecretToken()
  const sessionHash = hashValue(sessionToken)
  const csrfToken = generateSecretToken()
  const expiresAt = addMs(new Date(), SESSION_TTL_MS).toISOString()

  db.prepare(
	`INSERT INTO sessions (session_hash, csrf_token, role, user_id, admin_id, key_id, ip, user_agent, expires_at)
	 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
	sessionHash,
	csrfToken,
	params.role,
	params.userId ?? null,
	params.adminId ?? null,
	params.keyId ?? null,
	params.ip ?? null,
	params.userAgent ?? null,
	expiresAt,
  )

  return {
	sessionToken,
	csrfToken,
	expiresAt,
  }
}

export function setSessionCookies(response: NextResponse, payload: { sessionToken: string; csrfToken: string; expiresAt: string }) {
  const isProd = process.env.NODE_ENV === 'production'
  const expires = new Date(payload.expiresAt)

  response.cookies.set(SESSION_COOKIE_NAME, payload.sessionToken, {
	httpOnly: true,
	secure: isProd,
	sameSite: 'lax',
	path: '/',
	expires,
  })

  response.cookies.set(CSRF_COOKIE_NAME, payload.csrfToken, {
	httpOnly: false,
	secure: isProd,
	sameSite: 'lax',
	path: '/',
	expires,
  })
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 })
  response.cookies.set(CSRF_COOKIE_NAME, '', { path: '/', maxAge: 0 })
}

export function getSessionFromToken(token: string | undefined | null): SessionRecord | null {
  if (!token) return null
  const db = getDb()
  const sessionHash = hashValue(token)

  const row = db
	.prepare(
	  `SELECT id, role, user_id, admin_id, key_id, csrf_token, expires_at
	   FROM sessions
	   WHERE session_hash = ?
	   LIMIT 1`,
	)
	.get(sessionHash) as SessionRecord | undefined

  if (!row) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) {
	db.prepare('DELETE FROM sessions WHERE id = ?').run(row.id)
	return null
  }

  return row
}

export async function getServerSession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE_NAME)?.value
  return getSessionFromToken(token)
}

export async function requireServerSession(roles?: Role[]) {
  const session = await getServerSession()
  if (!session) redirect('/login')
  if (roles && !roles.includes(session.role)) redirect('/login')
  return session
}

export function requireApiSession(request: NextRequest, roles?: Role[]) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = getSessionFromToken(token)
  if (!session) {
	return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (roles && !roles.includes(session.role)) {
	return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}

export function verifyCsrf(request: NextRequest, session: SessionRecord) {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
	return true
  }

  const header = request.headers.get('x-csrf-token')
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  if (!header || !cookieToken) return false
  if (header !== cookieToken) return false
  if (session.csrf_token !== header) return false
  return true
}

export function invalidateSession(token: string | undefined | null) {
  if (!token) return
  const db = getDb()
  const sessionHash = hashValue(token)
  db.prepare('DELETE FROM sessions WHERE session_hash = ?').run(sessionHash)
}

export function logAction(params: {
  action: string
  actorRole?: string | null
  actorId?: number | null
  targetType?: string | null
  targetId?: string | null
  details?: string | null
  ip?: string | null
}) {
  const db = getDb()
  db.prepare(
	`INSERT INTO logs (action, actor_role, actor_id, target_type, target_id, details, ip)
	 VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
	params.action,
	params.actorRole ?? null,
	params.actorId ?? null,
	params.targetType ?? null,
	params.targetId ?? null,
	params.details ?? null,
	params.ip ?? null,
  )
}

export function logLoginAttempt(params: {
  success: boolean
  role?: Role | null
  userId?: number | null
  adminId?: number | null
  keyId?: number | null
  reason?: string | null
  ip?: string | null
  userAgent?: string | null
}) {
  const db = getDb()
  db.prepare(
	`INSERT INTO login_history (role, user_id, admin_id, key_id, success, reason, ip, user_agent)
	 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
	params.role ?? null,
	params.userId ?? null,
	params.adminId ?? null,
	params.keyId ?? null,
	params.success ? 1 : 0,
	params.reason ?? null,
	params.ip ?? null,
	params.userAgent ?? null,
  )
}

export function hashKey(rawKey: string) {
  return hashValue(rawKey)
}

export function findAdminByRawKey(rawKey: string) {
  const db = getDb()
  const hash = hashKey(rawKey)
  return db
	.prepare('SELECT id, is_active FROM admins WHERE key_hash = ? LIMIT 1')
	.get(hash) as { id: number; is_active: number } | undefined
}

export function findUserKeyByRawKey(rawKey: string) {
  const db = getDb()
  const hash = hashKey(rawKey)
  return db
	.prepare(
	  `SELECT id, is_active, key_type, max_uses, usage_count, expires_at
	   FROM keys
	   WHERE key_hash = ?
	   LIMIT 1`,
	)
	.get(hash) as
	| {
		id: number
		is_active: number
		key_type: string
		max_uses: number | null
		usage_count: number
		expires_at: string | null
	  }
	| undefined
}

export function keyCanBeUsed(key: {
  is_active: number
  key_type: string
  max_uses: number | null
  usage_count: number
  expires_at: string | null
}) {
  if (!key.is_active) return false
  if (key.expires_at && new Date(key.expires_at).getTime() <= Date.now()) return false
  if (key.key_type === 'single' && key.usage_count >= 1) return false
  if (key.max_uses !== null && key.usage_count >= key.max_uses) return false
  return true
}

export function incrementKeyUsage(keyId: number) {
  const db = getDb()
  db.prepare(
	`UPDATE keys
	 SET usage_count = usage_count + 1,
		 updated_at = ?
	 WHERE id = ?`,
  ).run(nowIso(), keyId)
}

export function getOrCreateUserForKey(keyId: number) {
  const db = getDb()
  const existing = db
	.prepare('SELECT id FROM users WHERE key_id = ? LIMIT 1')
	.get(keyId) as { id: number } | undefined

  if (existing) return existing.id

  const username = `user_${keyId}`
  const result = db
	.prepare('INSERT INTO users (key_id, username) VALUES (?, ?)')
	.run(keyId, username)

  return Number(result.lastInsertRowid)
}
