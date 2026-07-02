import { useState } from 'react'
import type { JournalEntry } from '../types'

interface EntryItemProps {
  entry: JournalEntry
  onDelete: (id: string) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function firstLinePreview(text: string): string {
  const line = text.split('\n')[0].trim()
  if (line.length <= 80) return line
  return line.slice(0, 80) + '…'
}

export function EntryItem({ entry, onDelete }: EntryItemProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article className="rounded-xl border border-border bg-surface transition-colors hover:border-accent/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline gap-2 text-xs text-text-muted">
            <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
            <span>·</span>
            <time dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time>
            <span>·</span>
            <span>{entry.wordCount} words</span>
          </div>
          {expanded ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{entry.text}</p>
          ) : (
            <p className="truncate text-sm text-text-muted">{firstLinePreview(entry.text)}</p>
          )}
        </div>
        <svg
          className={`mt-0.5 h-4 w-4 shrink-0 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-2">
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            className="text-xs text-red-400 transition-colors hover:text-red-300"
          >
            Delete entry
          </button>
        </div>
      )}
    </article>
  )
}
