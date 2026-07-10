import { useState, useEffect, useRef } from 'react'
import type { JournalEntry } from '../types'
import { getAudioBlob } from '../utils/audioDb'

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

  return (
    <article className="rounded-xl border border-border bg-surface transition-colors hover:border-accent/30 overflow-hidden">
      <div
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-start gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-baseline gap-2 text-xs text-text-muted">
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
        
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Audio Play Button */}
          {hasAudio && (
            <button
              type="button"
              onClick={handlePlayPause}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-accent hover:bg-accent/10 transition-colors"
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
              title={isPlaying ? "Pause audio" : "Play audio"}
            >
              {isPlaying ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          )}

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-8 min-w-[2rem] items-center justify-center gap-1 rounded-lg px-2 text-text-muted hover:bg-surface-hover hover:text-text transition-colors"
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
