let audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}alert.mp3`);
    audio.preload = 'auto';
  }
  return audio;
}

export function playAlert(_soundType: string, volume: number): void {
  try {
    const a = getAudio();
    a.currentTime = 0;
    a.volume = Math.min(1, Math.max(0, volume));
    a.play().catch((e) => console.warn('Audio play failed:', e));
  } catch (e) {
    console.warn('Sound play failed:', e);
  }
}

export function previewSound(_soundType: string, volume: number): void {
  playAlert(_soundType, volume);
}

export function unlockAudio(): void {
  try {
    const a = getAudio();
    // Trigger a silent load to unlock autoplay policy
    a.load();
  } catch {}
}

export type SoundType = 'default';
