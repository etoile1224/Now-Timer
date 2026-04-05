import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Image,
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
} from 'lucide-react-native';
import { useTimer } from '@/context/TimerContext';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';
import { previewSound } from '@/lib/sounds';
import { api } from '@/lib/api';
import { colors } from '@/lib/colors';
import { PixelEditorModal, createEmptyGrid, ensureGrid32 } from '@/components/PixelEditor';
import { PixelAvatar } from '@/components/PixelAvatar';
import { VoiceRecorder } from '@/components/VoiceRecorder';

interface NumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (val: number) => void;
}

function NumberInput({ label, value, min, max, unit = '\uBD84', onChange }: NumberInputProps) {
  return (
    <View style={numStyles.row}>
      <Text style={numStyles.label}>{label}</Text>
      <View style={numStyles.controls}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - 1))}
          style={numStyles.button}
          activeOpacity={0.7}
        >
          <Text style={numStyles.buttonText}>{'\u2212'}</Text>
        </TouchableOpacity>
        <View style={numStyles.valueBox}>
          <Text style={numStyles.valueText}>{value}</Text>
        </View>
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + 1))}
          style={numStyles.button}
          activeOpacity={0.7}
        >
          <Text style={numStyles.buttonText}>+</Text>
        </TouchableOpacity>
        <Text style={numStyles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const numStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.foreground,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'KotraBold',
    color: colors.tomato,
  },
  valueBox: {
    width: 48,
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: colors.cream,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  valueText: {
    fontSize: 14,
    fontFamily: 'Komputa-Bold',
    color: colors.foreground,
  },
  unit: {
    fontSize: 13,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    width: 28,
  },
});

const ESCALATION_OPTIONS = [
  { value: 'slow' as const, label: '\uB290\uB9BC', description: '60\uCD08 / 2\uBD84' },
  { value: 'normal' as const, label: '\uBCF4\uD1B5', description: '30\uCD08 / 1\uBD84' },
  { value: 'fast' as const, label: '\uBE60\uB984', description: '15\uCD08 / 30\uCD08' },
];

const AVATAR_KEY = 'now_timer_avatar';
const VOICE_KEY = 'now_timer_voice';

function AvatarSection() {
  const { memberships } = useSocial();
  const [grid, setGrid] = useState<(string | null)[][]>(createEmptyGrid);
  const [editorVisible, setEditorVisible] = useState(false);

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
      api.updateAvatar(m.memberId, data, m.token).catch(() => {});
    }
  }, [memberships]);

  const isEmpty = grid.every(row => row.every(c => c === null));

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{'\uD504\uB85C\uD544 \uC544\uBC14\uD0C0'}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <PixelAvatar data={isEmpty ? null : grid} size={48} fallbackLetter="?" />
        <TouchableOpacity
          onPress={() => setEditorVisible(true)}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>
            {isEmpty ? '\uC544\uBC14\uD0C0 \uB9CC\uB4E4\uAE30' : '\uC218\uC815\uD558\uAE30'}
          </Text>
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
      api.uploadUserVoice(authToken, base64).catch(() => {});
    }
  }, [authToken]);

  const handleDelete = useCallback(async () => {
    setAudioBase64(null);
    await AsyncStorage.removeItem(VOICE_KEY);
    if (authToken) {
      api.deleteUserVoice(authToken).catch(() => {});
    }
  }, [authToken]);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{'\uBCF4\uC774\uC2A4 \uD3EC\uD06C'}</Text>
      <Text style={styles.sectionDesc}>
        {'NOW! \uBB34\uC2DC\uD558\uB294 \uD300\uC6D0\uC5D0\uAC8C \uB0B4 \uBAA9\uC18C\uB9AC\uB85C \uC54C\uB9BC\uC744 \uBCF4\uB0BC \uC218 \uC788\uC5B4\uC694'}
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
  if (!user) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{'\uACC4\uC815'}</Text>
      <View style={styles.accountRow}>
        <View>
          <Text style={styles.accountName}>{user.username}</Text>
          <Text style={styles.accountSub}>{'\uB85C\uADF8\uC778\uB428'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <LogOut size={13} color={colors.destructive} />
          <Text style={styles.logoutText}>{'\uB85C\uADF8\uC544\uC6C3'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const { settings, updateSettings, devMode, toggleDevMode } = useTimer();
  const insets = useSafeAreaInsets();

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
          <Text style={styles.headerTitle}>{'\uC124\uC815'}</Text>
          <View style={styles.autoSaveBadge}>
            <Check size={12} color={colors.stem} />
            <Text style={styles.autoSaveText}>{'\uC790\uB3D9 \uC800\uC7A5'}</Text>
          </View>
        </View>

        {/* DEV MODE */}
        <View style={[styles.card, devMode && styles.cardDev]}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <FlaskConical size={18} color={devMode ? colors.amber600 : colors.mutedForeground} />
              <View style={styles.toggleTextCol}>
                <Text style={[styles.toggleLabel, devMode && { color: colors.amber700 }]}>
                  Dev {'\uBAA8\uB4DC'}
                </Text>
                <Text style={styles.toggleDesc}>
                  {devMode
                    ? '\uBAA8\uB4E0 \uAD6C\uAC04 5\uCD08 \u00B7 \uC5D0\uC2A4\uCEEC\uB808\uC774\uC158 5\uCD08'
                    : '\uD14C\uC2A4\uD2B8\uC6A9 \uCD08\uACE0\uC18D \uD0C0\uC774\uBA38 (\uC791\uC5C5/\uD734\uC2DD/\uC5D0\uC2A4\uCEEC\uB808\uC774\uC158 \uBAA8\uB450 5\uCD08)'}
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
              {['\uC791\uC5C5 5\uCD08', '\uD734\uC2DD 5\uCD08', '\uC5D0\uC2A4\uCEEC\uB808\uC774\uC158 5\uCD08', '\uC2A4\uB204\uC988 5\uCD08'].map((tag) => (
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
            {'\uD0C0\uC774\uBA38'}
            {devMode && <Text style={{ color: colors.amber600 }}>{' (Dev \uBAA8\uB4DC \uC911 \uBE44\uD65C\uC131)'}</Text>}
          </Text>
          <NumberInput
            label={'\uC791\uC5C5 \uC2DC\uAC04'}
            value={settings.workDuration}
            min={1}
            max={120}
            onChange={(v) => updateSettings({ workDuration: v })}
          />
          <NumberInput
            label={'\uC9E7\uC740 \uD734\uC2DD'}
            value={settings.shortBreakDuration}
            min={1}
            max={30}
            onChange={(v) => updateSettings({ shortBreakDuration: v })}
          />
          <NumberInput
            label={'\uAE34 \uD734\uC2DD'}
            value={settings.longBreakDuration}
            min={5}
            max={60}
            onChange={(v) => updateSettings({ longBreakDuration: v })}
          />
          <NumberInput
            label={'\uAE34 \uD734\uC2DD \uC8FC\uAE30'}
            value={settings.longBreakInterval}
            min={2}
            max={8}
            unit={'\uC138\uC158'}
            onChange={(v) => updateSettings({ longBreakInterval: v })}
          />
        </View>

        {/* Display section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{'\uD654\uBA74'}</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              {settings.hideTimer ? (
                <EyeOff size={18} color={colors.mutedForeground} />
              ) : (
                <Eye size={18} color={colors.mutedForeground} />
              )}
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleLabel}>{'\uD0C0\uC774\uBA38 \uC228\uAE30\uAE30'}</Text>
                <Text style={styles.toggleDesc}>
                  {settings.hideTimer
                    ? '\uC22B\uC790 \uC5C6\uC774 \uC9D1\uC911 \uBAA8\uB4DC (\uAD8C\uC7A5)'
                    : '\uB0A8\uC740 \uC2DC\uAC04\uC774 \uD654\uBA74\uC5D0 \uD45C\uC2DC\uB428'}
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

        {/* Sound section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{'\uC54C\uB9BC\uC74C'}</Text>
          <Text style={styles.sectionDesc}>
            {'\uB808\uBCA8\uC774 \uC62C\uB77C\uAC08\uC218\uB85D \uAC19\uC740 \uC18C\uB9AC\uAC00 \uB354 \uD06C\uACE0 \uC790\uC8FC \uBC18\uBCF5\uB429\uB2C8\uB2E4'}
          </Text>

          <View style={styles.soundInfo}>
            <Volume2 size={16} color={colors.tomato} />
            <View style={{ flex: 1 }}>
              <Text style={styles.soundName}>{'\uC5D0\uB108\uC9C0 \uBCF4\uC774\uC2A4'}</Text>
              <Text style={styles.soundSub}>Ember AI {'\u00B7 \uB808\uBCA8\uBCC4 \uAC15\uB3C4 \uC790\uB3D9 \uC870\uC808'}</Text>
            </View>
          </View>

          {/* Level previews */}
          <View style={styles.levelRow}>
            {([1, 2, 3] as const).map((lv) => {
              const bgColors = ['#FFF8F0', '#FFF0E0', '#FFE8E0'];
              const textColors = ['#B45309', '#C9402A', '#991b1b'];
              const borderColors = ['#FDDCB5', '#F5B89A', '#fecaca'];
              const descs = ['1\uD68C \uC7AC\uC0DD', '\uBCFC\uB968 + \uBC18\uBCF5', '\uB8E8\uD504 \uC7AC\uC0DD'];
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
            <Text style={styles.volumeLabel}>{'\uAE30\uBCF8 \uBCFC\uB968'}</Text>
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
            Lv.2{'\uB294 +30%, Lv.3\uC740 \uCD5C\uB300 \uBCFC\uB968\uC73C\uB85C \uC790\uB3D9 \uC870\uC808\uB429\uB2C8\uB2E4'}
          </Text>
        </View>

        {/* Escalation section */}
        <View style={[styles.card, devMode && styles.cardDisabled]}>
          <Text style={styles.sectionTitle}>{'\uC5D0\uC2A4\uCEEC\uB808\uC774\uC158 \uC18D\uB3C4'}</Text>
          <Text style={styles.sectionDesc}>
            {'NOW!\uB97C \uBB34\uC2DC\uD560 \uB54C Lv.2 \u2192 Lv.3\uC73C\uB85C \uC804\uD658\uB418\uB294 \uC18D\uB3C4'}
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

        {/* About */}
        <View style={styles.card}>
          <View style={styles.aboutHeader}>
            <Text style={styles.sectionTitle}>{'\uC571 \uC815\uBCF4'}</Text>
            <Image
              source={require('@/../assets/images/tomato4.png')}
              style={{ width: 24, height: 24, opacity: 0.5 }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.aboutText}>
            <Text style={{ fontFamily: 'KotraBold', color: colors.tomato }}>NOW! Timer</Text>
            {'\uB294 \uD0C0\uC774\uBA38 \uC22B\uC790\uB97C \uC228\uACA8 \uCE74\uC6B4\uD2B8\uB2E4\uC6B4 \uBD88\uC548\uC744 \uC904\uC774\uACE0, \uC138\uC158\uC774 \uB05D\uB098\uBA74 \uAC15\uB82C\uD55C '}
            <Text style={{ fontFamily: 'KotraBold' }}>NOW!</Text>
            {' \uC2E0\uD638\uB85C \uC804\uD658\uC744 \uC54C\uB824\uC8FC\uB294 \uD3EC\uCEE4\uC2A4 \uD0C0\uC774\uBA38\uC608\uC694.'}
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
