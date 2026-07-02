export function BrowserWarning() {
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-border bg-surface px-4 py-3 text-center">
      <p className="text-sm text-text-muted">
        Voice journaling works best in <span className="font-medium text-text">Chrome</span> or{' '}
        <span className="font-medium text-text">Edge</span>. Your browser may not support speech
        recognition.
      </p>
    </div>
  )
}
