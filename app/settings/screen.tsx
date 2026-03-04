import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { AppHeader } from '@/components/common/AppHeader';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/i18n';
import { Feather } from '@expo/vector-icons';

const C = Colors;

export default function ScreenSettings() {
  const { config, updateConfig } = useApp();
  const { t, i18n } = useTranslation();
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);

  const languages = [
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  const getCurrentLanguageLabel = () => {
    const currentLang = languages.find(l => l.code === i18n.language);
    return currentLang ? currentLang.label : 'العربية';
  };

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
    setShowLanguageSheet(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <AppHeader title={t('settings.screen')} showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>{t('settings.screen')}</Text>
        <View style={styles.card}>
          <View style={styles.settingItem}>
            <View style={styles.settingText}>
              <Text style={styles.label}>{t('settings.fullScreen')}</Text>
              <Text style={styles.description}>{t('settings.fullScreenDesc')}</Text>
            </View>
            <Switch
              value={config?.fullScreen || false}
              onValueChange={(value) => updateConfig({ fullScreen: value })}
              trackColor={{ false: C.border, true: C.primary }}
            />
          </View>

          <View style={[styles.settingItem, styles.borderTop]}>
            <View style={styles.settingText}>
              <Text style={styles.label}>{t('settings.keepScreenOn')}</Text>
              <Text style={styles.description}>{t('settings.keepScreenOnDesc')}</Text>
            </View>
            <Switch
              value={config?.keepScreenOn || false}
              onValueChange={(value) => updateConfig({ keepScreenOn: value })}
              trackColor={{ false: C.border, true: C.primary }}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('settings.printer')}</Text>
        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/settings/printer')}>
          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Feather name="printer" size={20} color={C.primary} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{t('settings.printerSettings')}</Text>
              <Text style={styles.menuDescription}>{t('settings.selectPrinter')}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={C.textMuted} />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <TouchableOpacity style={styles.menuCard} onPress={() => setShowLanguageSheet(true)}>
          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Feather name="globe" size={20} color={C.primary} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuLabel}>{t('settings.language')}</Text>
              <Text style={styles.menuDescription}>
                {getCurrentLanguageLabel()}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={C.textMuted} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showLanguageSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageSheet(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLanguageSheet(false)}>
          <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('settings.language')}</Text>
            <View style={styles.sheetCard}>
              {languages.map((lang, index) => {
                const isActive = i18n.language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.languageItem, index < languages.length - 1 && styles.itemBorder]}
                    onPress={() => handleLanguageChange(lang.code)}
                  >
                    <View style={styles.languageInfo}>
                      <Text style={styles.flag}>{lang.flag}</Text>
                      <Text style={styles.languageLabel}>{lang.label}</Text>
                    </View>
                    {isActive && (
                      <View style={styles.checkmark}>
                        <Feather name="check" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowLanguageSheet(false)}>
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  menuCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
  },
  description: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 2,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
  },
  menuDescription: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 16,
  },
  sheetCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: {
    fontSize: 24,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: C.textPrimary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    backgroundColor: C.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
