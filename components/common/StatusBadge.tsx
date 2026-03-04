// components/common/StatusBadge.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { StatusColors } from '@/constants/colors';
import { FontWeight, FontSize } from '@/constants/typography';
import { Radius, Spacing } from '@/constants/layout';

type StatusType = 'paid' | 'partial' | 'due' | 'draft';

interface StatusBadgeProps {
  status: StatusType;
  label?: string; // optional override label
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const sc = StatusColors[status] || StatusColors.draft;
  const displayLabel = label ?? status.toUpperCase();

  return (
    <View
      style={{
        backgroundColor:  sc.bg,
        borderRadius:     Radius.full,
        paddingHorizontal: Spacing.md,
        paddingVertical:   4,
        alignSelf:        'flex-start',
        borderWidth:       1,
        borderColor:       sc.border + '40', // 25% opacity border
      }}
    >
      <Text
        style={{
          color:          sc.text,
          fontSize:       FontSize.xs,
          fontWeight:     FontWeight.bold,
          letterSpacing:  0.6,
          textTransform:  'uppercase',
        }}
      >
        {displayLabel}
      </Text>
    </View>
  );
}
