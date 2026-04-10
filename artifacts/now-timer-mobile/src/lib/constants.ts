import { ImageSourcePropType } from 'react-native';

/** Colored tomato images — shared across Focus, Stats, NowAlert screens */
export const TOMATO_IMAGES: ImageSourcePropType[] = [
  require('@/../assets/images/tomato1.png'),
  require('@/../assets/images/tomato2.png'),
  require('@/../assets/images/tomato3.png'),
  require('@/../assets/images/tomato4.png'),
  require('@/../assets/images/tomato5.png'),
];

/** Gray (empty) tomato images — used for unfilled session slots */
export const TOMATO_GRAY_IMAGES: ImageSourcePropType[] = [
  require('@/../assets/images/tomato_gray1.png'),
  require('@/../assets/images/tomato_gray2.png'),
  require('@/../assets/images/tomato_gray3.png'),
  require('@/../assets/images/tomato_gray4.png'),
];

/** Shared vibration patterns */
export const VIBRATION_POKE = [120, 60, 120, 60, 280] as const;
export const VIBRATION_TAP = 100;
