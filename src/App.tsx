import { useCallback, useEffect, useState } from 'react'
import type { AppMode, JournalEntry } from './types'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useDraftAutoSave } from './hooks/useDraftAutoSave'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import {
  addEntry,
  clearDraft,
  deleteEntry,
  loadDraft,
  loadEntries,
  saveDraft,
} from './utils/storage'
import { saveAudioBlob, deleteAudioBlob } from './utils/audioDb'
import { MicButton } from './components/MicButton'
import { BrowserWarning } from './components/BrowserWarning'
import { EntryEditor } from './components/EntryEditor'
import { EntryList } from './components/EntryList'

function App() {
  const [mode, setMode] = useState<AppMode>('idle')
  const [editText, setEditText] = useState('')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [savedConfirmed, setSavedConfirmed] = useState(false)

  const speech = useSpeechRecognition()
  const recorder = useAudioRecorder()

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

  const handleMicClick = useCallback(async () => {
    if (!speech.supported) return

    if (mode === 'recording') {
      speech.stop()
      recorder.stopRecording()
      const text = speech.liveText.trim()
      if (text) {
        setEditText(text)
        setMode('editing')
      } else {
        setMode('idle')
        speech.reset()
        recorder.resetRecording()
      }
    } else if (mode === 'idle') {
      speech.reset()
      recorder.resetRecording()
      setEditText('')
      setMode('recording')
      speech.start()
      await recorder.startRecording()
    }
  }, [mode, speech, recorder])

  const handleSave = useCallback(async () => {
    const trimmed = editText.trim()
    if (!trimmed) return

    // Save to localStorage immediately and synchronously
    const entry = addEntry(trimmed)

    // Read back and confirm
    const confirmedEntries = loadEntries()
    const savedEntry = confirmedEntries.find((e) => e.id === entry.id)

    if (savedEntry && savedEntry.text === entry.text) {
      // Save audio to IndexedDB if we have one
      if (recorder.audioBlob) {
        try {
          await saveAudioBlob(entry.id, recorder.audioBlob)
        } catch (err) {
          console.error('Failed to save audio blob:', err)
        }
      }

      setSavedConfirmed(true)
      
      // Update entry list from verified load
      setEntries(confirmedEntries)

      setTimeout(() => {
        setSavedConfirmed(false)
        clearDraft()
        setEditText('')
        speech.reset()
        recorder.resetRecording()
        setMode('idle')
      }, 1500)
    } else {
      alert('Failed to verify saved entry. Please try again.')
    }
  }, [editText, speech, recorder])

  const handleDiscard = useCallback(() => {
    clearDraft()
    setEditText('')
    speech.reset()
    recorder.resetRecording()
    setMode('idle')
  }, [speech, recorder])

  const handleDelete = useCallback(async (id: string) => {
    deleteEntry(id)
    try {
      await deleteAudioBlob(id)
    } catch (err) {
      console.error('Failed to delete audio blob:', err)
    }
    // Read directly from localStorage
    setEntries(loadEntries())
  }, [])

  const handleEditChange = useCallback((text: string) => {
    setEditText(text)
    saveDraft(text)
  }, [])

  const isRecordingView = mode === 'idle' || mode === 'recording'

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      {savedConfirmed ? (
        <section className="hero-center space-y-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text">Entry Saved!</h2>
          <p className="text-sm text-text-muted">Your thought has been safely stored.</p>
        </section>
      ) : isRecordingView ? (
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
                    <span className="text-text-muted"> {speech.interimTranscript}</span>
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
