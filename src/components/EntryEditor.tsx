interface EntryEditorProps {
  text: string
  onChange: (text: string) => void
  onSave: () => void
  onDiscard: () => void
}

export function EntryEditor({ text, onChange, onSave, onDiscard }: EntryEditorProps) {
  const canSave = text.trim().length > 0

  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your words will appear here..."
        rows={8}
        className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-base leading-relaxed text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        autoFocus
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save Entry
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-text-muted transition-colors hover:border-text-muted hover:text-text"
        >
          Discard
        </button>
      </div>
    </div>
  )
}
