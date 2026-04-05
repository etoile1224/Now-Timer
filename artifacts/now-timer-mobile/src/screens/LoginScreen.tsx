import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/lib/colors';

type Mode = 'login' | 'register';

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
    } catch (err) {
      setError((err as Error).message ?? '오류가 발생했어요');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form — flat layout, no separate card */}
        <View style={styles.formArea}>
          <Text style={styles.title}>
            {mode === 'login' ? '로그인' : '회원가입'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? '계정에 로그인하세요' : '새 계정을 만드세요'}
          </Text>

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            {(['login', 'register'] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => { setMode(m); setError(null); }}
                style={[styles.modeButton, mode === m && styles.modeButtonActive]}
              >
                <Text style={[styles.modeButtonText, mode === m && styles.modeButtonTextActive]}>
                  {m === 'login' ? '로그인' : '회원가입'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form fields */}
          <View style={styles.form}>
            <Text style={styles.label}>{'아이디'}</Text>
            <ImageBackground
              source={require('@/../assets/images/input_field.png')}
              style={styles.inputBg}
              imageStyle={styles.inputBgImage}
              resizeMode="cover"
            >
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="2~20자"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </ImageBackground>

            <Text style={[styles.label, { marginTop: 12 }]}>{'비밀번호'}</Text>
            <ImageBackground
              source={require('@/../assets/images/input_field.png')}
              style={styles.inputBg}
              imageStyle={styles.inputBgImage}
              resizeMode="cover"
            >
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'register' ? '6자 이상' : ''}
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
              />
            </ImageBackground>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitWrap, loading && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <ImageBackground
                source={require('@/../assets/images/btn_login.png')}
                style={styles.submitBg}
                imageStyle={styles.submitBgImage}
                resizeMode="cover"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'login' ? '로그인' : '시작하기'}
                  </Text>
                )}
              </ImageBackground>
            </TouchableOpacity>
          </View>

          {/* Switch mode */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
            </Text>
            <TouchableOpacity
              onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
            >
              <Text style={styles.switchLink}>
                {mode === 'login' ? '회원가입' : '로그인'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  formArea: {
  },
  title: {
    fontSize: 26,
    fontFamily: 'KotraBold',
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
    marginTop: 2,
    marginBottom: 16,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.background,
  },
  modeButtonText: {
    fontSize: 14,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  modeButtonTextActive: {
    color: colors.foreground,
    fontFamily: 'KotraBold',
  },
  form: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: 'KotraGothic',
    color: colors.foreground,
    marginBottom: 4,
    marginLeft: 4,
  },
  inputBg: {
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 14,
  },
  inputBgImage: {
    borderRadius: 14,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.foreground,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'KotraGothic',
    color: colors.destructive,
    textAlign: 'center',
    marginTop: 12,
  },
  submitWrap: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitBg: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBgImage: {
    borderRadius: 14,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'KotraBold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 13,
    fontFamily: 'KotraGothic',
    color: colors.mutedForeground,
  },
  switchLink: {
    fontSize: 13,
    fontFamily: 'KotraBold',
    color: colors.tomato,
    textDecorationLine: 'underline',
  },
});
