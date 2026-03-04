// components/common/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Radius, Shadow, CardPadding } from '@/constants/layout';

type CardVariant = 'default' | 'highlighted' | 'flat';
type CardPaddingSize = 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPaddingSize;
  style?: ViewStyle;
}

export function Card({ children, variant = 'default', padding = 'md', style }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        { padding: CardPadding[padding] },
        variant === 'highlighted' && styles.highlighted,
        variant === 'flat'        && styles.flat,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.card,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    ...Shadow.card,
  },
  highlighted: {
    borderLeftWidth:  3,
    borderLeftColor:  Colors.accent,
  },
  flat: {
    ...Shadow.none,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
