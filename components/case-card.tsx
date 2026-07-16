'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { formatRelativeTime, type InvestigationCase } from '@/lib/cases'

export function CaseCard({
  item,
  onDelete,
}: {
  item: InvestigationCase
  onDelete: (id: string) => void
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Link
        href={`/case/${item.id}`}
        className="group relative flex items-center gap-4 rounded-2xl border border-border/80 bg-card/60 px-5 py-4 shadow-sm backdrop-blur-md transition-all hover:scale-[1.01] hover:border-foreground/20 hover:bg-card hover:shadow-md"
      >
        <span className="relative flex size-2.5 shrink-0">
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${
              item.status === 'open'
                ? 'animate-ping bg-success/50'
                : 'bg-transparent'
            }`}
          />
          <span
            className={`relative inline-flex size-2.5 rounded-full ${
              item.status === 'open' ? 'bg-success' : 'bg-muted-foreground'
            }`}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{item.name}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{item.status}</span>
            <span aria-hidden>·</span>
            <span>updated {formatRelativeTime(item.updatedAt)}</span>
          </div>
        </div>

        <button
          type="button"
          aria-label={`Delete case ${item.name}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(item.id)
          }}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
      </Link>
    </motion.li>
  )
}
