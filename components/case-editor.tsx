'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Eye, NotebookPen, Pencil } from 'lucide-react'
import { useCase, useCases } from '@/hooks/use-cases'
import { MarkdownView } from '@/components/markdown-view'
import type { Attachment } from '@/lib/cases'

type Mode = 'edit' | 'preview'
type SaveState = 'idle' | 'saving' | 'saved'

export function CaseEditor({ id }: { id: string }) {
  const router = useRouter()
  const { item, loaded } = useCase(id)
  const { updateCase } = useCases()

  const [mode, setMode] = useState<Mode>('edit')
  const [notes, setNotes] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const hydrated = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Hydrate notes once the case loads.
  useEffect(() => {
    if (item && !hydrated.current) {
      setNotes(item.notes)
      hydrated.current = true
    }
  }, [item])

  const persist = useCallback(
    (value: string) => {
      setSaveState('saving')
      updateCase(id, { notes: value })
      if (savedTimer.current) clearTimeout(savedTimer.current)
      setSaveState('saved')
      savedTimer.current = setTimeout(() => setSaveState('idle'), 1500)
    },
    [id, updateCase],
  )

  const scheduleSave = useCallback(
    (value: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => persist(value), 600)
    },
    [persist],
  )

  function handleChange(value: string) {
    setNotes(value)
    scheduleSave(value)
  }

  function saveNow() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    persist(notes)
  }

  // Keyboard shortcuts: Ctrl/Cmd+S = save, Ctrl/Cmd+Enter = preview.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        saveNow()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        setMode((m) => (m === 'edit' ? 'preview' : 'edit'))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  if (loaded && !item) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-5 py-24 text-center">
        <p className="text-lg font-medium text-foreground">Case not found</p>
        <p className="text-sm text-muted-foreground">
          This investigation may have been deleted.
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-2 inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          Back to investigations
        </button>
      </main>
    )
  }

  async function readFileAsDataUrl(file: File): Promise<Attachment> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve({ name: file.name, dataUrl: String(reader.result), contentType: file.type, size: file.size })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    // Prefer server upload for persisted storage
    if (item?.id) {
      const form = new FormData()
      for (let i = 0; i < files.length; i++) {
        form.append('files', files[i])
      }
      try {
        const res = await fetch(`/api/cases/${id}`, { method: 'PUT', body: form })
        if (!res.ok) throw new Error('Upload failed')
        // notify other hooks to refresh
        window.dispatchEvent(new Event('osint:cases-changed'))
        return
      } catch (e) {
        // fallback to local data-url storage below
      }
    }

    // Fallback: store as data-URLs in local storage (offline)
    const current = item?.attachments ?? []
    const results: Attachment[] = []
    for (let i = 0; i < files.length; i++) {
      try {
        const a = await readFileAsDataUrl(files[i])
        results.push(a)
      } catch (e) {
        // ignore individual file errors
      }
    }
    const next = [...current, ...results]
    updateCase(id, { attachments: next })
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }

  function onDragLeave() {
    setDragging(false)
  }

  function openFilePicker() {
    inputRef.current?.click()
  }

  function removeAttachment(index: number) {
    const current = item?.attachments ?? []
    const next = current.filter((_, i) => i !== index)
    updateCase(id, { attachments: next })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 py-3">
          <Link
            href="/"
            aria-label="Back to investigations"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-foreground">
            {item?.name ?? '…'}
          </h1>
          <SaveIndicator state={saveState} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            <NotebookPen className="size-3.5" />
            Case notes
          </div>

          <div
            role="tablist"
            aria-label="Editor mode"
            className="flex items-center gap-1 rounded-full border border-border bg-card p-1"
          >
            <ModeButton
              active={mode === 'edit'}
              onClick={() => setMode('edit')}
              icon={<Pencil className="size-3.5" />}
              label="Edit"
            />
            <ModeButton
              active={mode === 'preview'}
              onClick={() => setMode('preview')}
              icon={<Eye className="size-3.5" />}
              label="Preview"
            />
          </div>
        </div>

        <div className="mt-4 min-h-[60dvh] rounded-2xl border border-border bg-card/50 p-5 backdrop-blur-sm">
          {mode === 'edit' ? (
            <>
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={`w-full rounded-md border border-dashed p-3 mb-3 transition-colors ${
                  dragging ? 'border-primary bg-primary/5' : 'border-border bg-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Anhänge</div>
                  <div>
                    <button type="button" onClick={openFilePicker} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm">
                      Datei hinzufügen
                    </button>
                    <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  </div>
                </div>
                <div className="mt-3 flex gap-3 overflow-x-auto">
                  {(item?.attachments ?? []).map((a, i) => (
                    <div key={i} className="relative w-28 flex-shrink-0">
                      <img src={a.dataUrl} alt={a.name} className="h-20 w-28 rounded-md object-cover" />
                      <button onClick={() => removeAttachment(i)} className="absolute -top-2 -right-2 rounded-full bg-card border border-border p-1 text-xs">✕</button>
                      <div className="mt-1 text-xs text-muted-foreground truncate">{a.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              <textarea
                value={notes}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Write your findings, timeline, leads, and conclusions here… (autosaves · markdown supported)"
                spellCheck
                className="min-h-[40dvh] w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-foreground/90 outline-none placeholder:text-muted-foreground"
              />
            </>
          ) : (
            <MarkdownView content={notes} />
          )}
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
            Ctrl
          </kbd>
          {' + '}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
            S
          </kbd>{' '}
          to save ·{' '}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
            Ctrl
          </kbd>
          {' + '}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
            Enter
          </kbd>{' '}
          to toggle preview
        </p>
      </main>
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') {
    return <span className="text-xs text-muted-foreground">Autosaves</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {state === 'saving' ? (
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
      ) : (
        <Check className="size-3.5 text-success" />
      )}
      {state === 'saving' ? 'Saving…' : 'Saved'}
    </span>
  )
}
