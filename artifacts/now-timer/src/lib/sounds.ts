let audio: HTMLAudioElement | null = null;
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let previewTimer: ReturnType<typeof setTimeout> | null = null;
let isLooping = false;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}alert.mp3`);
    audio.preload = 'auto';
  }
  return audio;
}

function playOnce(volume: number): void {
  const a = getAudio();
  a.pause();
  a.currentTime = 0;
  a.volume = Math.min(1, Math.max(0, volume));
  a.play().catch((e) => console.warn('Audio play failed:', e));
}

export function stopAlert(): void {
  isLooping = false;
  if (loopTimer !== null) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
  const a = getAudio();
  a.pause();
  a.onended = null;
}

/**
 * Play the Ember alert with level-based escalation:
 *  Lv.1 — plays once at base volume
 *  Lv.2 — plays at boosted volume, repeats once after 3 s
 *  Lv.3 — loops continuously at max volume until stopAlert() is called
 */
export function playAlert(_soundType: string, volume: number, level = 1): void {
  stopAlert();

  const vol1 = Math.min(1, volume);
  const vol2 = Math.min(1, volume * 1.3);
  const vol3 = 1.0;

  if (level <= 1) {
    playOnce(vol1);
  } else if (level === 2) {
    playOnce(vol2);
    isLooping = true;
    loopTimer = setTimeout(() => {
      if (isLooping) playOnce(vol2);
    }, 3000);
  } else {
    // Lv.3: loop continuously
    isLooping = true;
    const a = getAudio();
    a.pause();
    a.currentTime = 0;
    a.volume = vol3;
    a.play().catch(() => {});
    a.onended = () => {
      if (isLooping) {
        a.currentTime = 0;
        a.play().catch(() => {});
      }
    };
  }
}

export function previewSound(_soundType: string, volume: number, level = 1): void {
  if (previewTimer !== null) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
  stopAlert();
  playAlert(_soundType, volume, level);
  previewTimer = setTimeout(() => {
    stopAlert();
    previewTimer = null;
  }, 4000);
}

export function unlockAudio(): void {
  try {
    getAudio().load();
  } catch {}
}

export type SoundType = 'ember';
