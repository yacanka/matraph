/** Play frequency sequence using Web Audio API. */
export async function playFrequencies(frequencies: number[]): Promise<void> {
  const audioContext = new AudioContext();
  const durationSeconds = 0.05;
  frequencies.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const startTime = audioContext.currentTime + index * durationSeconds;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0.0001, startTime + durationSeconds);
    oscillator.connect(gainNode).connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + durationSeconds);
  });
}
