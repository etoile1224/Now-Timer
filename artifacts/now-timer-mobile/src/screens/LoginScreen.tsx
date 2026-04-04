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
      setError((err as Error).message ?? '\uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC5B4\uC694');
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
        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>NOW!</Text>
          <Text style={styles.tagline}>{'\uD300\uACFC \uD568\uAED8 \uC9D1\uC911\uD574\uC694'}</Text>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          {(['login', 'register'] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => { setMode(m); setError(null); }}
              style={[styles.modeButton, mode === m && styles.modeButtonActive]}
            >
              <Text style={[styles.modeButtonText, mode === m && styles.modeButtonTextActive]}>
                {m === 'login' ? '\uB85C\uADF8\uC778' : '\uD68C\uC6D0\uAC00\uC785'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>{'\uC544\uC774\uB514'}</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="2~20\uC790"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>{'\uBE44\uBC00\uBC88\uD638'}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={mode === 'register' ? '6\uC790 \uC774\uC0C1' : ''}
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'login' ? '\uB85C\uADF8\uC778' : '\uC2DC\uC791\uD558\uAE30'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Switch mode text */}
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>
            {mode === 'login' ? '\uACC4\uC815\uC774 \uC5C6\uC73C\uC2E0\uAC00\uC694? ' : '\uC774\uBBF8 \uACC4\uC815\uC774 \uC788\uC73C\uC2E0\uAC00\uC694? '}
          </Text>
          <TouchableOpacity
            onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
          >
            <Text style={styles.switchLink}>
              {mode === 'login' ? '\uD68C\uC6D0\uAC00\uC785' : '\uB85C\uADF8\uC778'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 64,
    fontWeight: '900',
    color: colors.foreground,
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  modeButtonTextActive: {
    color: colors.foreground,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.foreground,
  },
  errorText: {
    fontSize: 14,
    color: colors.destructive,
    textAlign: 'center',
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: colors.foreground,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  switchLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
    textDecorationLine: 'underline',
  },
});
