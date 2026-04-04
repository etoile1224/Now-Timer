import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayCircle, StopCircle, Eye, EyeOff, FlaskConical } from 'lucide-react-native';
import { useTimer } from '@/context/TimerContext';
import { colors } from '@/lib/colors';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function FocusScreen() {
  const {
    phase,
    sessionCount,
    progress,
    remainingSeconds,
    settings,
    isLongBreak,
    devMode,
    start,
    stop,
    updateSettings,
  } = useTimer();
  const insets = useSafeAreaInsets();

  const isIdle = phase === 'idle';
  const isFocusing = phase === 'focusing';
  const isBreaking = phase === 'breaking';

  const showTimer = !settings.hideTimer;

  const phaseLabel = isBreaking
    ? isLongBreak
      ? '\uAE34 \uD734\uC2DD \uC911...'
      : '\uD734\uC2DD \uC911...'
    : isFocusing
    ? '\uC9D1\uC911 \uC911...'
    : '\uC900\uBE44\uB428';

  const phaseColor = isBreaking
    ? colors.green600
    : isFocusing
    ? colors.foreground
    : colors.mutedForeground;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => updateSettings({ hideTimer: !settings.hideTimer })}
          style={styles.eyeButton}
        >
          {showTimer ? (
            <Eye size={20} color={colors.mutedForeground} />
          ) : (
            <EyeOff size={20} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>

      {/* Logo */}
      <View style={styles.logoArea}>
        <Text style={styles.logoText}>NOW!</Text>
        {devMode && (
          <View style={styles.devBadge}>
            <FlaskConical size={11} color={colors.amber700} />
            <Text style={styles.devBadgeText}>DEV</Text>
          </View>
        )}
      </View>

      {/* Main focus zone */}
      <View style={styles.mainZone}>
        {/* Phase label */}
        <Text style={[styles.phaseLabel, { color: phaseColor }]}>
          {phaseLabel}
        </Text>

        {/* Timer display */}
        {showTimer && (isFocusing || isBreaking) && (
          <Text style={styles.timerText}>
            {formatTime(remainingSeconds)}
          </Text>
        )}

        {/* Dev mode timer override */}
        {devMode && (isFocusing || isBreaking) && !showTimer && (
          <Text style={[styles.timerText, { color: colors.amber500 }]}>
            {formatTime(remainingSeconds)}
          </Text>
        )}

        {/* Break timer bar */}
        {isBreaking && (
          <View style={styles.breakBarContainer}>
            <Text style={styles.breakBarLabel}>
              {'\uB0A8\uC740 \uD734\uC2DD \uC2DC\uAC04'}
            </Text>
            <View style={styles.breakBarTrack}>
              <View
                style={[
                  styles.breakBarFill,
                  { width: `${progress * 100}%`, backgroundColor: '#60a5fa' },
                ]}
              />
            </View>
          </View>
        )}

        {/* Focus progress bar */}
        {(isFocusing || isIdle) && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: isFocusing
                      ? devMode
                        ? colors.amber500
                        : colors.primary
                      : colors.mutedForeground,
                    opacity: isFocusing ? 1 : 0.3,
                  },
                ]}
              />
            </View>
            {settings.hideTimer && !devMode && (
              <Text style={styles.hintText}>
                {'\uD0C0\uC774\uBA38 \uC228\uAE40 ON \u2014 \uB0A8\uC740 \uC2DC\uAC04 \uD45C\uC2DC \uC5C6\uC74C'}
              </Text>
            )}
            {devMode && (
              <Text style={[styles.hintText, { color: colors.amber600 }]}>
                {'Dev \uBAA8\uB4DC \u00B7 5\uCD08 \uC0AC\uC774\uD074'}
              </Text>
            )}
          </View>
        )}

        {/* Idle hint */}
        {isIdle && (
          <Text style={styles.idleHint}>
            {'\uC2DC\uC791 \uBC84\uD2BC\uC744 \uB20C\uB7EC '}
            {devMode ? '5\uCD08' : `${settings.workDuration}\uBD84`}
            {' \uC9D1\uC911 \uC138\uC158\uC744 \uC2DC\uC791\uD558\uC138\uC694.'}
          </Text>
        )}
      </View>

      {/* Bottom info + action */}
      <View style={styles.bottomArea}>
        {/* Session dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: settings.longBreakInterval }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < sessionCount % settings.longBreakInterval
                      ? devMode
                        ? colors.amber500
                        : colors.primary
                      : colors.muted,
                },
              ]}
            />
          ))}
        </View>

        <Text style={styles.sessionText}>
          {'\uC138\uC158 '}{sessionCount}{'\uD68C \uC644\uB8CC'}
          {sessionCount > 0 &&
            ` \u00B7 ${settings.longBreakInterval - (sessionCount % settings.longBreakInterval)}\uD68C \uD6C4 \uAE34 \uD734\uC2DD`}
        </Text>

        {/* Action button */}
        <View style={styles.actionRow}>
          {isIdle ? (
            <TouchableOpacity
              onPress={start}
              style={[
                styles.startButton,
                devMode && { backgroundColor: colors.amber500 },
              ]}
              activeOpacity={0.8}
            >
              <PlayCircle size={24} color="#fff" />
              <Text style={styles.startButtonText}>{'\uC9D1\uC911 \uC2DC\uC791'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={stop}
              style={styles.stopButton}
              activeOpacity={0.8}
            >
              <StopCircle size={18} color={colors.mutedForeground} />
              <Text style={styles.stopButtonText}>{'\uC911\uC9C0'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  eyeButton: {
    padding: 8,
    borderRadius: 12,
  },
  logoArea: {
    alignItems: 'center',
    paddingTop: 8,
  },
  logoText: {
    fontSize: 72,
    fontWeight: '900',
    color: colors.foreground,
    letterSpacing: -3,
  },
  devBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    marginTop: 4,
  },
  devBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.amber700,
  },
  mainZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  phaseLabel: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  timerText: {
    fontSize: 72,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    color: colors.mutedForeground,
  },
  breakBarContainer: {
    width: '100%',
  },
  breakBarLabel: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  breakBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.blue100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressContainer: {
    width: '100%',
    gap: 8,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    color: colors.mutedForeground,
  },
  idleHint: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 280,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    width: 32,
    borderRadius: 4,
  },
  sessionText: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.mutedForeground,
  },
  actionRow: {
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.muted,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  stopButtonText: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontWeight: '600',
  },
});
