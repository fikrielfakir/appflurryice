// components/common/Button.tsx
// FlurryIce — Single button component for all variants and sizes

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { FontWeight, FontSize } from '@/constants/typography';
import { ButtonHeight, Radius, Spacing, IconSize } from '@/constants/layout';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  disabled?: boolean;
  loading?:  boolean;
  icon?:     React.ReactNode;  // icon shown before label
  iconRight?: React.ReactNode; // icon shown after label
  fullWidth?: boolean;
  style?:    ViewStyle;
  labelStyle?: TextStyle;
}

// Variant → background + text + border config
const VARIANT_STYLES: Record<ButtonVariant, {
  bg: string; text: string; border?: string; pressedBg: string;
}> = {
  primary:   { bg: Colors.primary,       text: Colors.white,         pressedBg: Colors.primaryDark },
  secondary: { bg: Colors.accentSoft,    text: Colors.primary,       pressedBg: '#C7EEF8'          },
  ghost:     { bg: 'transparent',        text: Colors.primary,       border: Colors.border, pressedBg: Colors.surface },
  danger:    { bg: Colors.danger,        text: Colors.white,         pressedBg: '#DC2626'          },
  success:   { bg: Colors.success,       text: Colors.white,         pressedBg: '#059669'          },
};

const SIZE_STYLES: Record<ButtonSize, { height: number; fontSize: number; paddingH: number; radius: number; iconSize: number }> = {
  sm: { height: ButtonHeight.sm, fontSize: FontSize.sm,   paddingH: Spacing.md,  radius: Radius.sm,  iconSize: IconSize.xs },
  md: { height: ButtonHeight.md, fontSize: FontSize.md,   paddingH: Spacing.lg,  radius: Radius.md,  iconSize: IconSize.sm },
  lg: { height: ButtonHeight.lg, fontSize: FontSize.lg,   paddingH: Spacing.xl,  radius: Radius.md,  iconSize: IconSize.md },
};

export function Button({
  label,
  onPress,
  variant  = 'primary',
  size     = 'md',
  disabled = false,
  loading  = false,
  icon,
  iconRight,
  fullWidth = false,
  style,
  labelStyle,
}: ButtonProps) {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          height:            s.height,
          backgroundColor:   disabled ? Colors.border : v.bg,
          paddingHorizontal: s.paddingH,
          borderRadius:      s.radius,
          ...(v.border ? { borderWidth: 1.5, borderColor: disabled ? Colors.border : v.border } : {}),
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={{ marginRight: Spacing.sm }}>{icon}</View>}
          <Text
            style={[
              styles.label,
              {
                fontSize:   s.fontSize,
                color:      disabled ? Colors.textMuted : v.text,
              },
              labelStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {iconRight && <View style={{ marginLeft: Spacing.sm }}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems:     'center',
    justifyContent: 'center',
    flexDirection:  'row',
  },
  inner: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight:    FontWeight.semibold,
    letterSpacing: 0.1,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
