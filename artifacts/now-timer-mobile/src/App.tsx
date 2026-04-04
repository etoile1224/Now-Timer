import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Timer, Users, BarChart2, Settings } from 'lucide-react-native';
import { initStorage } from '@/lib/storage';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TimerProvider, useTimer } from '@/context/TimerContext';
import { SocialProvider } from '@/context/SocialContext';
import { LoginScreen } from '@/screens/LoginScreen';
import { FocusScreen } from '@/screens/FocusScreen';
import { SocialScreen, PokeToast, PeerAlertToast } from '@/screens/SocialScreen';
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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
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
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Focus"
        component={FocusScreen}
        options={{
          tabBarLabel: '\uBAB0\uC785',
          tabBarIcon: ({ color, size }) => <Timer size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{
          tabBarLabel: '\uC18C\uC15C',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: '\uD1B5\uACC4',
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '\uC124\uC815',
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
        <Text style={styles.splashText}>NOW!</Text>
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

  useEffect(() => {
    initStorage().then(() => setStorageReady(true));
  }, []);

  if (!storageReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashText}>NOW!</Text>
        <ActivityIndicator
          color={colors.primary}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.foreground,
    letterSpacing: -2,
  },
});
