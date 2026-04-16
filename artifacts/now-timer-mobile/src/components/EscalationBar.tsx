import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface EscalationBarProps {
  remainingSeconds: number;
  totalSeconds: number;
  level: number;
  headerLabel: string;
  headerUnit: string;
  countdownFn: (s: number, lv: number) => string;
}

export function EscalationBar({
  remainingSeconds,
  totalSeconds,
  level,
  headerLabel,
  headerUnit,
  countdownFn,
}: EscalationBarProps) {
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
