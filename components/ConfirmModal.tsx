import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/constants';

const { width } = Dimensions.get('window');
const C = Colors;

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info' | 'success';
  icon?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger',
  icon,
}) => {
  const getColor = () => {
    switch (type) {
      case 'danger': return C.danger;
      case 'warning': return C.warning;
      case 'success': return C.success;
      default: return C.primary;
    }
  };

  const color = getColor();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            {icon ? (
              <Feather name={icon as any} size={28} color={color} />
            ) : (
              <Feather name="alert-circle" size={28} color={color} />
            )}
          </View>
          
          <Text style={styles.title}>{title}</Text>
          
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: C.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelText, { color: C.textSecondary }]}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: color }]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: C.card,
    borderRadius: 20,
    width: Math.min(width * 0.85, 360),
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: C.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
