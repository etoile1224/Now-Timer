import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2 } from 'lucide-react';

interface VoiceRecorderProps {
  audioBase64: string | null;
  onSave: (base64: string) => void;
  onDelete: () => void;
  maxDuration?: number; // seconds
}

export function VoiceRecorder({ audioBase64, onSave, onDelete, maxDuration = 5 }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(maxDuration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(!!audioBase64);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localBase64Ref = useRef<string | null>(audioBase64);

  useEffect(() => {
    setHasRecording(!!audioBase64);
    localBase64Ref.current = audioBase64;
  }, [audioBase64]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          localBase64Ref.current = base64;
          setHasRecording(true);
          onSave(base64);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
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
      console.warn('Microphone access denied:', err);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const playRecording = () => {
    const b64 = localBase64Ref.current;
    if (!b64) return;
    const audio = new Audio(`data:audio/webm;base64,${b64}`);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  };

  const deleteRecording = () => {
    localBase64Ref.current = null;
    setHasRecording(false);
    onDelete();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
          >
            <Mic size={16} />
            녹음 시작
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm animate-pulse active:scale-95 transition-transform"
          >
            <Square size={14} />
            녹음 중... {countdown}초
          </button>
        )}

        {hasRecording && !isRecording && (
          <>
            <button
              onClick={playRecording}
              disabled={isPlaying}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-muted text-foreground rounded-xl text-sm font-medium active:scale-95 transition-transform disabled:opacity-50"
            >
              <Play size={14} />
              {isPlaying ? '재생 중...' : '미리듣기'}
            </button>
            <button
              onClick={deleteRecording}
              className="p-2.5 text-muted-foreground hover:text-destructive rounded-xl transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {hasRecording
          ? '녹음된 보이스가 포크 알림에 사용됩니다'
          : `최대 ${maxDuration}초 녹음 가능 · 팀원에게 NOW! 알림으로 전송됩니다`}
      </p>
    </div>
  );
}
