export interface JournalEntry {
  id: string
  text: string
  createdAt: string
  wordCount: number
  duration?: number
  isStarred?: boolean
}

export type AppMode = 'idle' | 'recording' | 'editing'
