import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { GameText as Text } from '@/shared/components/game-text';
import type { GameMode } from '@/games/galaxy-balls/engine/galaxyEngine';
import { useLanguage } from '@/shared/i18n/LanguageProvider';

type Props = {
  mode: GameMode | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function NewGameConfirmation({ mode, onCancel, onConfirm }: Props) {
  const { t } = useLanguage();
  if (mode === null) return null;
  const modeLabel = t(mode === 'CLASSIC' ? 'classic' : mode === 'COMFORT' ? 'comfort' : 'practice');

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={styles.title}>{t('newGameTitle')}</Text>
            <Text style={styles.message}>{t('newGameMessage', { mode: modeLabel })}</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.buttonLabel}>{t('cancelNewGame')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.buttonLabel}>{t('confirmNewGame')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000BB', padding: 24, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 360, maxHeight: '90%', borderRadius: 18, backgroundColor: '#0F172A', borderColor: '#F59B1A', borderWidth: 2 },
  content: { padding: 22, gap: 16 },
  title: { color: '#FDE68A', fontSize: 23, fontWeight: '900', textAlign: 'center' },
  message: { color: '#F8FAFC', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  cancelButton: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: '#1E293B', borderColor: '#64748B', borderWidth: 1, justifyContent: 'center' },
  confirmButton: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: '#B91C1C', borderColor: '#FCA5A5', borderWidth: 1, justifyContent: 'center' },
  buttonLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center' },
});
