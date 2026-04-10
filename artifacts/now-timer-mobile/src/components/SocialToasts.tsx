import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Vibration, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react-native';
import { useSocial } from '@/context/SocialContext';
import { playPokeSound, playVoicePoke } from '@/lib/sounds';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { VIBRATION_POKE } from '@/lib/constants';

export function PeerAlertToast() {
  const { peerAlertMsg, clearPeerAlert } = useSocial();

  useEffect(() => {
    if (!peerAlertMsg) return;
    Vibration.vibrate([...VIBRATION_POKE]);
    const timer = setTimeout(clearPeerAlert, 6000);
    return () => clearTimeout(timer);
  }, [peerAlertMsg, clearPeerAlert]);

  if (!peerAlertMsg) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <TouchableOpacity
        style={toastStyles.peerOverlay}
        activeOpacity={1}
        onPress={clearPeerAlert}
      >
        <View style={toastStyles.peerToast}>
          <Zap size={15} color="#fff" />
          <Text style={toastStyles.peerText} numberOfLines={2}>{peerAlertMsg}</Text>
          <TouchableOpacity onPress={clearPeerAlert}>
            <Text style={toastStyles.peerClose}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export function PokeToast() {
  const { pokeFrom, pokeFromId, pokeHasVoice, clearPoke } = useSocial();
  const { t } = useI18n();

  useEffect(() => {
    if (!pokeFrom) return;
    Vibration.vibrate([...VIBRATION_POKE]);
    if (pokeHasVoice && pokeFromId) {
      api.getVoice(pokeFromId).then(({ audio }) => {
        void playVoicePoke(audio);
      }).catch(() => {
        void playPokeSound();
      });
    } else {
      void playPokeSound();
    }
    const timer = setTimeout(clearPoke, 4000);
    return () => clearTimeout(timer);
  }, [pokeFrom, clearPoke]);

  if (!pokeFrom) return null;

  return (
    <View style={toastStyles.pokeBanner} pointerEvents="box-none">
      <TouchableOpacity
        onPress={clearPoke}
        style={toastStyles.pokeCard}
        activeOpacity={0.9}
      >
        <Text style={toastStyles.pokeEmoji}>{'\uD83D\uDC4A'}</Text>
        <View style={toastStyles.pokeTextWrap}>
          <Text style={toastStyles.pokeName} numberOfLines={1}>
            {t.social_pokeToast(pokeFrom)}
          </Text>
          <Text style={toastStyles.pokeDismiss}>{t.social_pokeDismiss}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const toastStyles = StyleSheet.create({
  peerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 140,
    paddingHorizontal: 16,
  },
  peerToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ea580c',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: 340,
  },
  peerText: {
    fontSize: 14,
    fontFamily: 'KotraBold',
    color: '#fff',
    flex: 1,
  },
  peerClose: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginLeft: 4,
  },
  pokeBanner: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
    paddingHorizontal: 16,
  },
  pokeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f97316',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    gap: 14,
  },
  pokeEmoji: {
    fontSize: 32,
  },
  pokeTextWrap: {
    flex: 1,
  },
  pokeName: {
    fontSize: 18,
    fontFamily: 'KotraBold',
    color: '#fff',
  },
  pokeDismiss: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
});
