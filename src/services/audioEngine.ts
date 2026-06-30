export interface AudioPlayback {
  stop: () => void;
}

/** Play frequency sequence using Web Audio API. */
export async function playFrequencies(frequencies: number[]): Promise<void> {
  startFrequencySequence(frequencies, Math.max(frequencies.length * 0.05, 0.05));
}

/** Start a scheduled sequence that fits exactly into the provided duration. */
export function startFrequencySequence(frequencies: number[], durationSeconds: number): AudioPlayback {
  const audioContext = new AudioContext();
  const stepSeconds = durationSeconds / Math.max(frequencies.length, 1);
  const oscillators = frequencies.map((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const startTime = audioContext.currentTime + index * stepSeconds;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0.0001, startTime + stepSeconds);
    oscillator.connect(gainNode).connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + stepSeconds);
    return oscillator;
  });
  return { stop: () => stopPlayback(audioContext, oscillators) };
}

function stopPlayback(audioContext: AudioContext, oscillators: OscillatorNode[]): void {
  oscillators.forEach((oscillator) => {
    try {
      oscillator.stop();
    } catch {
      // Oscillator may already have reached its scheduled stop time.
    }
  });
  void audioContext.close();
}
