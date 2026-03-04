import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');
const C = Colors.dark;

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: 'success' | 'error' | 'info' | 'warning';
}

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  onClose,
  type = 'info',
}) => {
  const getHeaderColor = () => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return C.danger;
      case 'warning': return C.gold;
      default: return C.gold;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={[styles.headerLine, { backgroundColor: getHeaderColor() }]} />
          <View style={styles.body}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: getHeaderColor() }]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>OK</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: C.surface,
    borderRadius: 16,
    width: Math.min(width * 0.85, 400),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  headerLine: {
    height: 4,
    width: '100%',
  },
  body: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: C.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
});
