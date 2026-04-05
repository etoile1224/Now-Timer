import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

let alertSound: Audio.Sound | null = null;
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let isLooping = false;

async function getAlertSound(): Promise<Audio.Sound> {
  if (!alertSound) {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/alert.mp3'),
      { shouldPlay: false }
    );
    alertSound = sound;
  }
  return alertSound;
}

async function playOnce(volume: number): Promise<void> {
  try {
    const sound = await getAlertSound();
    await sound.setIsLoopingAsync(false);
    await sound.setPositionAsync(0);
    await sound.setVolumeAsync(Math.min(1, Math.max(0, volume)));
    await sound.playAsync();
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
}

export async function stopAlert(): Promise<void> {
  isLooping = false;
  if (loopTimer !== null) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
  try {
    const sound = await getAlertSound();
    await sound.setIsLoopingAsync(false);
    await sound.stopAsync();
  } catch {}
}

export async function playAlert(_soundType: string, volume: number, level = 1): Promise<void> {
  await stopAlert();
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
  });

  const vol1 = Math.min(1, volume);
  const vol2 = Math.min(1, volume * 1.3);
  const vol3 = 1.0;

  if (level <= 1) {
    await playOnce(vol1);
  } else if (level === 2) {
    await playOnce(vol2);
    isLooping = true;
    loopTimer = setTimeout(async () => {
      if (isLooping) await playOnce(vol2);
    }, 3000);
  } else {
    isLooping = true;
    try {
      const sound = await getAlertSound();
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(vol3);
      await sound.setIsLoopingAsync(true);
      await sound.playAsync();
    } catch {}
  }
}

export async function previewSound(_soundType: string, volume: number, level = 1): Promise<void> {
  await stopAlert();
  await playAlert(_soundType, volume, level);
  setTimeout(() => stopAlert(), 4000);
}

export async function playPokeSound(): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/poke.mp3'),
      { shouldPlay: true, volume: 0.45 }
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if ('didJustFinish' in status && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch {}
}

export async function playVoicePoke(base64Audio: string): Promise<void> {
  try {
    const tmpPath = `${FileSystem.cacheDirectory}voice_poke.m4a`;
    await FileSystem.writeAsStringAsync(tmpPath, base64Audio, { encoding: 'base64' });
    const { sound } = await Audio.Sound.createAsync(
      { uri: tmpPath },
      { shouldPlay: true, volume: 0.8 }
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if ('didJustFinish' in status && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch {
    await playPokeSound();
  }
}

export type SoundType = 'ember';
