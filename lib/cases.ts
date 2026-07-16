export type CaseStatus = 'open' | 'closed'

export interface Attachment {
  name: string
  dataUrl: string
  contentType: string
  size?: number
}

export interface InvestigationCase {
  id: string
  name: string
  status: CaseStatus
  notes: string
  attachments?: Attachment[]
  createdAt: number
  updatedAt: number
}

export const STORAGE_KEY = 'osint:investigations:v1'

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function loadCases(): InvestigationCase[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as InvestigationCase[]
    if (!Array.isArray(parsed)) return []
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export function saveCases(cases: InvestigationCase[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.round(diff / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(timestamp).toLocaleDateString()
}
