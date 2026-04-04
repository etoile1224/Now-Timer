let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  decayStart = 0.05,
): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Sound play failed:', e);
  }
}

function playBell(volume: number): void {
  playTone(880, 1.2, volume * 0.6, 'sine');
  setTimeout(() => playTone(660, 0.8, volume * 0.3, 'sine'), 120);
}

function playChime(volume: number): void {
  playTone(1174, 0.8, volume * 0.5, 'sine');
  setTimeout(() => playTone(988, 0.6, volume * 0.4, 'sine'), 200);
  setTimeout(() => playTone(1320, 0.6, volume * 0.3, 'sine'), 400);
}

function playSoft(volume: number): void {
  playTone(528, 1.5, volume * 0.4, 'sine');
  setTimeout(() => playTone(660, 1.0, volume * 0.2, 'sine'), 300);
}

export type SoundType = 'bell' | 'chime' | 'soft';

export function playAlert(soundType: SoundType, volume: number): void {
  switch (soundType) {
    case 'bell': return playBell(volume);
    case 'chime': return playChime(volume);
    case 'soft': return playSoft(volume);
  }
}

export function previewSound(soundType: SoundType, volume: number): void {
  playAlert(soundType, volume);
}

export function unlockAudio(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch {
  }
}
