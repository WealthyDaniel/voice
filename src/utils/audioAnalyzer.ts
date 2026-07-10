export class AudioAnalyzer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array = new Uint8Array(0)
  private source: MediaStreamAudioSourceNode | null = null

  constructor(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      this.audioContext = new AudioCtx()
      this.analyser = this.audioContext.createAnalyser()
      // Use a small fftSize for fast, simple frequency binning
      this.analyser.fftSize = 64
      this.source = this.audioContext.createMediaStreamSource(stream)
      this.source.connect(this.analyser)
      
      const bufferLength = this.analyser.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength)
    } catch (err) {
      console.error('Failed to initialize AudioAnalyzer:', err)
    }
  }

  getVolumeLevels(): number[] {
    if (!this.analyser) {
      // Return flat baseline heights if analyser is not ready
      return Array(15).fill(0.1)
    }
    
    this.analyser.getByteFrequencyData(this.dataArray as any)
    
    const barCount = 15
    const step = Math.floor(this.dataArray.length / barCount) || 1
    const levels: number[] = []

    for (let i = 0; i < barCount; i++) {
      let sum = 0
      const startIdx = i * step
      for (let j = 0; j < step; j++) {
        sum += this.dataArray[startIdx + j] || 0
      }
      const average = sum / step
      // Normalize to range [0.15, 1.0] to keep visual waveform looking good
      const normalized = Math.max(0.15, average / 255)
      levels.push(normalized)
    }

    return levels
  }

  close() {
    try {
      if (this.source) {
        this.source.disconnect()
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close()
      }
    } catch (err) {
      console.error('Error closing AudioAnalyzer:', err)
    }
  }
}
