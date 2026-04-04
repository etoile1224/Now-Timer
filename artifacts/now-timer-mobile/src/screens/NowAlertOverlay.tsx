import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useTimer } from '@/context/TimerContext';

interface LevelConfig {
  bgColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  label: string;
  nowText: string;
  showSnooze: boolean;
}

function getLv(level: number): LevelConfig {
  if (level <= 1) {
    return {
      bgColor: '#eab308',
      badgeBg: 'rgba(253,224,71,0.8)',
      badgeBorder: '#fef08a',
      badgeText: '#713f12',
      label: '\uCCAB \uBC88\uC9F8 \uC54C\uB9BC',
      nowText: 'NOW!',
      showSnooze: true,
    };
  }
  if (level === 2) {
    return {
      bgColor: '#ea580c',
      badgeBg: 'rgba(251,146,60,0.8)',
      badgeBorder: '#fdba74',
      badgeText: '#ffffff',
      label: '\uBB34\uC2DC\uD558\uB294 \uC911...',
      nowText: 'NOW!!',
      showSnooze: true,
    };
  }
  return {
    bgColor: '#dc2626',
    badgeBg: 'rgba(239,68,68,0.8)',
    badgeBorder: '#fca5a5',
    badgeText: '#ffffff',
    label: '\uC9C0\uAE08 \uB2F9\uC7A5\uC694!!',
    nowText: 'NOW!!!!!!!',
    showSnooze: false,
  };
}

function EscalationBar({
  remainingSeconds,
  totalSeconds,
  level,
}: {
  remainingSeconds: number;
  totalSeconds: number;
  level: number;
}) {
  const barColor =
    level <= 1 ? '#fde047' : level === 2 ? '#fdba74' : '#fca5a5';

  return (
    <View style={escalationStyles.container}>
      <View style={escalationStyles.headerRow}>
        <Text style={escalationStyles.headerLabel}>{'\uBB34\uC2DC \uB85C\uADF8'}</Text>
        <Text style={escalationStyles.headerCount}>{level}{'\uD68C'}</Text>
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
            {remainingSeconds}{'\uCD08 \uD6C4 Lv.'}{level + 1}
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
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  headerCount: {
    fontSize: 11,
    fontWeight: '700',
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
    fontWeight: '700',
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
    color: 'rgba(255,255,255,0.4)',
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

  const isWork = type === 'work';

  const subText = isWork
    ? isLongBreak
      ? '\uAE34 \uD734\uC2DD \uC2DC\uAC04\uC774\uC5D0\uC694!'
      : '\uC274 \uC2DC\uAC04\uC774\uC5D0\uC694'
    : '\uB2E4\uC2DC \uC9D1\uC911\uD560 \uC2DC\uAC04\uC774\uC5D0\uC694!';

  const dismissLabel = isWork ? '\uD655\uC778 \u2014 \uC274\uB7EC \uAC08\uAC8C\uC694' : '\uD655\uC778 \u2014 \uC9D1\uC911 \uC2DC\uC791';
  const snoozeLabel = devMode ? '5\uCD08 \uB354...' : '5\uBD84 \uB354...';

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: lv.bgColor }]}>
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
              {lv.label}
            </Text>
          </View>

          {/* NOW! text */}
          <Text style={[styles.nowText, level >= 3 && styles.nowTextLv3]}>
            {lv.nowText}
          </Text>

          {/* Sub text */}
          <Text style={styles.subText}>{subText}</Text>

          {/* Escalation bar */}
          <EscalationBar
            remainingSeconds={remainingSeconds}
            totalSeconds={totalSeconds}
            level={level}
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
                {'\u2713 '}{dismissLabel}
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
          {level < 3 && (
            <Text style={styles.footerHint}>
              {'\uBB34\uC2DC\uD560\uC218\uB85D Lv.\uC774 \uC62C\uB77C\uAC00\uC694'}
            </Text>
          )}
          {level >= 3 && (
            <Text style={styles.footerHintStrong}>
              {'\uC2A4\uB204\uC988 \uBD88\uAC00 \u2014 \uC9C0\uAE08 \uBC14\uB85C \uD655\uC778\uD558\uC138\uC694!'}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 32,
    width: '100%',
    maxWidth: 360,
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
    fontWeight: '900',
    letterSpacing: 2,
  },
  badgeLabelText: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
  },
  nowText: {
    fontSize: 80,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -2,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  nowTextLv3: {
    fontSize: 60,
  },
  subText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
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
    fontWeight: '700',
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
    fontWeight: '600',
    color: '#ffffff',
  },
  footerHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  footerHintStrong: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
});
