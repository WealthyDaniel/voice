import { useCallback, useEffect, useState } from 'react'
import type { AppMode, JournalEntry } from './types'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useDraftAutoSave } from './hooks/useDraftAutoSave'
import {
  addEntry,
  clearDraft,
  deleteEntry,
  loadDraft,
  loadEntries,
  saveDraft,
} from './utils/storage'
import { MicButton } from './components/MicButton'
import { BrowserWarning } from './components/BrowserWarning'
import { EntryEditor } from './components/EntryEditor'
import { EntryList } from './components/EntryList'

function App() {
  const [mode, setMode] = useState<AppMode>('idle')
  const [editText, setEditText] = useState('')
  const [entries, setEntries] = useState<JournalEntry[]>([])

  const speech = useSpeechRecognition()

  useEffect(() => {
    setEntries(loadEntries())
    const draft = loadDraft()
    if (draft) {
      setEditText(draft)
      setMode('editing')
      speech.setFromText(draft)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useDraftAutoSave(editText, mode === 'editing' || mode === 'recording')

  const handleMicClick = useCallback(() => {
    if (!speech.supported) return

    if (mode === 'recording') {
      speech.stop()
      const text = speech.liveText.trim()
      if (text) {
        setEditText(text)
        setMode('editing')
      } else {
        setMode('idle')
        speech.reset()
      }
    } else if (mode === 'idle') {
      speech.reset()
      setEditText('')
      setMode('recording')
      speech.start()
    }
  }, [mode, speech])

  const handleSave = useCallback(() => {
    const trimmed = editText.trim()
    if (!trimmed) return
    const entry = addEntry(trimmed)
    setEntries((prev) => [entry, ...prev])
    clearDraft()
    setEditText('')
    speech.reset()
    setMode('idle')
  }, [editText, speech])

  const handleDiscard = useCallback(() => {
    clearDraft()
    setEditText('')
    speech.reset()
    setMode('idle')
  }, [speech])

  const handleDelete = useCallback((id: string) => {
    deleteEntry(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const handleEditChange = useCallback((text: string) => {
    setEditText(text)
    saveDraft(text)
  }, [])

  const isRecordingView = mode === 'idle' || mode === 'recording'

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      {isRecordingView ? (
        <section className="hero-center">
          <div className="flex w-full max-w-sm flex-col items-center gap-8">
            <div className="space-y-2">
              <h1 className="text-2xl font-medium tracking-tight text-text">Voice Journal</h1>
              <p className="text-sm text-text-muted">
                {mode === 'recording' ? 'Speak freely — your words appear below' : 'A quiet space for your thoughts'}
              </p>
            </div>

            {!speech.supported && <BrowserWarning />}

            <MicButton
              isListening={mode === 'recording'}
              disabled={!speech.supported}
              onClick={handleMicClick}
            />

            {mode === 'recording' && (
              <div className="min-h-[5rem] w-full rounded-2xl border border-border/60 bg-surface/50 px-4 py-4">
                {speech.liveText ? (
                  <p className="text-left text-base leading-relaxed text-text">
                    {speech.transcript}
                    <span className="text-text-muted">{speech.interimTranscript}</span>
                  </p>
                ) : (
                  <p className="text-sm text-text-muted">Start speaking…</p>
                )}
              </div>
            )}
          </div>

          {entries.length > 0 && (
            <div className="mt-auto w-full max-w-sm pt-12">
              <EntryList entries={entries} onDelete={handleDelete} />
            </div>
          )}
        </section>
      ) : (
        <section className="hero-center">
          <div className="w-full max-w-lg space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-medium tracking-tight text-text">Voice Journal</h1>
              <p className="text-sm text-text-muted">Review and save your entry</p>
            </div>
            <EntryEditor
              text={editText}
              onChange={handleEditChange}
              onSave={handleSave}
              onDiscard={handleDiscard}
            />
          </div>

          {entries.length > 0 && (
            <div className="mt-auto w-full max-w-lg pt-12">
              <EntryList entries={entries} onDelete={handleDelete} />
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default App
