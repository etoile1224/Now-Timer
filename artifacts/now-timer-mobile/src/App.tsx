import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Timer, Users, BarChart2, Settings } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import { initStorage } from '@/lib/storage';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TimerProvider, useTimer } from '@/context/TimerContext';
import { SocialProvider } from '@/context/SocialContext';
import { LoginScreen } from '@/screens/LoginScreen';
import { FocusScreen } from '@/screens/FocusScreen';
import { SocialScreen } from '@/screens/SocialScreen';
import { PokeToast, PeerAlertToast } from '@/components/SocialToasts';
import { StatsScreen } from '@/screens/StatsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { NowAlertOverlay } from '@/screens/NowAlertOverlay';
import { useStatsTracker } from '@/hooks/useStatsTracker';
import { colors } from '@/lib/colors';

const Tab = createBottomTabNavigator();

function StatsTracker() {
  useStatsTracker();
  return null;
}

function NowAlertLayer() {
  const { phase } = useTimer();
  const isNowAlert = phase === 'nowAlert';
  const isReturnAlert = phase === 'returnAlert';

  return (
    <>
      {isNowAlert && <NowAlertOverlay type="work" />}
      {isReturnAlert && <NowAlertOverlay type="return" />}
    </>
  );
}

function MainTabs() {
  const { t } = useI18n();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tomato,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'ios' ? 0 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'KotraGothic',
        },
      }}
    >
      <Tab.Screen
        name="Focus"
        component={FocusScreen}
        options={{
          tabBarLabel: t.tab_focus,
          tabBarIcon: ({ color, size }) => <Timer size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{
          tabBarLabel: t.tab_social,
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: t.tab_stats,
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t.tab_settings,
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('@/../assets/images/splash_logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <TimerProvider>
      <SocialProvider>
        <StatsTracker />
        <NavigationContainer>
          <MainTabs />
        </NavigationContainer>
        <NowAlertLayer />
        <PokeToast />
        <PeerAlertToast />
      </SocialProvider>
    </TimerProvider>
  );
}

export default function App() {
  const [storageReady, setStorageReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  const [fontsLoaded] = useFonts({
    'KotraBold': require('@/../assets/fonts/KOTRA_BOLD.ttf'),
    'KotraGothic': require('@/../assets/fonts/KOTRA_GOTHIC.ttf'),
    'Komputa-Bold': require('@/../assets/fonts/Komputa-Bold.ttf'),
    'Komputa-Light': require('@/../assets/fonts/Komputa-Light.ttf'),
    'Komputa-Regular': require('@/../assets/fonts/Komputa-Regular.ttf'),
  });

  useEffect(() => {
    initStorage().then(() => setStorageReady(true));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!storageReady || !fontsLoaded || !splashDone) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('@/../assets/images/splash_logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 220,
    height: 280,
  },
});
