'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, LogIn, ShieldAlert } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginPage() {
  const router = useRouter()
  const [keyValue, setKeyValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
	fetch('/api/auth/me')
	  .then(async (r) => {
		if (!r.ok) return null
		return (await r.json()) as { role: 'admin' | 'user' }
	  })
	  .then((me) => {
		if (!me) return
		router.replace(me.role === 'admin' ? '/admin' : '/')
	  })
	  .catch(() => undefined)
  }, [router])

  async function handleSubmit(e: FormEvent) {
	e.preventDefault()
	setError(null)
	setLoading(true)

	try {
	  const response = await fetch('/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ key: keyValue }),
	  })

	  const payload = (await response.json().catch(() => ({}))) as {
		error?: string
		redirectTo?: string
	  }

	  if (!response.ok) {
		setError(payload.error ?? 'Login fehlgeschlagen.')
		return
	  }

	  router.replace(payload.redirectTo ?? '/')
	} catch {
	  setError('Verbindung fehlgeschlagen.')
	} finally {
	  setLoading(false)
	}
  }

  return (
	<main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-background px-5 py-10">
	  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px]" />

	  <motion.section 
		initial={{ opacity: 0, y: 16, scale: 0.98 }}
		animate={{ opacity: 1, y: 0, scale: 1 }}
		transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
		className="relative z-10 w-full max-w-[400px] rounded-[24px] border border-border/60 bg-background/50 p-8 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.4)] backdrop-blur-xl"
	  >
		<div className="mb-8 text-center">
		  <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border border-border/80 bg-card shadow-sm">
			<ShieldAlert className="size-5 text-foreground" />
		  </div>
		  <h1 className="text-[26px] font-semibold tracking-tight text-foreground">Secure Access</h1>
		  <p className="mt-2 text-[13px] text-muted-foreground/90">
			Gib deinen Access Key ein, um fortzufahren.
		  </p>
		</div>

		<form onSubmit={handleSubmit} className="space-y-4">
		  <div>
			<label className="mb-2 block text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">Access Key</label>
			<div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card/60 px-4 shadow-sm transition-colors focus-within:border-foreground/30 focus-within:bg-card">
			  <KeyRound className="size-4 shrink-0 text-muted-foreground/70" />
			  <input
				type="password"
				value={keyValue}
				onChange={(e) => setKeyValue(e.target.value)}
				className="h-12 w-full bg-transparent font-mono text-sm tracking-wider text-foreground outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/40"
				placeholder="key_xxxxxxxx"
				autoComplete="off"
				required
			  />
			</div>
		  </div>

		  <AnimatePresence>
			{error ? (
			  <motion.p 
				initial={{ opacity: 0, height: 0 }} 
				animate={{ opacity: 1, height: 'auto' }} 
				exit={{ opacity: 0, height: 0 }}
				className="px-1 pt-1 text-xs font-medium text-destructive/90"
			  >
				{error}
			  </motion.p>
			) : null}
		  </AnimatePresence>

		  <button
			type="submit"
			disabled={loading || !keyValue.trim()}
			className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-medium text-background shadow-md transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
		  >
			<LogIn className="size-4" />
			{loading ? 'Authentifiziere...' : 'Safe Login'}
		  </button>
		</form>
	  </motion.section>
	</main>
  )
}
