import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff, FlaskConical } from 'lucide-react-native';
import Svg, { Path, ClipPath, Rect, Defs } from 'react-native-svg';
import { useTimer } from '@/context/TimerContext';
import { useI18n } from '@/lib/i18n';
import { colors } from '@/lib/colors';
import { TOMATO_IMAGES, TOMATO_GRAY_IMAGES } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function WavyProgress({ progress, devMode }: { progress: number; devMode: boolean }) {
  const width = 280;
  const height = 40;
  const filledWidth = width * progress;
  const accentColor = devMode ? '#f59e0b' : '#facc15';
  const emptyColor = '#b8b0a0';

  const wavePath = `M0 20 Q${width * 0.12} 5 ${width * 0.25} 20 Q${width * 0.38} 35 ${width * 0.5} 20 Q${width * 0.62} 5 ${width * 0.75} 20 Q${width * 0.88} 35 ${width} 20`;

  return (
    <Svg viewBox={`0 0 ${width} ${height}`} width="100%" height={48}>
      <Defs>
        <ClipPath id="wave-clip-filled">
          <Rect x="0" y="0" width={filledWidth} height={height} />
        </ClipPath>
        <ClipPath id="wave-clip-empty">
          <Rect x={filledWidth} y="0" width={width - filledWidth} height={height} />
        </ClipPath>
      </Defs>
      <Path
        d={wavePath}
        fill="none"
        stroke={accentColor}
        strokeWidth={10}
        strokeLinecap="round"
        clipPath="url(#wave-clip-filled)"
      />
      <Path
        d={wavePath}
        fill="none"
        stroke={emptyColor}
        strokeWidth={10}
        strokeLinecap="round"
        clipPath="url(#wave-clip-empty)"
      />
    </Svg>
  );
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

  const { t } = useI18n();
  const isIdle = phase === 'idle';
  const isFocusing = phase === 'focusing';
  const isBreaking = phase === 'breaking';

  const showTimer = !settings.hideTimer;

  const phaseLabel = isBreaking
    ? isLongBreak
      ? t.focus_longBreak
      : t.focus_break
    : isFocusing
    ? t.focus_focusing
    : t.focus_ready;

  const phaseColor = isBreaking
    ? colors.stem
    : isFocusing
    ? colors.tomato
    : colors.mutedForeground;

  const barMaxWidth = SCREEN_WIDTH - 64;

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
        {devMode && (
          <View style={styles.devBadge}>
            <FlaskConical size={11} color={colors.amber700} />
            <Text style={styles.devBadgeText}>DEV</Text>
          </View>
        )}
      </View>

      {/* Main content — vertical, centered */}
      <View style={styles.mainArea}>
        {/* Phase label */}
        <Text style={[styles.phaseLabel, { color: phaseColor }]}>
          {phaseLabel}
        </Text>

        {/* Session info */}
        <Text style={styles.sessionText}>
          {t.focus_session(sessionCount)}
        </Text>

        {/* Tomato session dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: settings.longBreakInterval }).map((_, i) => {
            const cyclePos = sessionCount % settings.longBreakInterval;
            const filled = cyclePos === 0 && sessionCount > 0
              ? true
              : i < cyclePos;
            return (
              <View key={i} style={styles.dotWrapper}>
                <Image
                  source={filled
                    ? TOMATO_IMAGES[i % TOMATO_IMAGES.length]
                    : TOMATO_GRAY_IMAGES[i % TOMATO_GRAY_IMAGES.length]
                  }
                  style={styles.tomatoDot}
                  resizeMode="contain"
                />
              </View>
            );
          })}
        </View>

        {/* Wavy time bar — always takes space, invisible when idle */}
        <View style={[styles.wavyBarRow, { width: barMaxWidth, opacity: (isFocusing || isBreaking) ? 1 : 0 }]}>
          <WavyProgress progress={progress} devMode={devMode} />
        </View>

        {/* Hint — fixed height, content changes */}
        <View style={styles.hintSlot}>
          {showTimer && (isFocusing || isBreaking) ? (
            <Text style={styles.timerText}>
              {formatTime(remainingSeconds)}
            </Text>
          ) : devMode && (isFocusing || isBreaking) && !showTimer ? (
            <Text style={[styles.timerText, { color: colors.amber500 }]}>
              {formatTime(remainingSeconds)}
            </Text>
          ) : settings.hideTimer && !devMode && (isFocusing || isIdle) ? (
            <Text style={styles.hintText}>{t.focus_timerHidden}</Text>
          ) : isBreaking ? (
            <Text style={styles.hintText}>
              {sessionCount > 0 &&
                t.focus_untilLongBreak(settings.longBreakInterval - (sessionCount % settings.longBreakInterval))}
            </Text>
          ) : isIdle ? (
            <Text style={styles.idleHint}>
              {t.focus_startHint(devMode ? '5s' : `${settings.workDuration}${t.settings_unit_min}`)}
            </Text>
          ) : null}
          {devMode && (isFocusing || isBreaking) && (
            <Text style={[styles.hintText, { color: colors.amber600 }]}>
              {t.focus_devCycle}
            </Text>
          )}
        </View>

        {/* Buttons — btn_play / btn_stop only */}
        <View style={styles.buttonSection}>
          {isIdle ? (
            <TouchableOpacity
              onPress={start}
              style={styles.btnWrap}
              activeOpacity={0.8}
            >
              <Image
                source={require('@/../assets/images/btn_play.png')}
                style={styles.btnIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={stop}
              style={styles.btnWrap}
              activeOpacity={0.8}
            >
              <Image
                source={require('@/../assets/images/btn_stop.png')}
                style={styles.btnIcon}
                resizeMode="contain"
              />
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  eyeButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.muted,
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
  },
  devBadgeText: {
    fontSize: 11,
    fontFamily: 'KotraBold',
    color: colors.amber700,
  },
  mainArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  phaseLabel: {
    fontSize: 28,
    fontFamily: 'KotraBold',
  },
  timerText: {
    fontSize: 52,
    fontFamily: 'Komputa-Light',
    fontVariant: ['tabular-nums'],
    color: colors.mutedForeground,
  },
  sessionText: {
    fontSize: 15,
    fontFamily: 'KotraGothic',
    color: colors.foreground,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  dotWrapper: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tomatoDot: {
    width: 36,
    height: 36,
  },
  wavyBarRow: {
    alignItems: 'center',
    height: 48,
  },
  hintSlot: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  idleHint: {
    fontSize: 13,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  btnWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: {
    width: 110,
    height: 110,
  },
});
