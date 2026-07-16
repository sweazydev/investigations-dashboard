'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, LogOut, UserRound } from 'lucide-react'

type MeResponse = {
  role: 'admin' | 'user'
  user?: {
	id: number
	username: string
	key_id: number | null
	created_at: string
  }
  key?: {
	id: number
	key_prefix: string
	key_type: string
	is_active: number
	usage_count: number
	max_uses: number | null
	expires_at: string | null
	created_at: string
  }
  expiresAt: string
}

function getCsrfFromCookie() {
  return document.cookie
	.split('; ')
	.find((v) => v.startsWith('osint_csrf='))
	?.split('=')[1]
}

export function UserPanel() {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([])

  useEffect(() => {
	fetch('/api/auth/me')
	  .then(async (res) => {
		if (!res.ok) {
		  router.replace('/login')
		  return null
		}
		const payload = (await res.json()) as MeResponse
		if (payload.role === 'admin') {
		  router.replace('/admin')
		  return null
		}
		setMe(payload)
		return payload
	  })
	  .then((payload) => {
		if (!payload) return
		return fetch('/api/panel/history')
	  })
	  .then(async (res) => {
		if (!res || !res.ok) return
		const payload = (await res.json()) as { history: Array<Record<string, unknown>> }
		setHistory(payload.history)
	  })
	  .catch(() => undefined)
  }, [router])

  async function logout() {
	const csrf = getCsrfFromCookie()
	await fetch('/api/auth/logout', {
	  method: 'POST',
	  headers: { 'x-csrf-token': csrf ?? '' },
	})
	router.replace('/login')
  }

  return (
	<main className="mx-auto w-full max-w-4xl px-5 py-8 sm:py-10">
	  <header className="mb-5 flex items-center justify-between rounded-2xl border border-border bg-card/60 p-5">
		<div>
		  <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">User Panel</p>
		  <h1 className="mt-1 text-2xl font-semibold text-foreground">Mein Account</h1>
		</div>
		<button onClick={logout} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/40 px-4 text-sm hover:bg-muted">
		  <LogOut className="size-4" /> Logout
		</button>
	  </header>

	  <section className="grid gap-4 sm:grid-cols-2">
		<Card title="Account Informationen" icon={<UserRound className="size-4" />}>
		  <p className="text-sm text-foreground">ID: {me?.user?.id ?? '-'}</p>
		  <p className="text-sm text-foreground">Username: {me?.user?.username ?? '-'}</p>
		  <p className="text-sm text-muted-foreground">Erstellt: {me?.user?.created_at ?? '-'}</p>
		</Card>

		<Card title="Verwendeter Key" icon={<KeyRound className="size-4" />}>
		  <p className="text-sm text-foreground font-mono">{me?.key?.key_prefix ? `${me.key.key_prefix}••••••••` : '-'}</p>
		  <p className="text-sm text-foreground">Typ: {me?.key?.key_type ?? '-'}</p>
		  <p className="text-sm text-foreground">Status: {me?.key?.is_active ? 'Aktiv' : 'Deaktiviert'}</p>
		  <p className="text-sm text-muted-foreground">Ablaufdatum: {me?.key?.expires_at ?? 'Kein Ablauf'}</p>
		</Card>
	  </section>

	  <section className="mt-4 rounded-2xl border border-border bg-card/50 p-5">
		<h2 className="text-xs tracking-[0.2em] text-muted-foreground uppercase">Login-Historie</h2>
		<div className="mt-3 space-y-2 max-h-96 overflow-auto">
		  {history.map((entry, idx) => (
			<pre key={idx} className="rounded-lg border border-border bg-background/30 p-2 text-xs text-muted-foreground overflow-x-auto">{JSON.stringify(entry, null, 2)}</pre>
		  ))}
		</div>
	  </section>
	</main>
  )
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
	<div className="rounded-2xl border border-border bg-card/50 p-5">
	  <div className="mb-3 flex items-center gap-2 text-xs tracking-[0.2em] text-muted-foreground uppercase">
		{icon}
		{title}
	  </div>
	  <div className="space-y-1">{children}</div>
	</div>
  )
}
