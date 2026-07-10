import { useState, useEffect, useRef } from 'react'
import type { JournalEntry } from '../types'
import { getAudioBlob } from '../utils/audioDb'
import { updateEntry } from '../utils/storage'

interface EntryItemProps {
  entry: JournalEntry
  onDelete: (id: string) => void
  onUpdate?: () => void
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const isToday = date.toDateString() === today.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) return 'Today'
  if (isYesterday) return 'Yesterday'

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(sec: number): string {
  const mins = Math.floor(sec / 60)
  const secs = sec % 60
  return mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`
}

export function EntryItem({ entry, onDelete, onUpdate }: EntryItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    let active = true
    let currentUrl: string | null = null

    getAudioBlob(entry.id)
      .then((blob) => {
        if (!active) return
        if (blob) {
          setHasAudio(true)
          const url = URL.createObjectURL(blob)
          currentUrl = url
          setAudioUrl(url)
        } else {
          setHasAudio(false)
          setAudioUrl(null)
        }
      })
      .catch((err) => {
        console.error('Failed to get audio blob from IndexedDB:', err)
        if (active) {
          setHasAudio(false)
        }
      })

    return () => {
      active = false
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [entry.id])

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(entry.text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!audioUrl) return

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setIsPlaying(false)
    } else {
      if (!audioRef.current) {
        const audio = new Audio(audioUrl)
        audio.onended = () => setIsPlaying(false)
        audioRef.current = audio
      }
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((err) => {
          console.error('Audio playback failed:', err)
        })
    }
  }

  const handleToggleStar = (e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = { ...entry, isStarred: !entry.isStarred }
    updateEntry(updated)
    if (onUpdate) {
      onUpdate()
    }
  }

  return (
    <article className="rounded-xl border border-border bg-surface transition-colors hover:border-accent/30 overflow-hidden">
      <div
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
      >
        {/* Play Button on Left */}
        {hasAudio && (
          <button
            type="button"
            onClick={handlePlayPause}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:bg-accent-hover transition-colors"
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
            title={isPlaying ? "Pause audio" : "Play audio"}
          >
            {isPlaying ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        )}

        {/* Text Content Area */}
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-baseline gap-1 text-sm font-semibold text-text">
            <span>{formatDate(entry.createdAt)}</span>
            <span className="text-text-muted font-normal">•</span>
            <time className="text-text-muted font-normal text-xs">{formatTime(entry.createdAt)}</time>
          </div>
          
          <div className="mb-1 text-xs text-text-muted">
            {entry.duration && <span>{formatDuration(entry.duration)}</span>}
            {entry.duration && <span className="mx-1.5">•</span>}
            <span>{entry.wordCount} words</span>
          </div>

          <p className={`text-sm leading-relaxed text-text ${expanded ? 'whitespace-pre-wrap' : 'truncate'}`}>
            {entry.text}
          </p>
        </div>
        
        {/* Actions on Right */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text transition-colors"
            aria-label="Copy entry text"
            title="Copy to clipboard"
          >
            {copied ? (
              <span className="text-xs text-accent font-medium">Copied!</span>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </button>

          {/* Star Button */}
          <button
            type="button"
            onClick={handleToggleStar}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${entry.isStarred ? 'text-accent' : 'text-text-muted hover:text-text'}`}
            aria-label={entry.isStarred ? "Unstar entry" : "Star entry"}
            title={entry.isStarred ? "Unstar entry" : "Star entry"}
          >
            <svg className="h-4 w-4" fill={entry.isStarred ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.17 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.783-.57-.38-1.81.588-1.81h4.907a1 1 0 00.95-.69l1.519-4.674z" />
            </svg>
          </button>

          {/* Expanded State Chevron */}
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <svg
              className="h-4 w-4"
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
          </div>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border bg-surface/30 px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            className="rounded-md px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            Delete entry
          </button>
        </div>
      )}
    </article>
  )
}
