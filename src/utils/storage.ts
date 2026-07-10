import type { JournalEntry } from '../types'

const ENTRIES_KEY = 'voice-journal-entries'
const DRAFT_KEY = 'voice-journal-draft'

export function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as JournalEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveEntries(entries: JournalEntry[]): void {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
}

export function addEntry(text: string, duration?: number): JournalEntry {
  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
    wordCount: text.trim().split(/\s+/).filter(Boolean).length,
    duration,
    isStarred: false,
  }
  const entries = [entry, ...loadEntries()]
  saveEntries(entries)
  return entry
}

export function updateEntry(updated: JournalEntry): void {
  const entries = loadEntries().map((e) => (e.id === updated.id ? updated : e))
  saveEntries(entries)
}

export function deleteEntry(id: string): void {
  saveEntries(loadEntries().filter((e) => e.id !== id))
}

export function loadDraft(): string {
  return localStorage.getItem(DRAFT_KEY) ?? ''
}

export function saveDraft(text: string): void {
  if (text.trim()) {
    localStorage.setItem(DRAFT_KEY, text)
  } else {
    localStorage.removeItem(DRAFT_KEY)
  }
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY)
}
