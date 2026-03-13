import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { AppHeader } from '@/components/common/AppHeader';
import { useApp } from '@/context/AppContext';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/i18n';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { D } from '@/constants/theme';

export default function ScreenSettings() {
  const { config, updateConfig } = useApp();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showTruckModal, setShowTruckModal]       = useState(false);
  const [truckLocation, setTruckLocation]         = useState(config?.truckLocation || '');

  const languages = [
    { code: 'ar', label: 'العربية',  flag: '🇸🇦' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English',  flag: '🇬🇧' },
  ];

  const getCurrentLanguageLabel = () => {
    const current = languages.find(l => l.code === i18n.language);
    return current ? `${current.flag}  ${current.label}` : '🇸🇦  العربية';
  };

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
    setShowLanguageSheet(false);
  };

  // ── Reusable section label ────────────────────────────────────────────────
  const SectionLabel = ({ label }: { label: string }) => (
    <Text style={S.sectionLbl}>{label}</Text>
  );

  // ── Menu row (chevron card) ───────────────────────────────────────────────
  const MenuRow = ({
    icon, iconColor, iconBg, label, desc, onPress, last = false,
  }: {
    icon: string; iconColor: string; iconBg: string;
    label: string; desc: string; onPress: () => void; last?: boolean;
  }) => (
    <TouchableOpacity
      style={[S.menuRow, !last && S.menuRowBorder]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.78}
    >
      <View style={[S.menuIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={S.menuBody}>
        <Text style={S.menuLabel}>{label}</Text>
        <Text style={S.menuDesc}>{desc}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={D.inkGhost} />
    </TouchableOpacity>
  );

  // ── Toggle row ────────────────────────────────────────────────────────────
  const ToggleRow = ({
    label, desc, value, onChange, last = false,
  }: {
    label: string; desc: string; value: boolean; onChange: (v: boolean) => void; last?: boolean;
  }) => (
    <View style={[S.menuRow, !last && S.menuRowBorder]}>
      <View style={[S.menuIcon, { backgroundColor: D.blueBg }]}>
        <Feather name={value ? 'toggle-right' : 'toggle-left'} size={18} color={D.blue} />
      </View>
      <View style={S.menuBody}>
        <Text style={S.menuLabel}>{label}</Text>
        <Text style={S.menuDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(v); }}
        trackColor={{ false: D.border, true: D.heroAccent }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <View style={[S.screen, { backgroundColor: D.bg }]}>

      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <View style={S.hero}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        <AppHeader
          title={t('settings.screen')}
          dark
          showBack
          onBackPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        />

        {/* Toolbar chip */}
        <View style={S.toolbar}>
          <View style={S.countChip}>
            <Feather name="settings" size={11} color="rgba(255,255,255,0.75)" />
            <Text style={S.countChipTxt}>{t('settings.screen')}</Text>
          </View>
        </View>
      </View>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[S.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Display */}
        <SectionLabel label={t('settings.screen')} />
        <View style={S.card}>
          <ToggleRow
            label={t('settings.fullScreen')}
            desc={t('settings.fullScreenDesc')}
            value={config?.fullScreen || false}
            onChange={(v) => updateConfig({ fullScreen: v })}
          />
          <ToggleRow
            label={t('settings.keepScreenOn')}
            desc={t('settings.keepScreenOnDesc')}
            value={config?.keepScreenOn || false}
            onChange={(v) => updateConfig({ keepScreenOn: v })}
            last
          />
        </View>

        {/* Printer */}
        <SectionLabel label={t('settings.printer')} />
        <View style={S.card}>
          <MenuRow
            icon="printer"
            iconColor={D.heroAccent}
            iconBg={D.violetBg}
            label={t('settings.printerSettings')}
            desc={t('settings.selectPrinter')}
            onPress={() => router.push('/settings/printer')}
            last
          />
        </View>

        {/* Language */}
        <SectionLabel label={t('settings.language')} />
        <View style={S.card}>
          <MenuRow
            icon="globe"
            iconColor={D.blue}
            iconBg={D.blueBg}
            label={t('settings.language')}
            desc={getCurrentLanguageLabel()}
            onPress={() => setShowLanguageSheet(true)}
            last
          />
        </View>

        {/* Truck */}
        <SectionLabel label={t('settings.truckSettings') || 'Truck Settings'} />
        <View style={S.card}>
          <MenuRow
            icon="truck"
            iconColor={D.emerald}
            iconBg={D.emeraldBg}
            label={t('settings.truckLocation') || 'Truck Location'}
            desc={config?.truckLocation || 'CAM 01 - 0199-A-44'}
            onPress={() => {
              setTruckLocation(config?.truckLocation || 'CAM 01 - 0199-A-44');
              setShowTruckModal(true);
            }}
            last
          />
        </View>
      </ScrollView>

      {/* ── Truck modal ────────────────────────────────────────────────────── */}
      <Modal visible={showTruckModal} transparent animationType="slide" onRequestClose={() => setShowTruckModal(false)}>
        <View style={S.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTruckModal(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </Pressable>
          <View style={S.sheet}>
            <View style={S.handle} />
            <View style={S.sheetHeaderRow}>
              <Text style={S.sheetTitle}>{t('settings.truckLocation') || 'Truck Location'}</Text>
              <TouchableOpacity style={S.sheetClose} onPress={() => setShowTruckModal(false)}>
                <Feather name="x" size={16} color={D.inkSoft} />
              </TouchableOpacity>
            </View>

            <Text style={S.inputLabel}>{t('settings.enterTruckLocation') || 'Location identifier'}</Text>
            <View style={S.inputWrap}>
              <Feather name="map-pin" size={14} color={D.inkSoft} style={{ marginRight: 8 }} />
              <TextInput
                style={S.input}
                value={truckLocation}
                onChangeText={setTruckLocation}
                placeholder="CAM 01 - 0199-A-44"
                placeholderTextColor={D.inkGhost}
              />
            </View>

            <View style={S.btnRow}>
              <TouchableOpacity style={S.cancelBtn} onPress={() => setShowTruckModal(false)}>
                <Text style={S.cancelTxt}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={S.saveBtn}
                onPress={() => {
                  updateConfig({ truckLocation });
                  setShowTruckModal(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <LinearGradient colors={[D.heroA, D.heroAccent]} style={S.saveBtnInner}>
                  <Feather name="check" size={15} color="#fff" />
                  <Text style={S.saveTxt}>{t('common.save')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Language sheet ─────────────────────────────────────────────────── */}
      <Modal visible={showLanguageSheet} transparent animationType="slide" onRequestClose={() => setShowLanguageSheet(false)}>
        <View style={S.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowLanguageSheet(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </Pressable>
          <View style={S.sheet}>
            <View style={S.handle} />
            <View style={S.sheetHeaderRow}>
              <Text style={S.sheetTitle}>{t('settings.language')}</Text>
              <TouchableOpacity style={S.sheetClose} onPress={() => setShowLanguageSheet(false)}>
                <Feather name="x" size={16} color={D.inkSoft} />
              </TouchableOpacity>
            </View>

            <Text style={S.sectionLblSheet}>
              {t('settings.selectLanguage') || 'Sélectionner une langue'}
            </Text>

            <View style={S.card}>
              {languages.map((lang, idx) => {
                const isActive = i18n.language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[S.langRow, idx < languages.length - 1 && S.menuRowBorder, isActive && S.langRowActive]}
                    onPress={() => handleLanguageChange(lang.code)}
                    activeOpacity={0.78}
                  >
                    {isActive && <View style={S.langAccent} />}
                    <Text style={S.langFlag}>{lang.flag}</Text>
                    <Text style={[S.langLabel, isActive && { color: D.heroAccent }]}>{lang.label}</Text>
                    <View style={{ flex: 1 }} />
                    {isActive && (
                      <View style={S.checkBadge}>
                        <Feather name="check" size={11} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={S.applyBtn} onPress={() => setShowLanguageSheet(false)}>
              <LinearGradient colors={[D.heroA, D.heroAccent]} style={S.applyInner}>
                <Text style={S.applyTxt}>{t('common.close')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex: 1 },

  // Hero
  hero: { overflow: 'hidden' },
  blob1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: D.heroAccent, opacity: 0.1, top: -60, right: -60 },
  blob2: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: D.heroGlow, opacity: 0.07, bottom: 10, left: -30 },

  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, gap: 8 },
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  countChipTxt: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  // Content
  content: { padding: 14 },

  sectionLbl: { color: D.inkSoft, fontSize: 10, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 18, marginLeft: 2 },
  sectionLblSheet: { color: D.inkSoft, fontSize: 10, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },

  card: { backgroundColor: D.card, borderRadius: 18, borderWidth: 1, borderColor: D.border, overflow: 'hidden', elevation: 2, shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },

  // Menu / toggle rows
  menuRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: D.border },
  menuIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuBody: { flex: 1 },
  menuLabel: { color: D.ink, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  menuDesc: { color: D.inkSoft, fontSize: 12, marginTop: 2 },

  // Modals
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: D.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 36, borderTopWidth: 1, borderColor: D.border },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: D.border, alignSelf: 'center', marginBottom: 20 },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { color: D.ink, fontSize: 18, fontFamily: 'Inter_700Bold' },
  sheetClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: D.bg, justifyContent: 'center', alignItems: 'center' },

  // Input
  inputLabel: { color: D.inkSoft, fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: D.bg, borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: D.border, marginBottom: 20 },
  input: { flex: 1, color: D.ink, fontSize: 14, fontFamily: 'Inter_400Regular' },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 14, backgroundColor: D.bg, borderWidth: 1, borderColor: D.border, justifyContent: 'center', alignItems: 'center' },
  cancelTxt: { color: D.inkSoft, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50 },
  saveTxt: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  applyBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 20 },
  applyInner: { height: 50, justifyContent: 'center', alignItems: 'center' },
  applyTxt: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },

  // Language sheet
  langRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, overflow: 'hidden' },
  langRowActive: { backgroundColor: D.violetBg },
  langAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: D.heroAccent },
  langFlag: { fontSize: 24 },
  langLabel: { color: D.ink, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  checkBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: D.emerald, justifyContent: 'center', alignItems: 'center' },
});