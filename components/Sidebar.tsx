import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import Colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = Colors.dark;

const MENU_ITEMS = [
  { title: 'Expenses', icon: 'dollar-sign', route: '/(tabs)/expenses' },
  { title: 'Reports', icon: 'bar-chart-2', route: '/(tabs)/reports' },
  { title: 'Contacts', icon: 'users', route: '/(tabs)/contacts' },
];

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.drawer, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Menu</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color={C.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.menuList}>
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.route;
            return (
              <TouchableOpacity
                key={item.route}
                style={[styles.menuItem, isActive && styles.activeItem]}
                onPress={() => {
                  router.push(item.route as any);
                  onClose();
                }}
              >
                <Feather name={item.icon as any} size={20} color={isActive ? C.gold : C.textSecondary} />
                <Text style={[styles.menuText, isActive && styles.activeText]}>{item.title}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    width: 280,
    backgroundColor: C.card,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 15,
  },
  activeItem: {
    backgroundColor: C.gold + '15',
    borderLeftWidth: 3,
    borderLeftColor: C.gold,
  },
  menuText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: C.textSecondary,
  },
  activeText: {
    color: C.gold,
  },
});
