import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Mic, Square, Play, Trash2 } from 'lucide-react-native';
import { colors } from '@/lib/colors';

interface VoiceRecorderProps {
  audioBase64: string | null;
  onSave: (base64: string) => void;
  onDelete: () => void;
  maxDuration?: number;
}

export function VoiceRecorder({ audioBase64, onSave, onDelete, maxDuration = 5 }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(maxDuration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(!!audioBase64);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localUriRef = useRef<string | null>(null);
  const localBase64Ref = useRef<string | null>(audioBase64);

  useEffect(() => {
    setHasRecording(!!audioBase64);
    localBase64Ref.current = audioBase64;
  }, [audioBase64]);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setCountdown(maxDuration);

      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Recording failed:', err);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (uri) {
        localUriRef.current = uri;
        // Read file as base64
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          localBase64Ref.current = base64;
          setHasRecording(true);
          onSave(base64);
        };
        reader.readAsDataURL(blob);
      }
    } catch (err) {
      console.warn('Stop recording failed:', err);
      setIsRecording(false);
    }
  };

  const playRecording = async () => {
    const uri = localUriRef.current;
    const b64 = localBase64Ref.current;
    if (!uri && !b64) return;

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      let sound: Audio.Sound;
      if (uri) {
        const result = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
        sound = result.sound;
      } else if (b64) {
        // Write base64 to temp file then play (data URI not supported on iOS)
        const tmpPath = `${FileSystem.cacheDirectory}voice_preview.m4a`;
        await FileSystem.writeAsStringAsync(tmpPath, b64, { encoding: 'base64' });
        const result = await Audio.Sound.createAsync({ uri: tmpPath }, { shouldPlay: true });
        sound = result.sound;
      } else {
        return;
      }

      soundRef.current = sound;
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (err) {
      console.warn('Playback failed:', err);
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    localUriRef.current = null;
    localBase64Ref.current = null;
    setHasRecording(false);
    onDelete();
  };

  return (
    <View style={voiceStyles.container}>
      <View style={voiceStyles.row}>
        {!isRecording ? (
          <TouchableOpacity onPress={startRecording} style={voiceStyles.recordButton} activeOpacity={0.7}>
            <Mic size={16} color="#fff" />
            <Text style={voiceStyles.recordText}>{'\uB179\uC74C \uC2DC\uC791'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={stopRecording} style={voiceStyles.recordingButton} activeOpacity={0.7}>
            <Square size={14} color="#fff" />
            <Text style={voiceStyles.recordText}>{'\uB179\uC74C \uC911... '}{countdown}{'\uCD08'}</Text>
          </TouchableOpacity>
        )}

        {hasRecording && !isRecording && (
          <>
            <TouchableOpacity
              onPress={playRecording}
              disabled={isPlaying}
              style={[voiceStyles.playButton, isPlaying && { opacity: 0.5 }]}
              activeOpacity={0.7}
            >
              <Play size={14} color={colors.foreground} />
              <Text style={voiceStyles.playText}>
                {isPlaying ? '\uC7AC\uC0DD \uC911...' : '\uBBF8\uB9AC\uB4E3\uAE30'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={deleteRecording} style={voiceStyles.deleteButton}>
              <Trash2 size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={voiceStyles.hint}>
        {hasRecording
          ? '\uB179\uC74C\uB41C \uBCF4\uC774\uC2A4\uAC00 \uD3EC\uD06C \uC54C\uB9BC\uC5D0 \uC0AC\uC6A9\uB429\uB2C8\uB2E4'
          : `\uCD5C\uB300 ${maxDuration}\uCD08 \uB179\uC74C \uAC00\uB2A5 \u00B7 \uD300\uC6D0\uC5D0\uAC8C NOW! \uC54C\uB9BC\uC73C\uB85C \uC804\uC1A1\uB429\uB2C8\uB2E4`}
      </Text>
    </View>
  );
}

const voiceStyles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ef4444',
    borderRadius: 12,
  },
  recordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#dc2626',
    borderRadius: 12,
  },
  recordText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'KotraBold',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.muted,
    borderRadius: 12,
  },
  playText: {
    fontSize: 13,
    fontFamily: 'KotraGothic',
    color: colors.foreground,
  },
  deleteButton: {
    padding: 12,
  },
  hint: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
