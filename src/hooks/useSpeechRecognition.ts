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
  const wantsListeningRef = useRef(false)

  const supported = isSpeechRecognitionSupported()

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

    recognition.onerror = () => {
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
    setTranscript('')
    setInterimTranscript('')
    wantsListeningRef.current = true
    setIsListening(true)
    recognitionRef.current.start()
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    wantsListeningRef.current = false
    recognitionRef.current.stop()
    setIsListening(false)
  }, [])

  const reset = useCallback(() => {
    finalTranscriptRef.current = ''
    setTranscript('')
    setInterimTranscript('')
  }, [])

  const setFromText = useCallback((text: string) => {
    finalTranscriptRef.current = text
    setTranscript(text)
    setInterimTranscript('')
  }, [])

  const liveText = transcript && interimTranscript ? `${transcript} ${interimTranscript}` : (transcript || interimTranscript)

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
  }
}
