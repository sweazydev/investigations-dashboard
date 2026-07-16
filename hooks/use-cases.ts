'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createId,
  loadCases,
  saveCases,
  type InvestigationCase,
} from '@/lib/cases'

const EVENT = 'osint:cases-changed'

function emitChange() {
  window.dispatchEvent(new Event(EVENT))
}

async function fetchServerCases(): Promise<InvestigationCase[] | null> {
  try {
    const res = await fetch('/api/cases')
    if (!res.ok) return null
    const data = await res.json()
    // map server case model to InvestigationCase
    const mapped = (data as any[]).map((c) => ({
      id: String(c.id),
      name: c.title ?? c.name ?? '',
      status: 'open' as const,
      notes: c.notes ?? c.description ?? '',
      attachments: (c.attachments ?? []).map((a: any) => ({ name: a.fileName ?? a.fileName, dataUrl: `/api/cases/${c.id}/attachments/${a.storedFileName}`, contentType: a.contentType })) as any,
      createdAt: c.createdAt ? Date.parse(c.createdAt) : Date.now(),
      updatedAt: c.updatedAt ? Date.parse(c.updatedAt) : Date.now(),
    }))
    return mapped
  } catch {
    return null
  }
}

export function useCases() {
  const [cases, setCases] = useState<InvestigationCase[]>([])
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const fromServer = await fetchServerCases()
    if (fromServer) {
      setCases(fromServer.sort((a, b) => b.updatedAt - a.updatedAt))
      setLoaded(true)
      return
    }
    setCases(loadCases())
    setLoaded(true)
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  const createCase = useCallback((name: string): InvestigationCase => {
    // try server create via POST (form)
    (async () => {
      try {
        const form = new FormData()
        form.append('title', name.trim())
        const res = await fetch('/api/cases', { method: 'POST', body: form })
        if (res.ok) {
          emitChange()
          return
        }
      } catch {}
      // fallback to local
      const now = Date.now()
      const newCase: InvestigationCase = {
        id: createId(),
        name: name.trim(),
        status: 'open',
        notes: '',
        createdAt: now,
        updatedAt: now,
      }
      const next = [newCase, ...loadCases()]
      saveCases(next)
      emitChange()
    })()

    // optimistic local return
    const now = Date.now()
    return {
      id: createId(),
      name: name.trim(),
      status: 'open',
      notes: '',
      createdAt: now,
      updatedAt: now,
    }
  }, [])

  const deleteCase = useCallback((id: string) => {
    ;(async () => {
      try {
        const res = await fetch(`/api/cases/${id}`, { method: 'DELETE' })
        if (res.ok || res.status === 204) {
          emitChange()
          return
        }
      } catch {}
      const next = loadCases().filter((c) => c.id !== id)
      saveCases(next)
      emitChange()
    })()
  }, [])

  const updateCase = useCallback(
    (id: string, patch: Partial<Omit<InvestigationCase, 'id'>>) => {
      ;(async () => {
        try {
          const res = await fetch(`/api/cases/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          })
          if (res.ok) {
            emitChange()
            return
          }
        } catch {}

        const next = loadCases().map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c))
        saveCases(next)
        emitChange()
      })()
    },
    [],
  )

  return { cases, loaded, createCase, deleteCase, updateCase }
}

export function useCase(id: string) {
  const [item, setItem] = useState<InvestigationCase | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const fromServer = await fetchServerCases()
    if (fromServer) {
      const found = fromServer.find((c) => c.id === id) ?? null
      setItem(found)
      setLoaded(true)
      return
    }
    const found = loadCases().find((c) => c.id === id) ?? null
    setItem(found)
    setLoaded(true)
  }, [id])

  useEffect(() => {
    refresh()
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  return { item, loaded }
}
