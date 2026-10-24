let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!context) context = new Ctor()
  if (context.state === 'suspended') {
    void context.resume()
  }
  return context
}

export function primeAudio(): void {
  getContext()
}

function tone(frequency: number, duration: number, type: OscillatorType, volume = 0.045, delay = 0) {
  const ctx = getContext()
  if (!ctx) return
  const start = ctx.currentTime + delay
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

export const sfx = {
  click() {
    tone(880, 0.04, 'square', 0.025)
  },
  open() {
    tone(440, 0.05, 'square', 0.03)
    tone(660, 0.06, 'square', 0.03, 0.06)
  },
  tick() {
    tone(1200, 0.025, 'square', 0.018)
  },
  success() {
    tone(523, 0.09, 'square', 0.035)
    tone(659, 0.09, 'square', 0.035, 0.1)
    tone(784, 0.14, 'square', 0.04, 0.2)
    tone(1046, 0.18, 'square', 0.03, 0.34)
  },
  alert() {
    tone(880, 0.16, 'sawtooth', 0.045)
    tone(660, 0.16, 'sawtooth', 0.045, 0.18)
    tone(880, 0.16, 'sawtooth', 0.045, 0.36)
  },
  error() {
    tone(180, 0.18, 'square', 0.05)
    tone(140, 0.24, 'square', 0.05, 0.2)
  },
  boot() {
    tone(262, 0.12, 'square', 0.03)
    tone(392, 0.12, 'square', 0.03, 0.12)
    tone(523, 0.16, 'square', 0.035, 0.24)
    tone(784, 0.22, 'square', 0.03, 0.4)
  },
}
