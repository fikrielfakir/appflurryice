import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Image,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { HeaderHeight, Shadow, Spacing, TouchTarget, IconSize } from '@/constants/layout';
import { Ionicons } from '@expo/vector-icons';

// ── Design tokens — unified with Dashboard / Reports / Sales / Products ───────
const D = {
  heroA:      "#1C1C2E",
  heroB:      "#2D2B55",
  heroAccent: "#6C63FF",
  heroGlow:   "#A78BFA",
  ink:        "#111118",
  inkSoft:    "#8B8AA5",
  surface:    "#FFFFFF",
  border:     "#ECEAE4",
  danger:     "#F04E6A",
};

interface AppHeaderProps {
  title?: string;
  showLogo?: boolean;
  showMenu?: boolean;
  showBack?: boolean;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
  dark?: boolean;
  style?: ViewStyle;
}

export function AppHeader({
  title,
  showLogo = false,
  showMenu = false,
  showBack = false,
  onMenuPress,
  onBackPress,
  rightActions,
  dark = false,
  style,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight ?? 0);

  // Dark mode: transparent (sits inside gradient hero)
  // Light mode: white surface with subtle border
  const wrapperBg   = dark ? 'transparent' : D.surface;
  const iconColor   = dark ? 'rgba(255,255,255,0.9)' : D.ink;
  const titleColor  = dark ? '#FFFFFF' : D.ink;

  return (
    <View
      style={[
        S.wrapper,
        { paddingTop: topPad, backgroundColor: wrapperBg },
        !dark && S.lightShadow,
        style,
      ]}
    >
      <View style={S.bar}>

        {/* LEFT */}
        <View style={S.side}>
          {showMenu && (
            <TouchableOpacity
              style={[S.iconBtn, dark ? S.iconBtnDark : S.iconBtnLight]}
              onPress={onMenuPress}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="menu-outline" size={20} color={iconColor} />
            </TouchableOpacity>
          )}
          {showBack && !showMenu && (
            <TouchableOpacity
              style={[S.iconBtn, dark ? S.iconBtnDark : S.iconBtnLight]}
              onPress={onBackPress}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back-outline" size={20} color={iconColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* CENTER */}
        <View style={S.center}>
          {showLogo ? (
            <Image
              source={require('@/assets/flurry-logo.png')}
              style={[S.logo, dark && S.logoTint]}
              resizeMode="contain"
            />
          ) : title ? (
            <Text style={[S.title, { color: titleColor }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>

        {/* RIGHT */}
        <View style={S.side}>
          <View style={S.rightRow}>
            {rightActions}
          </View>
        </View>

      </View>
    </View>
  );
}

// ── HeaderIconBtn ─────────────────────────────────────────────────────────────
interface HeaderIconBtnProps {
  icon: React.ReactNode;
  onPress?: () => void;
  badge?: number;
  dark?: boolean;
}

export function HeaderIconBtn({ icon, onPress, badge, dark }: HeaderIconBtnProps) {
  return (
    <TouchableOpacity
      style={[S.iconBtn, dark ? S.iconBtnDark : S.iconBtnLight]}
      onPress={onPress}
      activeOpacity={0.75}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <View style={S.badge}>
          <Text style={S.badgeTxt}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  wrapper: {
    zIndex: 100,
  },

  // Subtle bottom border + shadow for light headers
  lightShadow: {
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    shadowColor: "rgba(17,17,24,0.06)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },

  bar: {
    height: HeaderHeight.bar,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  side: {
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  title: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.3,
  },

  logo: {
    height: 32,
    width: 110,
  },
  logoTint: {
    tintColor: '#FFFFFF',
  },

  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },

  // Icon button — dark variant (inside gradient hero)
  iconBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  // Icon button — light variant (white header)
  iconBtnLight: {
    backgroundColor: '#F7F6F2',
    borderWidth: 1,
    borderColor: D.border,
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: D.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeTxt: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
});