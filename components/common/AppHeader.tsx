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

// Icon imports — using expo icons for better compatibility
import { Ionicons } from '@expo/vector-icons';

interface AppHeaderProps {
  /** Screen title displayed in center. If undefined and showLogo=true, shows logo. */
  title?: string;
  /** Show Flurry Ice logo instead of title text */
  showLogo?: boolean;
  /** Show hamburger menu button on the left */
  showMenu?: boolean;
  /** Show back arrow on the left */
  showBack?: boolean;
  /** Callback for menu button press */
  onMenuPress?: () => void;
  /** Callback for back button press */
  onBackPress?: () => void;
  /** Right side: up to 2 icon buttons */
  rightActions?: React.ReactNode;
  /** Dark (navy) header. White header is default. */
  dark?: boolean;
  /** Override container style (avoid overriding height) */
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
  const topPad = Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight ?? 0;

  const iconColor  = dark ? Colors.textOnDark  : Colors.primary;
  const titleColor = dark ? Colors.textOnDark  : Colors.textPrimary;
  const bgColor    = dark ? Colors.primary      : Colors.card;

  return (
    <View
      style={[
        styles.wrapper,
        { paddingTop: topPad, backgroundColor: bgColor },
        dark ? {} : Shadow.header,
        style,
      ]}
    >
      <View style={styles.bar}>
        {/* LEFT — Menu or Back */}
        <View style={styles.side}>
          {showMenu && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onMenuPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="menu-outline" size={IconSize.md} color={iconColor} />
            </TouchableOpacity>
          )}
          {showBack && !showMenu && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onBackPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back-outline" size={IconSize.md} color={iconColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* CENTER — Logo or Title */}
        <View style={styles.center}>
          {showLogo ? (
            <Image
              source={require('@/assets/flurry-logo.png')}
              style={[styles.logo, dark && styles.logoLight]}
              resizeMode="contain"
            />
          ) : title ? (
            <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>

        {/* RIGHT — Custom Actions */}
        <View style={styles.side}>
          <View style={styles.rightRow}>
            {rightActions}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Header Icon Button (use inside rightActions) ──────────────────────────
interface HeaderIconBtnProps {
  icon: React.ReactNode;
  onPress?: () => void;
  badge?: number; // optional notification dot
  dark?: boolean;
}

export function HeaderIconBtn({ icon, onPress, badge, dark }: HeaderIconBtnProps) {
  return (
    <TouchableOpacity
      style={styles.iconBtn}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 100,
  },
  bar: {
    height:         HeaderHeight.bar,
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: Spacing.md,
  },
  side: {
    minWidth: 80,
    alignItems:     'center',
    justifyContent: 'center',
  },
  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  title: {
    fontSize:   FontSize.lg,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.2,
  },
  logo: {
    height: 32,
    width:  120,
  },
  logoLight: {
    tintColor: Colors.white,
  },
  rightRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.xs,
  },
  iconBtn: {
    width:           TouchTarget.min,
    height:          TouchTarget.min,
    alignItems:      'center',
    justifyContent:  'center',
    borderRadius:    Spacing.md,
  },
  badge: {
    position:        'absolute',
    top:             6,
    right:           6,
    minWidth:        16,
    height:          16,
    borderRadius:    8,
    backgroundColor: Colors.danger,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color:      Colors.white,
    fontSize:   9,
    fontWeight: FontWeight.bold,
  },
});
