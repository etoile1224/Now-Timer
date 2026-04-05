import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '@/lib/colors';

interface PixelAvatarProps {
  data: (string | null)[][] | null;
  size?: number;
  fallbackLetter?: string;
}

export function parseAvatarData(raw: string): (string | null)[][] | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function PixelAvatar({ data, size = 36, fallbackLetter }: PixelAvatarProps) {
  if (!data || data.every(row => row.every(c => c === null))) {
    return (
      <View style={[avatarStyles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[avatarStyles.fallbackText, { fontSize: size * 0.4 }]}>
          {fallbackLetter?.slice(0, 1).toUpperCase() ?? '?'}
        </Text>
      </View>
    );
  }

  const gridSize = data.length;

  return (
    <Svg viewBox={`0 0 ${gridSize} ${gridSize}`} width={size} height={size} style={{ borderRadius: size * 0.2 }}>
      {data.map((row, r) =>
        row.map((color, c) =>
          color ? (
            <Rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={color} />
          ) : null,
        ),
      )}
    </Svg>
  );
}

const avatarStyles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  fallbackText: {
    fontFamily: 'KotraBold',
    color: colors.tomato,
  },
});
