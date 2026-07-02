import { useEffect } from 'react'
import { saveDraft } from '../utils/storage'

export function useDraftAutoSave(text: string, enabled: boolean, intervalMs = 3000) {
  useEffect(() => {
    if (!enabled) return

    const id = setInterval(() => {
      saveDraft(text)
    }, intervalMs)

    return () => clearInterval(id)
  }, [text, enabled, intervalMs])
}
