import { useState, useRef, useCallback, useEffect } from 'react'
import { AudioAnalyzer } from '../utils/audioAnalyzer'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [visualizerLevels, setVisualizerLevels] = useState<number[]>(Array(15).fill(0.15))

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const timerIntervalRef = useRef<any>(null)
  const analyzerRef = useRef<AudioAnalyzer | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const startRecording = useCallback(async () => {
    chunksRef.current = []
    setAudioBlob(null)
    setDuration(0)
    setVisualizerLevels(Array(15).fill(0.15))

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      // Initialize analyzer
      const analyzer = new AudioAnalyzer(stream)
      analyzerRef.current = analyzer

      // Visualizer polling loop
      const updateVisuals = () => {
        if (analyzerRef.current) {
          setVisualizerLevels(analyzerRef.current.getVolumeLevels())
          animationFrameRef.current = requestAnimationFrame(updateVisuals)
        }
      }
      animationFrameRef.current = requestAnimationFrame(updateVisuals)

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start audio recording:', err)
      setIsRecording(false)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    // Clear timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Close analyzer
    if (analyzerRef.current) {
      analyzerRef.current.close()
      analyzerRef.current = null
    }

    setIsRecording(false)
  }, [])

  const resetRecording = useCallback(() => {
    setAudioBlob(null)
    setDuration(0)
    setVisualizerLevels(Array(15).fill(0.15))
    chunksRef.current = []
    mediaRecorderRef.current = null

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (analyzerRef.current) {
      analyzerRef.current.close()
      analyzerRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      // Clean up on unmount
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (analyzerRef.current) analyzerRef.current.close()
    }
  }, [])

  return {
    isRecording,
    audioBlob,
    duration,
    visualizerLevels,
    startRecording,
    stopRecording,
    resetRecording,
  }
}
