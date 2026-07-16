'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, Search, PlusCircle, Power, Trash2, Save, LogOut, LayoutDashboard } from 'lucide-react'

type AdminOverview = {
  stats: {
	totalKeys: number
	activeKeys: number
	totalUsers: number
	failedLogins24h: number
  }
  users: Array<Record<string, unknown>>
  loginHistory: Array<Record<string, unknown>>
  logs: Array<Record<string, unknown>>
}

type KeyItem = {
  id: number
  label: string
  key_prefix: string
  is_active: number
  key_type: 'single' | 'unlimited'
  max_uses: number | null
  usage_count: number
  expires_at: string | null
  created_at: string
  updated_at: string
}

function getCsrfFromCookie() {
  return document.cookie
	.split('; ')
	.find((v) => v.startsWith('osint_csrf='))
	?.split('=')[1]
}

export function AdminPanel() {
  const router = useRouter()
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [keys, setKeys] = useState<KeyItem[]>([])
  const [search, setSearch] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<'single' | 'unlimited'>('unlimited')
  const [newExpiresAt, setNewExpiresAt] = useState('')
  const [newMaxUses, setNewMaxUses] = useState('')
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const filteredKeys = useMemo(() => keys, [keys])

  async function fetchMe() {
	const res = await fetch('/api/auth/me')
	if (!res.ok) {
	  router.replace('/login')
	  return false
	}
	const me = (await res.json()) as { role: 'admin' | 'user' }
	if (me.role !== 'admin') {
	  router.replace('/panel')
	  return false
	}
	return true
  }

  async function loadOverview() {
	const res = await fetch('/api/admin/overview')
	if (res.ok) setOverview((await res.json()) as AdminOverview)
  }

  async function loadKeys(currentSearch = search) {
	const query = new URLSearchParams()
	if (currentSearch.trim()) query.set('search', currentSearch.trim())
	const res = await fetch(`/api/admin/keys?${query.toString()}`)
	if (res.ok) {
	  const payload = (await res.json()) as { items: KeyItem[] }
	  setKeys(payload.items)
	}
  }

  useEffect(() => {
	fetchMe().then((ok) => {
	  if (!ok) return
	  loadOverview()
	  loadKeys('')
	})
  }, [])

  async function createKey() {
	setStatus(null)
	const csrf = getCsrfFromCookie()
	const response = await fetch('/api/admin/keys', {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
		'x-csrf-token': csrf ?? '',
	  },
	  body: JSON.stringify({
		label: newLabel,
		keyType: newType,
		expiresAt: newExpiresAt || null,
		maxUses: newMaxUses ? Number(newMaxUses) : null,
	  }),
	})

	const payload = (await response.json().catch(() => ({}))) as { rawKey?: string; error?: string }
	if (!response.ok) {
	  setStatus(payload.error ?? 'Key konnte nicht erstellt werden.')
	  return
	}

	setCreatedRawKey(payload.rawKey ?? null)
	setStatus('Key erfolgreich erstellt.')
	setNewLabel('')
	setNewMaxUses('')
	setNewExpiresAt('')
	await loadKeys()
	await loadOverview()
  }

  async function updateKey(id: number, patch: Partial<{ isActive: boolean; label: string; keyType: 'single' | 'unlimited'; expiresAt: string | null; maxUses: number | null }>) {
	const csrf = getCsrfFromCookie()
	await fetch(`/api/admin/keys/${id}`, {
	  method: 'PATCH',
	  headers: {
		'Content-Type': 'application/json',
		'x-csrf-token': csrf ?? '',
	  },
	  body: JSON.stringify(patch),
	})

	await loadKeys()
	await loadOverview()
  }

  async function deleteKey(id: number) {
	const csrf = getCsrfFromCookie()
	await fetch(`/api/admin/keys/${id}`, {
	  method: 'DELETE',
	  headers: { 'x-csrf-token': csrf ?? '' },
	})

	await loadKeys()
	await loadOverview()
  }

  async function logout() {
	const csrf = getCsrfFromCookie()
	await fetch('/api/auth/logout', { method: 'POST', headers: { 'x-csrf-token': csrf ?? '' } })
	router.replace('/login')
  }

  return (
	<main className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-10">
	  <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-5">
		<div>
		  <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Admin Panel</p>
		  <h1 className="mt-1 text-2xl font-semibold text-foreground">Key & Security Management</h1>
		</div>
		<div className="flex items-center gap-2">
		  <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/40 px-4 text-sm hover:bg-muted">
			<LayoutDashboard className="size-4" /> Dashboard
		  </Link>
		  <button onClick={logout} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/40 px-4 text-sm hover:bg-muted">
			<LogOut className="size-4" /> Logout
		  </button>
		</div>
	  </header>

	  <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<Stat label="Keys gesamt" value={overview?.stats.totalKeys ?? 0} />
		<Stat label="Aktive Keys" value={overview?.stats.activeKeys ?? 0} />
		<Stat label="Benutzer" value={overview?.stats.totalUsers ?? 0} />
		<Stat label="Fehler-Logins (24h)" value={overview?.stats.failedLogins24h ?? 0} />
	  </section>

	  <section className="mt-4 grid gap-4 lg:grid-cols-5">
		<div className="rounded-2xl border border-border bg-card/50 p-5 lg:col-span-2">
		  <div className="mb-3 flex items-center gap-2 text-xs tracking-[0.2em] text-muted-foreground uppercase">
			<PlusCircle className="size-4" /> Key erstellen
		  </div>

		  <div className="space-y-2">
			<input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label" className="h-10 w-full rounded-lg border border-border bg-background/40 px-3 text-sm" />
			<select value={newType} onChange={(e) => setNewType(e.target.value as 'single' | 'unlimited')} className="h-10 w-full rounded-lg border border-border bg-background/40 px-3 text-sm">
			  <option value="unlimited">Unbegrenzt</option>
			  <option value="single">Einmal-Key</option>
			</select>
			<input type="datetime-local" value={newExpiresAt} onChange={(e) => setNewExpiresAt(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background/40 px-3 text-sm" />
			<input type="number" min={0} value={newMaxUses} onChange={(e) => setNewMaxUses(e.target.value)} placeholder="Max Uses (optional)" className="h-10 w-full rounded-lg border border-border bg-background/40 px-3 text-sm" />
			<button onClick={createKey} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm text-primary-foreground hover:bg-primary/90">
			  <Save className="size-4" /> Erstellen
			</button>
		  </div>

		  {createdRawKey ? (
			<div className="mt-3 rounded-lg border border-border bg-background/40 p-3 text-xs text-foreground">
			  Neuer Key (nur einmal sichtbar): <span className="font-mono">{createdRawKey}</span>
			</div>
		  ) : null}
		  {status ? <p className="mt-2 text-xs text-muted-foreground">{status}</p> : null}
		</div>

		<div className="rounded-2xl border border-border bg-card/50 p-5 lg:col-span-3">
		  <div className="mb-3 flex items-center gap-2 text-xs tracking-[0.2em] text-muted-foreground uppercase">
			<Shield className="size-4" /> Keys verwalten
		  </div>

		  <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3">
			<Search className="size-4 text-muted-foreground" />
			<input
			  value={search}
			  onChange={(e) => setSearch(e.target.value)}
			  onKeyDown={(e) => {
				if (e.key === 'Enter') loadKeys((e.target as HTMLInputElement).value)
			  }}
			  placeholder="Suche nach Label oder Prefix"
			  className="h-10 w-full bg-transparent text-sm outline-none"
			/>
			<button onClick={() => loadKeys(search)} className="text-xs text-muted-foreground hover:text-foreground">Suchen</button>
		  </div>

		  <div className="space-y-2">
			{filteredKeys.map((key) => (
			  <div key={key.id} className="rounded-xl border border-border bg-background/30 p-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
				  <div>
					<p className="text-sm font-medium text-foreground">{key.label}</p>
					<p className="text-xs text-muted-foreground font-mono">{key.key_prefix}••••••••</p>
					<p className="text-xs text-muted-foreground">{key.key_type} · uses {key.usage_count}{key.max_uses !== null ? `/${key.max_uses}` : ''}</p>
				  </div>

				  <div className="flex items-center gap-2">
					<button onClick={() => updateKey(key.id, { isActive: key.is_active !== 1 })} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-background/30 px-3 text-xs hover:bg-muted">
					  <Power className="size-3.5" /> {key.is_active ? 'Deaktivieren' : 'Aktivieren'}
					</button>
					<button onClick={() => deleteKey(key.id)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-background/30 px-3 text-xs hover:bg-muted">
					  <Trash2 className="size-3.5" /> Löschen
					</button>
				  </div>
				</div>
			  </div>
			))}
		  </div>
		</div>
	  </section>

	  <section className="mt-4 grid gap-4 lg:grid-cols-2">
		<PanelList title="Benutzer" items={overview?.users ?? []} />
		<PanelList title="Login-Verlauf" items={overview?.loginHistory ?? []} />
	  </section>

	  <section className="mt-4 rounded-2xl border border-border bg-card/50 p-5">
		<h2 className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Aktivitätsprotokoll</h2>
		<div className="mt-3 overflow-x-auto">
		  <table className="w-full min-w-[680px] text-left text-sm">
			<thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
			  <tr>
				<th className="py-2 pr-3">Zeit</th>
				<th className="py-2 pr-3">Aktion</th>
				<th className="py-2 pr-3">Rolle</th>
				<th className="py-2 pr-3">Target</th>
				<th className="py-2 pr-3">Details</th>
			  </tr>
			</thead>
			<tbody>
			  {(overview?.logs ?? []).map((entry, idx) => (
				<tr key={idx} className="border-t border-border/70 text-xs text-foreground/90">
				  <td className="py-2 pr-3">{String(entry.created_at ?? '-')}</td>
				  <td className="py-2 pr-3">{String(entry.action ?? '-')}</td>
				  <td className="py-2 pr-3">{String(entry.actor_role ?? '-')}</td>
				  <td className="py-2 pr-3">{String(entry.target_type ?? '-')} #{String(entry.target_id ?? '-')}</td>
				  <td className="py-2 pr-3 max-w-[300px] truncate">{String(entry.details ?? '-')}</td>
				</tr>
			  ))}
			</tbody>
		  </table>
		</div>
	  </section>
	</main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
	<div className="relative overflow-hidden rounded-[20px] border border-border/80 bg-gradient-to-br from-card/80 to-background p-5 shadow-sm transition-all hover:border-foreground/20">
	  <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">{label}</p>
	  <p className="mt-3 text-[32px] font-semibold tracking-tight text-foreground">{value}</p>
	  <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-primary/10 blur-xl" />
	</div>
  )
}

function PanelList({ title, items }: { title: string; items: Array<Record<string, unknown>> }) {
  return (
	<div className="rounded-2xl border border-border bg-card/50 p-5">
	  <h2 className="text-xs tracking-[0.2em] text-muted-foreground uppercase">{title}</h2>
	  <div className="mt-3 max-h-72 overflow-auto space-y-2">
		{items.map((entry, idx) => (
		  <div key={idx} className="rounded-lg border border-border bg-background/30 p-3 text-xs text-foreground/90">
			{Object.entries(entry).slice(0, 6).map(([key, value]) => (
			  <div key={key} className="flex items-start gap-2">
				<span className="min-w-24 text-muted-foreground">{key}</span>
				<span className="break-all">{String(value ?? '-')}</span>
			  </div>
			))}
		  </div>
		))}
	  </div>
	</div>
  )
}
