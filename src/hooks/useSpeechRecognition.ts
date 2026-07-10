import { useCallback, useEffect, useRef, useState } from 'react'

export function isSpeechRecognitionSupported(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')
  const interimTranscriptRef = useRef('')
  const wantsListeningRef = useRef(false)

  const supported = isSpeechRecognitionSupported()

  // Instantiate SpeechRecognition once at mount so it gets its own mic resource
  // independently of MediaRecorder. Sharing a mic stream between the two causes
  // one of them to silently fail in Chrome.
  useEffect(() => {
    if (!supported) return

    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition!
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalStr = ''
      let interimStr = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalStr += result[0].transcript
        } else {
          interimStr += result[0].transcript
        }
      }
      finalTranscriptRef.current = finalStr
      interimTranscriptRef.current = interimStr
      setTranscript(finalStr)
      setInterimTranscript(interimStr)
    }

    recognition.onend = () => {
      if (wantsListeningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch {
          wantsListeningRef.current = false
          setIsListening(false)
        }
      } else {
        setIsListening(false)
      }
    }

    recognition.onerror = (e) => {
      // 'aborted' fires when we call recognition.stop() — not a real error
      if ((e as SpeechRecognitionErrorEvent).error === 'aborted') return
      console.warn('[SpeechRecognition error]', (e as SpeechRecognitionErrorEvent).error)
      wantsListeningRef.current = false
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [supported])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
    wantsListeningRef.current = true
    setIsListening(true)
    try {
      recognitionRef.current.start()
    } catch (err) {
      console.error('Failed to start SpeechRecognition:', err)
    }
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    wantsListeningRef.current = false
    recognitionRef.current.stop()
    setIsListening(false)
  }, [])

  const reset = useCallback(() => {
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
  }, [])

  const setFromText = useCallback((text: string) => {
    finalTranscriptRef.current = text
    interimTranscriptRef.current = ''
    setTranscript(text)
    setInterimTranscript('')
  }, [])

  // Read directly from refs — always up-to-date, never stale
  const getFinalText = useCallback(() => {
    const final = finalTranscriptRef.current.trim()
    const interim = interimTranscriptRef.current.trim()
    return final && interim ? `${final} ${interim}` : (final || interim)
  }, [])

  const liveText = transcript && interimTranscript
    ? `${transcript} ${interimTranscript}`
    : (transcript || interimTranscript)

  return {
    supported,
    isListening,
    transcript,
    interimTranscript,
    liveText,
    start,
    stop,
    reset,
    setFromText,
    getFinalText,
  }
}
