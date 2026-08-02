import { useCallback, useRef } from 'react'
import type { SoundKind } from '../app/types'

export function useGameAudio(muted: boolean) {
  const audioRef = useRef<AudioContext | null>(null)

  const playSound = useCallback((kind: SoundKind) => {
    if (muted) return

    try {
      const AudioCtor = window.AudioContext ?? window.webkitAudioContext
      const audio = audioRef.current ?? new AudioCtor()
      audioRef.current = audio
      void audio.resume()
      const now = audio.currentTime
      const notes = kind === 'bigWin'
        ? [392, 523, 659, 784, 1047]
        : kind === 'win'
          ? [523, 659, 784]
          : kind === 'lose'
            ? [180, 145]
            : kind === 'deal'
              ? [220, 285, 350]
              : kind === 'draw'
                ? [310, 390]
                : kind === 'coin'
                  ? [880, 1175]
                  : kind === 'hold'
                    ? [480, 610]
                    : [410]

      notes.forEach((frequency, index) => {
        const oscillator = audio.createOscillator()
        const gain = audio.createGain()
        oscillator.type = kind === 'win' || kind === 'bigWin' || kind === 'coin' ? 'sine' : 'triangle'
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0.0001, now + index * 0.08)
        gain.gain.exponentialRampToValueAtTime(kind === 'tap' ? 0.025 : kind === 'bigWin' ? 0.075 : 0.05, now + index * 0.08 + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.16)
        oscillator.connect(gain).connect(audio.destination)
        oscillator.start(now + index * 0.08)
        oscillator.stop(now + index * 0.08 + 0.18)
      })

      if (kind === 'deal' || kind === 'draw') {
        const duration = kind === 'deal' ? 0.2 : 0.13
        const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate)
        const data = buffer.getChannelData(0)
        for (let index = 0; index < data.length; index += 1) {
          const envelope = 1 - index / data.length
          data[index] = (Math.random() * 2 - 1) * envelope
        }
        const source = audio.createBufferSource()
        const filter = audio.createBiquadFilter()
        const noiseGain = audio.createGain()
        source.buffer = buffer
        filter.type = 'bandpass'
        filter.frequency.value = kind === 'deal' ? 1350 : 1900
        noiseGain.gain.value = 0.035
        source.connect(filter).connect(noiseGain).connect(audio.destination)
        source.start(now)
      }
    } catch {
      // Sound is a progressive enhancement; the game remains playable without it.
    }
  }, [muted])

  const buzz = useCallback(() => {
    if (!muted && navigator.vibrate) navigator.vibrate(12)
  }, [muted])

  return { playSound, buzz }
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}
