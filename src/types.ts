export interface JournalEntry {
  id: string
  text: string
  createdAt: string
  wordCount: number
}

export type AppMode = 'idle' | 'recording' | 'editing'
