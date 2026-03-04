import React from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { AppHeader } from '@/components/common/AppHeader';
import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { layout } from '@/constants/layout';
import { useAppContext } from '@/context/AppContext';

export default function ScreenSettings() {
  const { config, updateConfig } = useAppContext();

  return (
    <ScreenContainer>
      <AppHeader title="Screen Settings" showBack />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.label}>Full Screen Mode</Text>
              <Text style={styles.description}>Hide status bar for more space</Text>
            </View>
            <Switch
              value={config?.fullScreen || false}
              onValueChange={(value) => updateConfig({ fullScreen: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.settingItem, styles.borderTop]}>
            <View style={styles.settingText}>
              <Text style={styles.label}>Keep Screen On</Text>
              <Text style={styles.description}>Prevent device from sleeping</Text>
            </View>
            <Switch
              value={config?.keepScreenOn || false}
              onValueChange={(value) => updateConfig({ keepScreenOn: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={[styles.settingItem, styles.borderTop]}>
            <View style={styles.settingText}>
              <Text style={styles.label}>Dark Mode</Text>
              <Text style={styles.description}>Use dark theme for the interface</Text>
            </View>
            <Switch
              value={config?.darkMode || false}
              onValueChange={(value) => updateConfig({ darkMode: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: layout.spacing.md,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: layout.spacing.lg,
  },
  settingText: {
    flex: 1,
    marginRight: layout.spacing.md,
  },
  label: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  description: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
