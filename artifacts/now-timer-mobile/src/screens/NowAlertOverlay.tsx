import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { useTimer } from '@/context/TimerContext';
import { useI18n } from '@/lib/i18n';
import { TOMATO_IMAGES } from '@/lib/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LevelConfig {
  bgColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  label: string;
  showSnooze: boolean;
}

function getLv(level: number): LevelConfig {
  if (level <= 1) {
    return {
      bgColor: '#eab308',
      badgeBg: 'rgba(253,224,71,0.8)',
      badgeBorder: '#fef08a',
      badgeText: '#713f12',
      label: 'lv1',
      showSnooze: true,
    };
  }
  if (level === 2) {
    return {
      bgColor: '#ea580c',
      badgeBg: 'rgba(251,146,60,0.8)',
      badgeBorder: '#fdba74',
      badgeText: '#ffffff',
      label: 'lv2',
      showSnooze: true,
    };
  }
  return {
    bgColor: '#dc2626',
    badgeBg: 'rgba(239,68,68,0.8)',
    badgeBorder: '#fca5a5',
    badgeText: '#ffffff',
    label: 'lv3',
    showSnooze: false,
  };
}

// Escalation bar — shows how many times user has ignored
function EscalationBar({
  remainingSeconds,
  totalSeconds,
  level,
  headerLabel,
  headerUnit,
  countdownFn,
}: {
  remainingSeconds: number;
  totalSeconds: number;
  level: number;
  headerLabel: string;
  headerUnit: string;
  countdownFn: (s: number, lv: number) => string;
}) {
  const barColor =
    level <= 1 ? '#fde047' : level === 2 ? '#fdba74' : '#fca5a5';

  return (
    <View style={escalationStyles.container}>
      <View style={escalationStyles.headerRow}>
        <Text style={escalationStyles.headerLabel}>{headerLabel}</Text>
        <Text style={escalationStyles.headerCount}>{level}{headerUnit}</Text>
      </View>
      <View style={escalationStyles.dotsRow}>
        {Array.from({ length: Math.min(level, 12) }).map((_, i) => (
          <View
            key={i}
            style={[
              escalationStyles.dot,
              {
                backgroundColor: i === level - 1 ? barColor : 'rgba(255,255,255,0.4)',
                flex: 1,
              },
            ]}
          />
        ))}
        {level > 12 && (
          <Text style={escalationStyles.overflow}>+{level - 12}</Text>
        )}
      </View>
      {level < 3 && totalSeconds > 0 && (
        <>
          <View style={escalationStyles.progressTrack}>
            <View
              style={[
                escalationStyles.progressFill,
                { width: `${(remainingSeconds / totalSeconds) * 100}%` },
              ]}
            />
          </View>
          <Text style={escalationStyles.countdownText}>
            {countdownFn(remainingSeconds, level + 1)}
          </Text>
        </>
      )}
    </View>
  );
}

const escalationStyles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 11,
    fontFamily: 'KotraGothic',
    color: 'rgba(255,255,255,0.5)',
  },
  headerCount: {
    fontSize: 11,
    fontFamily: 'KotraBold',
    color: 'rgba(255,255,255,0.6)',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  overflow: {
    fontSize: 11,
    fontFamily: 'KotraBold',
    color: 'rgba(255,255,255,0.6)',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 2,
  },
  countdownText: {
    textAlign: 'right',
    fontSize: 11,
    fontFamily: 'KotraGothic',
    fontVariant: ['tabular-nums'],
    minHeight: 16,
    color: 'rgba(255,255,255,0.4)',
  },
});

// Cooking tomatoes — number of tomatoes = level (frying pan with tomatoes)
function CookingTomatoes({ level }: { level: number }) {
  const tomatoCount = Math.min(level, 5);
  // Layout positions for tomatoes on the frying pan
  // Arranged to look like they're being cooked
  // Pan circle: center ~(52%, 37%), radius ~30%
  // Usable area: left 22%-82%, top 7%-67%
  // Positions are top-left corner of each tomato
  const positions: { top: number; left: number; size: number; rotate: string }[] = [
    // 1st — center-left
    { top: 0.28, left: 0.36, size: 0.28, rotate: '-5deg' },
    // 2nd — center-right
    { top: 0.18, left: 0.58, size: 0.26, rotate: '12deg' },
    // 3rd — top center
    { top: 0.08, left: 0.44, size: 0.26, rotate: '-8deg' },
    // 4th — bottom center
    { top: 0.42, left: 0.46, size: 0.24, rotate: '8deg' },
    // 5th — bottom right
    { top: 0.36, left: 0.64, size: 0.24, rotate: '-10deg' },
  ];

  const panSize = SCREEN_WIDTH * 0.85;
  const offsetX = -0.02 * panSize;
  const offsetY = 0.13 * panSize;

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let duration = 800; // Lv.1
    if (level === 2) duration = 400;
    else if (level >= 3) duration = 150;

    const shake = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: duration / 4, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: duration / 2, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: duration / 4, useNativeDriver: true }),
      ])
    );
    shake.start();
    return () => shake.stop();
  }, [level, shakeAnim]);

  let moveRange = 2;
  let rotateRange = '2deg';
  if (level === 2) {
    moveRange = 5;
    rotateRange = '4deg';
  } else if (level >= 3) {
    moveRange = 12;
    rotateRange = '8deg';
  }

  const translateX = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-moveRange, moveRange],
  });

  const rotateZ = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [`-${rotateRange}`, rotateRange],
  });

  return (
    <View style={{ transform: [{ translateX: offsetX }, { translateY: offsetY }] }}>
      <Animated.View
        style={[
          cookingStyles.container,
          {
            width: panSize,
            height: panSize,
            transform: [
              { translateX },
              { rotateZ },
            ],
          },
        ]}
      >
        {/* Frying pan background */}
        <Image
          source={require('@/../assets/images/frypan.png')}
          style={cookingStyles.frypan}
          resizeMode="contain"
        />
        {/* Tomatoes on the pan — count increases with level */}
        {positions.slice(0, tomatoCount).map((pos, i) => {
          const tomatoSize = panSize * pos.size;
          return (
            <Image
              key={i}
              source={TOMATO_IMAGES[i % TOMATO_IMAGES.length]}
              style={[
                cookingStyles.tomato,
                {
                  width: tomatoSize,
                  height: tomatoSize,
                  top: panSize * pos.top,
                  left: panSize * pos.left,
                  transform: [{ rotate: pos.rotate }],
                },
              ]}
              resizeMode="contain"
            />
          );
        })}
      </Animated.View>
    </View>
  );
}

const cookingStyles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  frypan: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  tomato: {
    position: 'absolute',
  },
});

interface NowAlertOverlayProps {
  type: 'work' | 'return';
}

export function NowAlertOverlay({ type }: NowAlertOverlayProps) {
  const { dismiss, snooze, isLongBreak, ignoreLevel, devMode, remainingSeconds, totalSeconds } =
    useTimer();

  const level = Math.max(1, ignoreLevel);
  const lv = getLv(level);

  const { t } = useI18n();
  const isWork = type === 'work';

  const labelMap = { lv1: t.now_lv1Label, lv2: t.now_lv2Label, lv3: t.now_lv3Label } as Record<string, string>;

  const subText = isWork
    ? isLongBreak
      ? t.now_longBreakTime
      : t.now_breakTime
    : t.now_focusTime;

  const dismissLabel = isWork ? t.now_dismissWork : t.now_dismissReturn;
  const snoozeLabel = devMode ? t.now_snooze5s : t.now_snooze5m;

  // Letter size scales with level — bang count increases
  const letterH = level <= 1 ? 64 : level === 2 ? 80 : 96;
  const bangCount = level <= 1 ? 1 : level === 2 ? 2 : Math.min(level, 7);

  // Pulse animation for Lv.3+
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (level >= 3) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.95, duration: 300, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [level, pulseAnim]);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: lv.bgColor }]}>
        {/* Spaghetti noodle background — diagonal across screen */}
        <Image
          source={require('@/../assets/images/spaghetti2.png')}
          style={styles.spaghettiBg}
          resizeMode="contain"
        />

        {/* Cooking tomatoes area — tomatoes increase with level */}
        <View style={styles.cookingArea}>
          <CookingTomatoes level={level} />
        </View>

        {/* NOW!! composed from individual letter images — bangs increase with level */}
        <Animated.View style={[styles.nowTextContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.nowImageRow}>
            <Image source={require('@/../assets/images/Now_N.png')} style={{ height: letterH, width: letterH * 0.85 }} resizeMode="contain" />
            <Image source={require('@/../assets/images/Now_O.png')} style={{ height: letterH, width: letterH * 0.85 }} resizeMode="contain" />
            <Image source={require('@/../assets/images/Now_W.png')} style={{ height: letterH, width: letterH * 1.05 }} resizeMode="contain" />
            {Array.from({ length: bangCount }).map((_, i) => (
              <Image
                key={i}
                source={require('@/../assets/images/Now_bang.png')}
                style={{ height: letterH, width: letterH * 0.38, marginLeft: i === 0 ? 2 : -4 }}
                resizeMode="contain"
              />
            ))}
          </View>
        </Animated.View>

        {/* Content overlaid on bottom */}
        <View style={styles.content}>
          {/* Level badge */}
          <View
            style={[
              styles.badge,
              { backgroundColor: lv.badgeBg, borderColor: lv.badgeBorder },
            ]}
          >
            <Text style={[styles.badgeLvText, { color: lv.badgeText }]}>
              Lv.{level}
            </Text>
            <Text style={[styles.badgeLabelText, { color: lv.badgeText }]}>
              {labelMap[lv.label] ?? lv.label}
            </Text>
          </View>

          {/* Sub text */}
          <Text style={styles.subText}>{subText}</Text>

          {/* Tomato count hint */}
          <Text style={styles.tomatoCountHint}>
            {t.now_tomatoCooking(Math.min(level, 5))}
            {level > 5 ? ` ${t.now_tomatoWaiting(level - 5)}` : ''}
          </Text>

          {/* Escalation bar */}
          <EscalationBar
            remainingSeconds={remainingSeconds}
            totalSeconds={totalSeconds}
            level={level}
            headerLabel={t.now_ignoreLog}
            headerUnit={t.now_times}
            countdownFn={t.now_secsToLv}
          />

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              onPress={dismiss}
              style={styles.dismissButton}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dismissButtonText,
                  { color: level >= 3 ? '#b91c1c' : '#111827' },
                ]}
              >
                {'✓ '}{dismissLabel}
              </Text>
            </TouchableOpacity>

            {lv.showSnooze && (
              <TouchableOpacity
                onPress={snooze}
                style={styles.snoozeButton}
                activeOpacity={0.8}
              >
                <Text style={styles.snoozeButtonText}>{snoozeLabel}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer hint */}
          <View style={{ minHeight: 18, justifyContent: 'center', alignItems: 'center' }}>
            {level < 3 ? (
              <Text style={styles.footerHint}>
                {t.now_footerHint}
              </Text>
            ) : (
              <Text style={styles.footerHintStrong}>
                {t.now_footerStrong}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    overflow: 'hidden',
  },
  spaghettiBg: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_HEIGHT * 0.7,
    top: -SCREEN_HEIGHT * 0.05,
    left: -SCREEN_WIDTH * 0.3,
    opacity: 0.3,
  },
  cookingArea: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowTextContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.30,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  nowImageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    width: '100%',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeLvText: {
    fontSize: 13,
    fontFamily: 'KotraBold',
    letterSpacing: 2,
  },
  badgeLabelText: {
    fontSize: 13,
    fontFamily: 'KotraGothic',
    opacity: 0.8,
  },
  subText: {
    fontSize: 20,
    fontFamily: 'KotraGothic',
    color: 'rgba(255,255,255,0.9)',
  },
  tomatoCountHint: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: 'rgba(255,255,255,0.7)',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 4,
  },
  dismissButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  dismissButtonText: {
    fontSize: 17,
    fontFamily: 'KotraBold',
  },
  snoozeButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  snoozeButtonText: {
    fontSize: 16,
    fontFamily: 'KotraGothic',
    color: '#ffffff',
  },
  footerHint: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: 'rgba(255,255,255,0.45)',
  },
  footerHintStrong: {
    fontSize: 12,
    fontFamily: 'KotraBold',
    color: 'rgba(255,255,255,0.6)',
  },
});
