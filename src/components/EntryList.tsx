import type { JournalEntry } from '../types'
import { EntryItem } from './EntryItem'

interface EntryListProps {
  entries: JournalEntry[]
  onDelete: (id: string) => void
}

export function EntryList({ entries, onDelete }: EntryListProps) {
  if (entries.length === 0) return null

  return (
    <section className="w-full max-w-lg">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
        Past entries
      </h2>
      <ul className="flex flex-col gap-4">
        {entries.map((entry) => (
          <li key={entry.id}>
            <EntryItem entry={entry} onDelete={onDelete} />
          </li>
        ))}
      </ul>
    </section>
  )
}
