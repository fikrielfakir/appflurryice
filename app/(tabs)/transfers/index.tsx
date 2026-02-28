import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

const C = Colors.dark;

export default function TransfersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Transfers Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontSize: 18 },
});
