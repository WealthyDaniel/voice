const DB_NAME = 'VoiceJournalAudioDB'
const STORE_NAME = 'audio-blobs'
const DB_VERSION = 1

export function initAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await initAudioDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(blob, id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await initAudioDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteAudioBlob(id: string): Promise<void> {
  const db = await initAudioDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getAudioStorageStats(): Promise<{ count: number; size: number }> {
  const db = await initAudioDb()
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.openCursor()
    let count = 0
    let size = 0
    request.onsuccess = (e) => {
      const cursor = (e.target as any).result
      if (cursor) {
        count++
        if (cursor.value instanceof Blob) {
          size += cursor.value.size
        }
        cursor.continue()
      } else {
        resolve({ count, size })
      }
    }
    request.onerror = () => resolve({ count: 0, size: 0 })
  })
}
