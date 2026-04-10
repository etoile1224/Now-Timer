import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Eye,
  EyeOff,
  Volume2,
  Check,
  FlaskConical,
  Play,
  LogOut,
  BellOff,
  Bell,
  Camera,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTimer } from '@/context/TimerContext';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';
import { previewSound } from '@/lib/sounds';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { colors } from '@/lib/colors';
import { PixelEditorModal, createEmptyGrid, ensureGrid32 } from '@/components/PixelEditor';
import { PixelAvatar } from '@/components/PixelAvatar';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { NumberInput, numStyles } from '@/components/NumberInput';

// Escalation options are built inside SettingsScreen to use i18n

const AVATAR_KEY = 'now_timer_avatar';
const VOICE_KEY = 'now_timer_voice';

function AvatarSection() {
  const { memberships } = useSocial();
  const { t } = useI18n();
  const [grid, setGrid] = useState<(string | null)[][]>(createEmptyGrid);
  const [editorVisible, setEditorVisible] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(AVATAR_KEY).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          setGrid(ensureGrid32(parsed));
        } catch {}
      }
    });
  }, []);

  const handleSave = useCallback(async (newGrid: (string | null)[][]) => {
    setGrid(newGrid);
    setEditorVisible(false);
    const data = JSON.stringify(newGrid);
    await AsyncStorage.setItem(AVATAR_KEY, data);
    for (const m of memberships) {
      api.updateAvatar(m.memberId, data, m.token).catch((e) => console.warn('avatar sync failed', e));
    }
  }, [memberships]);

  const handlePhotoImport = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 1,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled || !result.assets[0]?.base64) return;

      setConverting(true);
      const { grid: converted } = await api.convertPhoto(result.assets[0].base64);
      setConverting(false);
      setGrid(converted);
      setEditorVisible(true);
    } catch {
      setConverting(false);
      Alert.alert(t.settings_convertFail, t.settings_convertFailMsg);
    }
  }, []);

  const isEmpty = grid.every(row => row.every(c => c === null));

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t.settings_avatar}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <PixelAvatar data={isEmpty ? null : grid} size={48} fallbackLetter="?" />
        <TouchableOpacity
          onPress={() => setEditorVisible(true)}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>
            {isEmpty ? t.settings_avatarCreate : t.settings_avatarEdit}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePhotoImport}
          style={styles.smallButton}
          disabled={converting}
        >
          {converting ? (
            <ActivityIndicator size="small" color={colors.tomato} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Camera size={14} color={colors.foreground} />
              <Text style={styles.smallButtonText}>{t.settings_avatarPhoto}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <PixelEditorModal
        visible={editorVisible}
        value={grid}
        onSave={handleSave}
        onCancel={() => setEditorVisible(false)}
      />
    </View>
  );
}

function VoicePokeSection() {
  const { authToken } = useAuth();
  const { t } = useI18n();
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(VOICE_KEY).then(async (val) => {
      if (val) {
        setAudioBase64(val);
      } else if (authToken) {
        try {
          const { audio } = await api.getUserVoice(authToken);
          if (audio) {
            setAudioBase64(audio);
            await AsyncStorage.setItem(VOICE_KEY, audio);
          }
        } catch {}
      }
    });
  }, [authToken]);

  const handleSave = useCallback(async (base64: string) => {
    setAudioBase64(base64);
    await AsyncStorage.setItem(VOICE_KEY, base64);
    if (authToken) {
      api.uploadUserVoice(authToken, base64).catch((e) => console.warn('voice upload failed', e));
    }
  }, [authToken]);

  const handleDelete = useCallback(async () => {
    setAudioBase64(null);
    await AsyncStorage.removeItem(VOICE_KEY);
    if (authToken) {
      api.deleteUserVoice(authToken).catch((e) => console.warn('voice delete failed', e));
    }
  }, [authToken]);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t.settings_voicePoke}</Text>
      <Text style={styles.sectionDesc}>
        {t.settings_voicePokeDesc}
      </Text>
      <VoiceRecorder
        audioBase64={audioBase64}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </View>
  );
}

function AccountSection() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  if (!user) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t.settings_account}</Text>
      <View style={styles.accountRow}>
        <View>
          <Text style={styles.accountName}>{user.username}</Text>
          <Text style={styles.accountSub}>{t.settings_loggedIn}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <LogOut size={13} color={colors.destructive} />
          <Text style={styles.logoutText}>{t.settings_logout}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const { settings, updateSettings, devMode, toggleDevMode } = useTimer();
  const { t, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();

  const ESCALATION_OPTIONS = [
    { value: 'slow' as const, label: t.settings_escSlow, description: '60s / 2min' },
    { value: 'normal' as const, label: t.settings_escNormal, description: '30s / 1min' },
    { value: 'fast' as const, label: t.settings_escFast, description: '15s / 30s' },
  ];

  return (
    <View style={styles.container}>
      {/* Settings background — tomato vines */}
      <Image
        source={require('@/../assets/images/settings_bg.png')}
        style={styles.settingsBgImage}
        resizeMode="cover"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.settings_title}</Text>
          <View style={styles.autoSaveBadge}>
            <Check size={12} color={colors.stem} />
            <Text style={styles.autoSaveText}>{t.settings_autoSave}</Text>
          </View>
        </View>

        {/* DEV MODE */}
        <View style={[styles.card, devMode && styles.cardDev]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <FlaskConical size={18} color={devMode ? colors.amber600 : colors.mutedForeground} />
              <View style={styles.toggleTextCol}>
                <Text style={[styles.toggleLabel, devMode && { color: colors.amber700 }]}>
                  Dev {t.settings_devMode}
                </Text>
                <Text style={styles.toggleDesc}>
                  {devMode ? t.settings_devOn : t.settings_devOff}
                </Text>
              </View>
            </View>
            <Switch
              value={devMode}
              onValueChange={toggleDevMode}
              trackColor={{ false: colors.cream, true: colors.amber500 }}
              thumbColor="#fff"
            />
          </View>
          {devMode && (
            <View style={styles.devTagRow}>
              {t.settings_devTags.map((tag) => (
                <View key={tag} style={styles.devTag}>
                  <Text style={styles.devTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Timer section */}
        <View style={[styles.card, devMode && styles.cardDisabled]}>
          <Text style={styles.sectionTitle}>
            {t.settings_timer}
            {devMode && <Text style={{ color: colors.amber600 }}>{t.settings_timerDevDisabled}</Text>}
          </Text>
          <NumberInput
            label={t.settings_workTime}
            value={settings.workDuration}
            min={1}
            max={120}
            onChange={(v) => updateSettings({ workDuration: v })}
          />
          <NumberInput
            label={t.settings_shortBreak}
            value={settings.shortBreakDuration}
            min={1}
            max={30}
            onChange={(v) => updateSettings({ shortBreakDuration: v })}
          />
          <NumberInput
            label={t.settings_longBreak}
            value={settings.longBreakDuration}
            min={5}
            max={60}
            onChange={(v) => updateSettings({ longBreakDuration: v })}
          />
          <NumberInput
            label={t.settings_longBreakInterval}
            value={settings.longBreakInterval}
            min={2}
            max={8}
            unit={t.settings_unit_session}
            onChange={(v) => updateSettings({ longBreakInterval: v })}
          />
        </View>

        {/* Display section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.settings_display}</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              {settings.hideTimer ? (
                <EyeOff size={18} color={colors.mutedForeground} />
              ) : (
                <Eye size={18} color={colors.mutedForeground} />
              )}
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleLabel}>{t.settings_hideTimer}</Text>
                <Text style={styles.toggleDesc}>
                  {settings.hideTimer ? t.settings_hideTimerOn : t.settings_hideTimerOff}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.hideTimer}
              onValueChange={(v) => updateSettings({ hideTimer: v })}
              trackColor={{ false: colors.cream, true: colors.tomato }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Do Not Disturb */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.settings_dnd}</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              {settings.doNotDisturb ? (
                <BellOff size={18} color={colors.tomato} />
              ) : (
                <Bell size={18} color={colors.mutedForeground} />
              )}
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleLabel}>{t.settings_dndLabel}</Text>
                <Text style={styles.toggleDesc}>
                  {settings.doNotDisturb ? t.settings_dndOn : t.settings_dndOff}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.doNotDisturb}
              onValueChange={(v) => updateSettings({ doNotDisturb: v })}
              trackColor={{ false: colors.cream, true: colors.tomato }}
              thumbColor="#fff"
            />
          </View>
          {settings.doNotDisturb && (
            <Text style={[styles.sectionDesc, { marginTop: 8, marginBottom: 0 }]}>
              {t.settings_dndHint}
            </Text>
          )}
        </View>

        {/* Sound section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.settings_sound}</Text>
          <Text style={styles.sectionDesc}>
            {t.settings_soundDesc}
          </Text>

          <View style={styles.soundInfo}>
            <Volume2 size={16} color={colors.tomato} />
            <View style={{ flex: 1 }}>
              <Text style={styles.soundName}>{t.settings_soundName}</Text>
              <Text style={styles.soundSub}>Ember AI{t.settings_soundSub}</Text>
            </View>
          </View>

          {/* Level previews */}
          <View style={styles.levelRow}>
            {([1, 2, 3] as const).map((lv) => {
              const bgColors = ['#FFF8F0', '#FFF0E0', '#FFE8E0'];
              const textColors = ['#B45309', '#C9402A', '#991b1b'];
              const borderColors = ['#FDDCB5', '#F5B89A', '#fecaca'];
              const descs = [t.settings_lv1, t.settings_lv2, t.settings_lv3];
              return (
                <TouchableOpacity
                  key={lv}
                  onPress={() => void previewSound('ember', settings.soundVolume, lv)}
                  style={[
                    styles.levelButton,
                    {
                      backgroundColor: bgColors[lv - 1],
                      borderColor: borderColors[lv - 1],
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.levelButtonRow}>
                    <Play size={11} color={textColors[lv - 1]} />
                    <Text style={[styles.levelButtonLv, { color: textColors[lv - 1] }]}>
                      Lv.{lv}
                    </Text>
                  </View>
                  <Text style={[styles.levelButtonDesc, { color: textColors[lv - 1] }]}>
                    {descs[lv - 1]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Volume */}
          <View style={styles.volumeRow}>
            <Text style={styles.volumeLabel}>{t.settings_volume}</Text>
            <Text style={styles.volumeValue}>{Math.round(settings.soundVolume * 100)}%</Text>
          </View>
          <View style={styles.volumeSliderRow}>
            <TouchableOpacity
              onPress={() => updateSettings({ soundVolume: Math.max(0, Math.round((settings.soundVolume - 0.05) * 100) / 100) })}
              style={numStyles.button}
            >
              <Text style={numStyles.buttonText}>{'\u2212'}</Text>
            </TouchableOpacity>
            <View style={styles.volumeBarTrack}>
              <View style={[styles.volumeBarFill, { width: `${settings.soundVolume * 100}%` }]} />
            </View>
            <TouchableOpacity
              onPress={() => updateSettings({ soundVolume: Math.min(1, Math.round((settings.soundVolume + 0.05) * 100) / 100) })}
              style={numStyles.button}
            >
              <Text style={numStyles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.volumeHint}>
            {t.settings_volumeHint}
          </Text>
        </View>

        {/* Escalation section */}
        <View style={[styles.card, devMode && styles.cardDisabled]}>
          <Text style={styles.sectionTitle}>{t.settings_escalation}</Text>
          <Text style={styles.sectionDesc}>
            {t.settings_escalationDesc}
          </Text>
          <View style={styles.escalationRow}>
            {ESCALATION_OPTIONS.map(({ value, label, description }) => (
              <TouchableOpacity
                key={value}
                onPress={() => updateSettings({ escalationSpeed: value })}
                style={[
                  styles.escalationButton,
                  settings.escalationSpeed === value && styles.escalationButtonActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.escalationLabel,
                    settings.escalationSpeed === value && { color: colors.tomato },
                  ]}
                >
                  {label}
                </Text>
                <Text style={styles.escalationDesc}>{description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Avatar */}
        <AvatarSection />

        {/* Voice Poke */}
        <VoicePokeSection />

        {/* Account */}
        <AccountSection />

        {/* Language */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.settings_lang}</Text>
          <View style={styles.langRow}>
            {([['ko', t.settings_langKo], ['en', t.settings_langEn]] as const).map(([code, label]) => (
              <TouchableOpacity
                key={code}
                onPress={() => setLang(code)}
                style={[styles.langButton, lang === code && styles.langButtonActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.langButtonText, lang === code && styles.langButtonTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About */}
        <View style={styles.card}>
          <View style={styles.aboutHeader}>
            <Text style={styles.sectionTitle}>{t.settings_about}</Text>
            <Image
              source={require('@/../assets/images/tomato4.png')}
              style={{ width: 24, height: 24, opacity: 0.5 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.aboutText}>
            <Text style={{ fontFamily: 'KotraBold', color: colors.tomato }}>NOW! Timer</Text>
            {t.settings_aboutDesc}
            <Text style={{ fontFamily: 'KotraBold' }}>NOW!</Text>
            {t.settings_aboutDesc2}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  settingsBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    opacity: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
  autoSaveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  autoSaveText: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.stem,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    shadowColor: colors.tomato,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardDev: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'KotraBold',
    color: colors.tomato,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  toggleTextCol: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
  toggleDesc: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    marginTop: 2,
  },
  devTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  devTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#fde68a',
    borderRadius: 12,
  },
  devTagText: {
    fontSize: 11,
    fontFamily: 'KotraGothic',
    color: '#92400e',
  },
  soundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.cream,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  soundName: {
    fontSize: 14,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
  soundSub: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  levelButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  levelButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  levelButtonLv: {
    fontSize: 12,
    fontFamily: 'KotraBold',
  },
  levelButtonDesc: {
    fontSize: 10,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  volumeLabel: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.foreground,
  },
  volumeValue: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  volumeSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volumeBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.cream,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  volumeBarFill: {
    height: '100%',
    backgroundColor: colors.tomato,
    borderRadius: 4,
  },
  volumeHint: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    marginTop: 8,
  },
  escalationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  escalationButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  escalationButtonActive: {
    borderColor: colors.tomato,
    backgroundColor: '#FFF0E8',
  },
  escalationLabel: {
    fontSize: 14,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
  escalationDesc: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    marginTop: 2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountName: {
    fontSize: 14,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
  accountSub: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logoutText: {
    fontSize: 12,
    fontFamily: 'KotraGothic',
    color: colors.destructive,
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  langButtonActive: {
    backgroundColor: colors.tomato,
    borderColor: colors.tomato,
  },
  langButtonText: {
    fontSize: 14,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
  langButtonTextActive: {
    color: '#fff',
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aboutText: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  smallButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallButtonText: {
    fontSize: 13,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
});
