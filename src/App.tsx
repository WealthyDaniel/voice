import { useCallback, useEffect, useRef, useState } from 'react'
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
import { saveAudioBlob, deleteAudioBlob, getAudioStorageStats } from './utils/audioDb'
import { MicButton } from './components/MicButton'
import { BrowserWarning } from './components/BrowserWarning'
import { EntryEditor } from './components/EntryEditor'
import { EntryList } from './components/EntryList'

type TabType = 'journal' | 'record' | 'calendar' | 'profile'

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = (sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function getDaysInMonth(year: number, month: number): Date[] {
  const date = new Date(year, month, 1)
  const days: Date[] = []
  const startDay = date.getDay()
  date.setDate(date.getDate() - startDay)
  
  const totalDays = 42 // 6 weeks display grid
  for (let i = 0; i < totalDays; i++) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('journal')
  const [mode, setMode] = useState<AppMode>('idle')
  const [editText, setEditText] = useState('')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  
  // Custom States
  const [searchQuery, setSearchQuery] = useState('')
  const [userName, setUserName] = useState('Alex')
  const [isLocked, setIsLocked] = useState(false)
  const [savedConfirmed, setSavedConfirmed] = useState(false)
  const [storageStats, setStorageStats] = useState({ count: 0, size: 0 })
  
  // Calendar States
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date())

  const speechRef = useRef<any>(null)
  const recorderRef = useRef<any>(null)

  const handleTranscriptionComplete = useCallback((text: string) => {
    const recorder = recorderRef.current
    const speech = speechRef.current
    if (!recorder || !speech) return

    if (recorder.duration < 1) {
      alert('Recording too short — try again')
      speech.reset()
      recorder.resetRecording()
      return
    }

    const trimmed = text.trim()
    if (trimmed) {
      setEditText(trimmed)
      setMode('editing')
    } else {
      alert('No voice input detected. Discarding empty entry.')
      speech.reset()
      recorder.resetRecording()
    }
  }, [])

  const speech = useSpeechRecognition({
    onEnd: handleTranscriptionComplete
  })
  speechRef.current = speech
  
  const recorder = useAudioRecorder()
  recorderRef.current = recorder

  // Load Initial Settings
  useEffect(() => {
    setEntries(loadEntries())
    const savedName = localStorage.getItem('voice-journal-name')
    if (savedName) setUserName(savedName)

    const draft = loadDraft()
    if (draft) {
      setEditText(draft)
      setMode('editing')
      setActiveTab('journal')
      speech.setFromText(draft)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch storage stats when profile tab is active
  useEffect(() => {
    if (activeTab === 'profile') {
      getAudioStorageStats().then(setStorageStats)
    }
  }, [activeTab, entries])

  useDraftAutoSave(editText, mode === 'editing' || mode === 'recording')

  // Mic Button Click Callback
  const handleMicClick = useCallback(async () => {
    if (!speech.supported) return

    if (recorder.isRecording) {
      // Pause/Stop visualizer & SpeechRecognition, but don't save yet
      speech.stop()
      recorder.stopRecording()
    } else {
      speech.reset()
      recorder.resetRecording()
      setEditText('')
      
      try {
        // Request microphone permission first to ensure it's granted
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Stop temporary stream tracks
        stream.getTracks().forEach((track) => track.stop())
        
        speech.start()
        await recorder.startRecording()
      } catch (err) {
        console.error('Microphone permission denied:', err)
        alert('Microphone permission is required to record journal entries.')
      }
    }
  }, [speech, recorder])

  const handleDoneRecording = useCallback(() => {
    speech.stop(true) // Tell speech recognition to execute the onEnd callback
    recorder.stopRecording()
  }, [speech, recorder])

  const handleCancelRecording = useCallback(() => {
    speech.stop(false) // Just stop without triggering callback
    speech.reset()
    recorder.resetRecording()
  }, [speech, recorder])

  const handleSave = useCallback(async () => {
    const trimmed = editText.trim()
    if (!trimmed) return

    // Save to localStorage immediately and synchronously
    const entry = addEntry(trimmed, recorder.duration || undefined)

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
      setEntries(confirmedEntries)

      setTimeout(() => {
        setSavedConfirmed(false)
        clearDraft()
        setEditText('')
        speech.reset()
        recorder.resetRecording()
        setMode('idle')
        setActiveTab('journal') // Switch back to Journal view to show entries
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
    setEntries(loadEntries())
  }, [])

  const handleEditChange = useCallback((text: string) => {
    setEditText(text)
    saveDraft(text)
  }, [])

  const handleUpdate = useCallback(() => {
    setEntries(loadEntries())
  }, [])

  const updateUserName = (name: string) => {
    setUserName(name)
    localStorage.setItem('voice-journal-name', name)
  }

  const handleResetDatabase = async () => {
    if (confirm('Are you absolutely sure you want to reset the database? All text and audio entries will be permanently deleted.')) {
      if (confirm('Last warning: This action is non-reversible.')) {
        localStorage.clear()
        const db = await indexedDB.open('VoiceJournalAudioDB')
        db.onsuccess = () => {
          const result = db.result
          const tx = result.transaction('audio-blobs', 'readwrite')
          tx.objectStore('audio-blobs').clear()
        }
        setEntries([])
        clearDraft()
        setEditText('')
        setUserName('Alex')
        alert('Database cleared successfully.')
      }
    }
  }

  // Filtered Entries for Journal Search
  const filteredEntries = entries.filter((e) =>
    e.text.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calendar Helpers
  const handleMonthChange = (direction: 'prev' | 'next') => {
    const nextDate = new Date(currentCalendarDate)
    nextDate.setMonth(nextDate.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentCalendarDate(nextDate)
  }

  const calendarDays = getDaysInMonth(
    currentCalendarDate.getFullYear(),
    currentCalendarDate.getMonth()
  )

  // Entries filtered by selected date on Calendar
  const calendarFilteredEntries = entries.filter((e) => {
    const entryDate = new Date(e.createdAt)
    return (
      entryDate.getDate() === selectedCalendarDate.getDate() &&
      entryDate.getMonth() === selectedCalendarDate.getMonth() &&
      entryDate.getFullYear() === selectedCalendarDate.getFullYear()
    )
  })

  // Format File Size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 KB'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  const isEditingMode = mode === 'editing'

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-6 pb-24">
      {savedConfirmed ? (
        <section className="hero-center space-y-4 animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text">Entry Saved!</h2>
          <p className="text-sm text-text-muted">Your thought has been safely stored.</p>
        </section>
      ) : isEditingMode ? (
        <section className="flex flex-col gap-6 py-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-text">Review Transcript</h1>
            <p className="text-sm text-text-muted">Adjust text content and details before saving</p>
          </div>
          <EntryEditor
            text={editText}
            onChange={handleEditChange}
            onSave={handleSave}
            onDiscard={handleDiscard}
          />
        </section>
      ) : (
        <>
          {/* TAB 1: JOURNAL */}
          {activeTab === 'journal' && (
            <section className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/logo.jpg" alt="Voice Journal Logo" className="h-12 w-12 rounded-xl object-cover border border-border shadow-lg" />
                  <div className="space-y-0.5">
                    <h1 className="text-xl font-bold tracking-tight text-text">
                      Hello, What are you journaling today?
                    </h1>
                    <p className="text-xs text-text-muted">Your thoughts. Your journal.</p>
                  </div>
                </div>
                
                {/* Privacy Lock Toggle */}
                <button
                  onClick={() => setIsLocked(!isLocked)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${isLocked ? 'border-accent bg-accent/20 text-accent' : 'border-border bg-surface text-text-muted hover:text-text'}`}
                  aria-label={isLocked ? 'Unlock entries' : 'Lock entries'}
                  title={isLocked ? 'Unlock entries' : 'Lock entries'}
                >
                  {isLocked ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search through your entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Entries list with optional blur lock */}
              <div className={`transition-all duration-300 ${isLocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
                {filteredEntries.length > 0 ? (
                  <EntryList entries={filteredEntries} onDelete={handleDelete} onUpdate={handleUpdate} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-text-muted">
                    <svg className="mb-4 h-12 w-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm">No entries found matching your query.</p>
                  </div>
                )}
              </div>
              
              {isLocked && (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <svg className="h-10 w-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-sm font-semibold text-text">Journal Locked</p>
                  <p className="text-xs text-text-muted">Tap the lock icon in the top header to reveal entries.</p>
                </div>
              )}
            </section>
          )}

          {/* TAB 2: RECORD */}
          {activeTab === 'record' && (
            <section className="flex flex-col items-center gap-8 py-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <img src="/logo.jpg" alt="Voice Journal Logo" className="h-16 w-16 rounded-2xl object-cover border border-border shadow-lg" />
                <h1 className="text-2xl font-bold tracking-tight text-text">Record</h1>
                <p className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
                  <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Your journal is private and securely stored.
                </p>
              </div>

              {!speech.supported && <BrowserWarning />}

              {/* Large Central Visualizer */}
              <div className="relative flex h-64 w-64 items-center justify-center rounded-full border border-border bg-surface/30 shadow-[0_0_60px_rgba(124,58,237,0.1)]">
                <div className={`absolute inset-0 rounded-full border-2 border-accent/20 ${recorder.isRecording ? 'animate-ping opacity-25' : ''}`} />
                <div className="flex flex-col items-center gap-6">
                  {/* Real-time frequency bars */}
                  <div className="flex items-end justify-center gap-1.5 h-16 w-48">
                    {recorder.visualizerLevels.map((level, idx) => (
                      <span
                        key={idx}
                        className="w-1.5 rounded-full bg-accent transition-all duration-75"
                        style={{ height: `${level * 100}%` }}
                      />
                    ))}
                  </div>
                  {/* Timer */}
                  <div className="text-3xl font-mono font-semibold tracking-wider text-text">
                    {formatTimer(recorder.duration)}
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-center">
                <p className="text-sm font-medium text-text">
                  {recorder.isRecording ? 'Recording in progress...' : 'Tap to start recording'}
                </p>
                <p className="text-xs text-text-muted">
                  {recorder.isRecording ? 'Speak freely — your voice is being captured' : 'Speak your thoughts...'}
                </p>
              </div>

              {/* Transcription Live Preview box */}
              {recorder.isRecording && (
                <div className="min-h-[5rem] w-full max-w-sm rounded-xl border border-border bg-surface/50 px-4 py-3 text-left">
                  {speech.liveText ? (
                    <p className="text-sm leading-relaxed text-text">
                      {speech.transcript}
                      <span className="text-accent font-medium"> {speech.interimTranscript}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted">Listening for speech...</p>
                  )}
                </div>
              )}

              {/* Controls bar matching center image screen */}
              <div className="flex w-full max-w-xs items-center justify-between gap-6 pt-4">
                {/* Discard Button (Left) */}
                <button
                  type="button"
                  onClick={handleCancelRecording}
                  disabled={!recorder.isRecording && recorder.duration === 0}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-text-muted hover:border-red-400/30 hover:text-red-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Discard recording"
                  title="Discard recording"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                {/* Mic Record Toggle (Center) */}
                <MicButton
                  isListening={recorder.isRecording}
                  disabled={!speech.supported}
                  onClick={handleMicClick}
                />

                {/* Done/Save Button (Right) */}
                <button
                  type="button"
                  onClick={handleDoneRecording}
                  disabled={!recorder.isRecording && recorder.duration === 0}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-accent hover:border-accent hover:bg-accent/10 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Done recording"
                  title="Done recording"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </section>
          )}

          {/* TAB 3: CALENDAR */}
          {activeTab === 'calendar' && (
            <section className="flex flex-col gap-6">
              {/* Month Header controls */}
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-text">
                  {currentCalendarDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
                </h1>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMonthChange('prev')}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:text-text transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMonthChange('next')}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:text-text transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-text-muted">
                <span>SUN</span>
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
                <span>SAT</span>
              </div>

              {/* Monthly calendar Grid */}
              <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
                {calendarDays.map((day, idx) => {
                  const isCurrentMonth = day.getMonth() === currentCalendarDate.getMonth()
                  const isSelected = day.toDateString() === selectedCalendarDate.toDateString()
                  
                  // Check if day has journal entries
                  const hasEntry = entries.some((e) => {
                    const entryDate = new Date(e.createdAt)
                    return entryDate.toDateString() === day.toDateString()
                  })

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedCalendarDate(day)}
                      className={`relative flex flex-col items-center justify-center h-10 w-10 mx-auto rounded-full text-sm font-medium transition-all ${isSelected ? 'bg-accent text-white shadow-lg shadow-accent/40 scale-105' : isCurrentMonth ? 'text-text hover:bg-surface-hover' : 'text-text-muted/40 hover:bg-surface-hover/30'}`}
                    >
                      <span>{day.getDate()}</span>
                      {hasEntry && (
                        <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-accent'}`} />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Entries list for selected calendar date */}
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h2 className="text-sm font-semibold text-text">
                    Entries on {selectedCalendarDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </h2>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent font-medium">
                    {calendarFilteredEntries.length}
                  </span>
                </div>

                {calendarFilteredEntries.length > 0 ? (
                  <EntryList
                    entries={calendarFilteredEntries}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-text-muted">
                    <p className="text-xs">No entries recorded on this day.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB 4: PROFILE */}
          {activeTab === 'profile' && (
            <section className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <img src="/logo.jpg" alt="Voice Journal Logo" className="h-12 w-12 rounded-xl object-cover border border-border shadow-lg" />
                <div className="space-y-0.5">
                  <h1 className="text-xl font-bold tracking-tight text-text">Profile & Stats</h1>
                  <p className="text-xs text-text-muted">Manage your settings and review app size metrics.</p>
                </div>
              </div>

              {/* Username Input Settings */}
              <div className="rounded-xl border border-border bg-surface px-5 py-4 space-y-3">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                  Journaler Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => updateUserName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-surface px-5 py-4">
                  <span className="text-xs text-text-muted uppercase tracking-wider block mb-1">Total Entries</span>
                  <span className="text-2xl font-bold text-text">{entries.length}</span>
                </div>
                <div className="rounded-xl border border-border bg-surface px-5 py-4">
                  <span className="text-xs text-text-muted uppercase tracking-wider block mb-1">Starred Entries</span>
                  <span className="text-2xl font-bold text-accent">
                    {entries.filter((e) => e.isStarred).length}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-surface px-5 py-4">
                  <span className="text-xs text-text-muted uppercase tracking-wider block mb-1">Words Recorded</span>
                  <span className="text-2xl font-bold text-text">
                    {entries.reduce((sum, e) => sum + e.wordCount, 0)}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-surface px-5 py-4">
                  <span className="text-xs text-text-muted uppercase tracking-wider block mb-1">Audio Size (IndexedDB)</span>
                  <span className="text-2xl font-bold text-text">{formatSize(storageStats.size)}</span>
                </div>
              </div>

              {/* Maintenance Actions */}
              <div className="rounded-xl border border-border bg-surface px-5 py-4 space-y-4">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                  Maintenance
                </span>
                <button
                  type="button"
                  onClick={handleResetDatabase}
                  className="w-full rounded-lg bg-red-500/10 border border-red-500/25 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  Reset Entire Database
                </button>
              </div>

              {/* Offline capabilities summary */}
              <div className="rounded-xl border border-border bg-surface/50 px-5 py-4 space-y-2">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider block">
                  Offline Capabilities Active
                </span>
                <p className="text-xs text-text-muted leading-relaxed">
                  Voice Journal uses LocalStorage for text records, IndexedDB for audio files, and a service worker to store CSS/JS bundles. It works 100% offline.
                </p>
              </div>
            </section>
          )}

          {/* Fixed bottom navigation tabs bar */}
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 border-t border-x border-border bg-bg/95 backdrop-blur-md px-4 py-2">
            <div className="mx-auto flex max-w-lg justify-around">
              {/* Journal Tab */}
              <button
                onClick={() => {
                  setMode('idle')
                  setActiveTab('journal')
                }}
                className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${activeTab === 'journal' ? 'text-accent' : 'text-text-muted hover:text-text'}`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Journal</span>
              </button>

              {/* Record Tab */}
              <button
                onClick={() => {
                  setMode('idle')
                  setActiveTab('record')
                }}
                className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${activeTab === 'record' ? 'text-accent' : 'text-text-muted hover:text-text'}`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>Record</span>
              </button>

              {/* Calendar Tab */}
              <button
                onClick={() => {
                  setMode('idle')
                  setActiveTab('calendar')
                }}
                className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${activeTab === 'calendar' ? 'text-accent' : 'text-text-muted hover:text-text'}`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Calendar</span>
              </button>

              {/* Profile Tab */}
              <button
                onClick={() => {
                  setMode('idle')
                  setActiveTab('profile')
                }}
                className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${activeTab === 'profile' ? 'text-accent' : 'text-text-muted hover:text-text'}`}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  )
}

export default App
