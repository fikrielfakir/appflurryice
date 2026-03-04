import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  useGradient?: boolean;
}

const C = Colors;

const ScreenContainer = ({ children, style, useGradient = true }: ScreenContainerProps) => {

  if (useGradient) {
    return (
      <LinearGradient
        colors={[C.accent, C.background]}
        style={[styles.container, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenContainer;