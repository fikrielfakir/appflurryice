import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import Colors from '@/constants/colors';

const C = Colors.dark;

export default function SyncSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isSyncing, syncData, lastSyncTime } = useApp();

  const handleSync = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await syncData();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Succès', 'Données synchronisées avec Supabase');
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Jamais synchronisé';
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Synchronisation</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>État de synchronisation</Text>
          
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Feather 
                name={isSyncing ? "refresh-cw" : "cloud"} 
                size={24} 
                color={isSyncing ? C.warning : C.gold}
              />
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>
                  {isSyncing ? 'Synchronisation en cours...' : 'Connecté à Supabase'}
                </Text>
                <Text style={styles.statusValue}>
                  {formatLastSync(lastSyncTime)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Données à synchroniser</Text>
          
          <View style={styles.dataCard}>
            <View style={styles.dataItem}>
              <Feather name="package" size={20} color={C.textSecondary} />
              <Text style={styles.dataLabel}>Produits</Text>
              <Text style={styles.dataValue}>Tableau: products</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.dataItem}>
              <Feather name="users" size={20} color={C.textSecondary} />
              <Text style={styles.dataLabel}>Contacts</Text>
              <Text style={styles.dataValue}>Tableau: contacts</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.dataItem}>
              <Feather name="shopping-bag" size={20} color={C.textSecondary} />
              <Text style={styles.dataLabel}>Ventes</Text>
              <Text style={styles.dataValue}>Tableau: sales</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
          onPress={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="refresh-cw" size={20} color="#fff" />
          )}
          <Text style={styles.syncBtnText}>
            {isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Feather name="info" size={16} color={C.textMuted} />
            <Text style={styles.infoText}>
              La synchronisation récupère les données depuis Supabase et les enregistre localement
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="info" size={16} color={C.textMuted} />
            <Text style={styles.infoText}>
              Les nouvelles ventes sont automatiquement envoyées vers Supabase
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  statusValue: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },
  dataCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dataLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  dataValue: {
    fontSize: 12,
    color: C.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
  },
  syncBtnDisabled: {
    opacity: 0.7,
  },
  syncBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  infoSection: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 18,
  },
});
