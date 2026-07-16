'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FolderSearch, LogOut, Plus } from 'lucide-react'
import { useCases } from '@/hooks/use-cases'
import { CaseCard } from '@/components/case-card'

export function Dashboard() {
  const router = useRouter()
  const { cases, loaded, createCase, deleteCase } = useCases()
  const [name, setName] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const created = createCase(trimmed)
    setName('')
    router.push(`/case/${created.id}`)
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    const csrf = document.cookie
      .split('; ')
      .find((v) => v.startsWith('osint_csrf='))
      ?.split('=')[1]

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-csrf-token': csrf ?? '' },
      })
    } finally {
      router.replace('/login')
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-5 sm:py-10">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mb-5 overflow-hidden rounded-[24px] border border-border/80 bg-gradient-to-br from-card/80 to-background/50 p-6 shadow-sm backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.25em] text-muted-foreground uppercase">
              Investigations
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Clean, schnell und fokussiert.</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/60 bg-background/50 px-4 text-[13px] font-medium transition-all hover:bg-muted/80 disabled:opacity-50 hover:shadow-sm"
          >
            <LogOut className="size-4 text-muted-foreground" />
            {isLoggingOut ? 'Logout...' : 'Logout'}
          </button>
        </div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-4 py-1.5 text-xs font-medium text-foreground shadow-sm">
          <FolderSearch className="size-3.5 text-primary/80" />
          {cases.length} offene Cases
        </div>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: 'easeOut' }}
        className="rounded-[24px] border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-xl"
      >
        <div className="mb-4 text-[10px] font-semibold tracking-[0.25em] text-muted-foreground uppercase">Neuer Case</div>

        <form onSubmit={handleCreate} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='z. B. "John Doe - fraud lead"'
            aria-label="New case name"
            className="h-12 w-full rounded-xl border border-border/80 bg-background/50 px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-within:border-foreground/30 focus-within:bg-background shadow-sm"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-medium text-background transition-all hover:scale-[1.01] hover:bg-foreground/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 shadow-md"
          >
            <Plus className="size-4" />
            Create Case
          </button>
        </form>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
        className="mt-5 rounded-[24px] border border-border/80 bg-card/50 p-6 shadow-sm backdrop-blur-xl"
      >
        <h2 className="text-[10px] font-semibold tracking-[0.25em] text-muted-foreground uppercase">Deine Cases</h2>

        <div className="mt-4">
          {!loaded ? null : cases.length === 0 ? (
            <EmptyState />
          ) : (
            <motion.ul layout className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {cases.map((item) => (
                  <CaseCard key={item.id} item={item} onDelete={deleteCase} />
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>
      </motion.section>
    </main>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card/40 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-border bg-card">
        <FolderSearch className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium text-foreground">No cases yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Erstelle oben deinen ersten Case.</p>
      </div>
    </div>
  )
}
