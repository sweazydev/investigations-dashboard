import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/security/db'
import { logAction, requireApiSession, verifyCsrf } from '@/lib/security/auth'

function parseIsoOrNull(value: unknown) {
  if (!value) return null
  const asString = String(value)
  const date = new Date(asString)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireApiSession(request, ['admin'])
  if ('error' in auth) return auth.error

  if (!verifyCsrf(request, auth.session)) {
	return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  const { id } = await context.params
  const keyId = Number(id)
  if (!Number.isInteger(keyId)) {
	return NextResponse.json({ error: 'Invalid key id' }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as
	| {
		label?: string
		isActive?: boolean
		keyType?: 'single' | 'unlimited'
		expiresAt?: string | null
		maxUses?: number | null
	  }
	| null

  const db = getDb()
  const current = db.prepare('SELECT id FROM keys WHERE id = ? LIMIT 1').get(keyId) as { id: number } | undefined
  if (!current) {
	return NextResponse.json({ error: 'Key not found' }, { status: 404 })
  }

  const label = typeof body?.label === 'string' ? body.label.trim() : undefined
  const isActive = typeof body?.isActive === 'boolean' ? (body.isActive ? 1 : 0) : undefined
  const keyType = body?.keyType === 'single' ? 'single' : body?.keyType === 'unlimited' ? 'unlimited' : undefined
  const expiresAt = body?.expiresAt !== undefined ? parseIsoOrNull(body.expiresAt) : undefined
  const maxUses = body?.maxUses !== undefined ? (typeof body.maxUses === 'number' ? Math.max(0, Math.floor(body.maxUses)) : null) : undefined

  db.prepare(
	`UPDATE keys
	 SET label = COALESCE(?, label),
		 is_active = COALESCE(?, is_active),
		 key_type = COALESCE(?, key_type),
		 expires_at = COALESCE(?, expires_at),
		 max_uses = COALESCE(?, max_uses),
		 updated_at = datetime('now')
	 WHERE id = ?`,
  ).run(label ?? null, isActive ?? null, keyType ?? null, expiresAt ?? null, maxUses ?? null, keyId)

  logAction({
	action: 'KEY_UPDATED',
	actorRole: 'admin',
	actorId: auth.session.admin_id,
	targetType: 'key',
	targetId: String(keyId),
	details: 'Key metadata/status updated',
	ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireApiSession(request, ['admin'])
  if ('error' in auth) return auth.error

  if (!verifyCsrf(request, auth.session)) {
	return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }

  const { id } = await context.params
  const keyId = Number(id)
  if (!Number.isInteger(keyId)) {
	return NextResponse.json({ error: 'Invalid key id' }, { status: 400 })
  }

  const db = getDb()
  const result = db.prepare('DELETE FROM keys WHERE id = ?').run(keyId)
  if (result.changes === 0) {
	return NextResponse.json({ error: 'Key not found' }, { status: 404 })
  }

  logAction({
	action: 'KEY_DELETED',
	actorRole: 'admin',
	actorId: auth.session.admin_id,
	targetType: 'key',
	targetId: String(keyId),
	details: 'Key deleted by admin',
	ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return NextResponse.json({ ok: true })
}
