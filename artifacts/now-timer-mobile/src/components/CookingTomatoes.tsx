import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Dimensions, Animated } from 'react-native';
import { TOMATO_IMAGES } from '@/lib/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CookingTomatoesProps {
  level: number;
}

export function CookingTomatoes({ level }: CookingTomatoesProps) {
  const tomatoCount = Math.min(level, 5);
  // Layout positions for tomatoes on the frying pan
  // Arranged to look like they're being cooked
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
