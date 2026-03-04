// components/common/SearchBar.tsx
import React from 'react';
import { View, TextInput, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { InputHeight, Radius, Spacing } from '@/constants/layout';
import { FontSize } from '@/constants/typography';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...', style }: SearchBarProps) {
  return (
    <View
      style={[
        {
          flexDirection:    'row',
          alignItems:       'center',
          backgroundColor:  Colors.inputBg,
          borderRadius:     Radius.md,
          paddingHorizontal: Spacing.md,
          height:           InputHeight.md,
          borderWidth:      1,
          borderColor:      Colors.borderLight,
        },
        style,
      ]}
    >
      <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={{
          flex:       1,
          marginLeft: Spacing.sm,
          fontSize:   FontSize.base,
          color:      Colors.textPrimary,
          paddingVertical: 0, // Android fix
        }}
      />
    </View>
  );
}
