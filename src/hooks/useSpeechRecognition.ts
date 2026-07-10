import { useCallback, useEffect, useRef, useState } from 'react'

export function isSpeechRecognitionSupported(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export interface SpeechRecognitionOptions {
  onEnd?: (finalText: string) => void
}

export function useSpeechRecognition(options?: SpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  
  const finalTranscriptRef = useRef('')
  const interimTranscriptRef = useRef('')
  const wantsListeningRef = useRef(false)
  const wantsCallbackRef = useRef(false)
  
  const optionsRef = useRef(options)
  optionsRef.current = options

  const supported = isSpeechRecognitionSupported()

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const start = useCallback(() => {
    if (!supported) return

    // Instantiate SpeechRecognition only when starting (which happens AFTER mic permission is verified)
    if (!recognitionRef.current) {
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
          
          if (wantsCallbackRef.current) {
            wantsCallbackRef.current = false
            const finalText = finalTranscriptRef.current
            
            // Add a short delay (150ms) to ensure no final onresult event is in flight
            setTimeout(() => {
              if (optionsRef.current?.onEnd) {
                optionsRef.current.onEnd(finalText)
              }
            }, 150)
          }
        }
      }

      recognition.onerror = (err) => {
        console.error('[SpeechRecognition error]', err)
        wantsListeningRef.current = false
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }

    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    wantsCallbackRef.current = false
    setTranscript('')
    setInterimTranscript('')
    wantsListeningRef.current = true
    setIsListening(true)

    try {
      recognitionRef.current.start()
    } catch (err) {
      console.error('Failed to start SpeechRecognition:', err)
    }
  }, [supported])

  const stop = useCallback((shouldCallback = false) => {
    if (!recognitionRef.current) return
    wantsListeningRef.current = false
    wantsCallbackRef.current = shouldCallback
    recognitionRef.current.stop()
    setIsListening(false)
  }, [])

  const reset = useCallback(() => {
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    wantsCallbackRef.current = false
    setTranscript('')
    setInterimTranscript('')
  }, [])

  const setFromText = useCallback((text: string) => {
    finalTranscriptRef.current = text
    interimTranscriptRef.current = ''
    setTranscript(text)
    setInterimTranscript('')
  }, [])

  const getLiveText = useCallback(() => {
    const final = finalTranscriptRef.current.trim()
    const interim = interimTranscriptRef.current.trim()
    return final && interim ? `${final} ${interim}` : (final || interim)
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
    getLiveText,
  }
}
