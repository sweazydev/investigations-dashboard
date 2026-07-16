import { NextRequest, NextResponse } from 'next/server'
import { createUserKeyRaw, hashKey, logAction, requireApiSession, verifyCsrf } from '@/lib/security/auth'
import { getDb } from '@/lib/security/db'

function parseIsoOrNull(value: unknown) {
  if (!value) return null
  const asString = String(value)
  const date = new Date(asString)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export async function GET(request: NextRequest) {
  const auth = requireApiSession(request, ['admin'])
  if ('error' in auth) return auth.error

  const search = request.nextUrl.searchParams.get('search')?.trim() ?? ''
  const db = getDb()

  const items = search
	? db
		.prepare(
		  `SELECT id, label, key_prefix, is_active, key_type, max_uses, usage_count, expires_at, created_at, updated_at
		   FROM keys
		   WHERE label LIKE ? OR key_prefix LIKE ?
		   ORDER BY created_at DESC`,
		)
		.all(`%${search}%`, `%${search}%`)
	: db
		.prepare(
		  `SELECT id, label, key_prefix, is_active, key_type, max_uses, usage_count, expires_at, created_at, updated_at
		   FROM keys
		   ORDER BY created_at DESC`,
		)
		.all()

  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const auth = requireApiSession(request, ['admin'])
  if ('error' in auth) return auth.error

  if (!verifyCsrf(request, auth.session)) {
	return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as
	| {
		label?: string
		keyType?: 'single' | 'unlimited'
		expiresAt?: string | null
		maxUses?: number | null
	  }
	| null

  const raw = createUserKeyRaw()
  const keyHash = hashKey(raw)
  const keyPrefix = raw.slice(0, 8)

  const label = body?.label?.trim() || 'Unnamed key'
  const keyType = body?.keyType === 'single' ? 'single' : 'unlimited'
  const expiresAt = parseIsoOrNull(body?.expiresAt)
  const maxUses = typeof body?.maxUses === 'number' ? Math.max(0, Math.floor(body.maxUses)) : null

  const db = getDb()
  const result = db
	.prepare(
	  `INSERT INTO keys (label, key_hash, key_prefix, is_active, key_type, max_uses, usage_count, expires_at, created_by_admin_id, updated_at)
	   VALUES (?, ?, ?, 1, ?, ?, 0, ?, ?, datetime('now'))`,
	)
	.run(label, keyHash, keyPrefix, keyType, maxUses, expiresAt, auth.session.admin_id)

  const createdId = Number(result.lastInsertRowid)

  logAction({
	action: 'KEY_CREATED',
	actorRole: 'admin',
	actorId: auth.session.admin_id,
	targetType: 'key',
	targetId: String(createdId),
	details: `label=${label}; type=${keyType}; expires=${expiresAt ?? 'none'}`,
	ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return NextResponse.json({
	id: createdId,
	rawKey: raw,
	keyPrefix,
  })
}
