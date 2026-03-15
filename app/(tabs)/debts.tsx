import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Platform, TextInput, Modal, Alert, KeyboardAvoidingView, Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, Sale } from "@/context/AppContext";
import { AppHeader } from "@/components/common/AppHeader";
import { useTranslation } from "react-i18next";
import { D } from "@/constants/theme";
import { usePrintInvoice, SettlementData } from "@/hooks/usePrintInvoice";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface DebtorGroup {
  customerName: string;
  customerPhone: string;
  totalDue: number;
  totalPaid: number;
  totalAmount: number;
  invoiceCount: number;
  sales: Sale[];
}

const AVATAR_COLORS = [D.heroAccent, D.emerald, D.blue, D.amber, D.rose, D.violet];

export default function DebtsScreen() {
  const insets = useSafeAreaInsets();
  const { sales, setIsSidebarOpen, userProfile, updateSalePayment, addDebtSettlement, debtSettlements } = useApp();
  const { printSettlement } = usePrintInvoice();
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<DebtorGroup | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [selectedSaleForSettlement, setSelectedSaleForSettlement] = useState<Sale | null>(null);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const debtors = useMemo<DebtorGroup[]>(() => {
    const map = new Map<string, DebtorGroup>();
    for (const sale of sales) {
      if (sale.status === "paid") continue;
      const due = sale.amount - sale.paid;
      if (due <= 0) continue;
      const key = sale.customerName;
      if (!map.has(key)) {
        map.set(key, {
          customerName: sale.customerName,
          customerPhone: sale.customerPhone ?? "",
          totalDue: 0,
          totalPaid: 0,
          totalAmount: 0,
          invoiceCount: 0,
          sales: [],
        });
      }
      const g = map.get(key)!;
      g.totalDue += due;
      g.totalPaid += sale.paid;
      g.totalAmount += sale.amount;
      g.invoiceCount += 1;
      g.sales.push(sale);
    }
    return Array.from(map.values()).sort((a, b) => b.totalDue - a.totalDue);
  }, [sales]);

  const filtered = useMemo(() => {
    if (!search.trim()) return debtors;
    const q = search.toLowerCase();
    return debtors.filter(
      d =>
        d.customerName.toLowerCase().includes(q) ||
        d.customerPhone.includes(q),
    );
  }, [debtors, search]);

  const totalAllDue = useMemo(
    () => debtors.reduce((s, d) => s + d.totalDue, 0),
    [debtors],
  );

  function openCustomer(item: DebtorGroup) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCustomer(item);
  }

  function goBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCustomer(null);
  }

  // Settlement Modal - rendered at root level
  const renderSettlementModal = () => (
    <Modal visible={showSettlementModal} transparent animationType="slide" onRequestClose={closeSettlement}>
      <Pressable style={S.modalBackdrop} onPress={closeSettlement} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={S.modalContainer}>
        <View style={S.modalContent}>
          <View style={S.modalHandle} />
          
          <View style={S.modalHeader}>
            <Text style={S.modalTitle}>{t("debts.settlement") || "Règlement"}</Text>
            <TouchableOpacity onPress={closeSettlement}>
              <Feather name="x" size={20} color={D.ink} />
            </TouchableOpacity>
          </View>

          {showPreview && selectedSaleForSettlement ? (
            /* Preview Mode */
            <View style={S.previewContainer}>
              {(() => {
                const amount = parseFloat(settlementAmount) || 0;
                const remaining = selectedSaleForSettlement.amount - selectedSaleForSettlement.paid - amount;
                const isFullPayment = remaining <= 0;
                const isPartial = amount > 0 && !isFullPayment;
                
                return (
                  <>
                    <Text style={S.previewTitle}>
                      {amount === 0 
                        ? t("debts.noPaySettlement") || "REGLEMENT NO PAYE"
                        : isFullPayment
                          ? t("debts.fullSettlement") || "REGLEMENT COMPLET"
                          : t("debts.partialSettlement") || "REGLEMENT PARTIEL"}
                    </Text>
                    <View style={S.previewLine} />
                    <Text style={S.previewRow}>Client  : {selectedSaleForSettlement.customerName}</Text>
                    <Text style={S.previewRow}>Tel     : {selectedSaleForSettlement.customerPhone || "-"}</Text>
                    <Text style={S.previewRow}>Vendeur : {selectedSaleForSettlement.vendeur || userProfile?.name || "-"}</Text>
                    <Text style={S.previewRow}>Date    : {formatDate(selectedSaleForSettlement.date)}</Text>
                    <Text style={S.previewRow}>Facture : #{selectedSaleForSettlement.invoiceNumber}</Text>
                    <View style={S.previewLine} />
                    <Text style={S.previewRow}>Total Facture : {fmt(selectedSaleForSettlement.amount).padStart(12)} MAD</Text>
                    <Text style={S.previewRow}>Montant Paye  : {fmt(amount).padStart(12)} MAD</Text>
                    <View style={S.previewLine} />
                    <Text style={[S.previewRow, S.previewBold]}>RESTE A PAYER : {fmt(remaining > 0 ? remaining : 0).padStart(12)} MAD</Text>
                    <View style={S.previewLine} />
                    <Text style={S.previewStatus}>
                      Statut : {amount === 0 
                        ? t("debts.noPayeStatus") || "PAIEMENT NO PAYE"
                        : isFullPayment
                          ? t("debts.fullPayeStatus") || "PAIEMENT COMPLET"
                          : t("debts.partialStatus") || "PAIEMENT PARTIEL"}
                    </Text>
                    <View style={S.previewLine} />
                    <Text style={S.previewFooter}>{t("debts.thankYou") || "Merci pour votre confiance"}</Text>
                  </>
                );
              })()}
            </View>
          ) : (
            /* Input Mode */
            <View style={S.inputContainer}>
              <Text style={S.inputLabel}>{t("debts.selectSale") || "Facture"}</Text>
              <View style={S.saleInfoBox}>
                <Text style={S.saleInfoRow}>
                  <Text style={S.saleInfoLabel}>#{selectedSaleForSettlement?.invoiceNumber}</Text>
                  <Text style={S.saleInfoDue}> - {t("debts.remaining")}: {fmt((selectedSaleForSettlement?.amount || 0) - (selectedSaleForSettlement?.paid || 0))} MAD</Text>
                </Text>
              </View>

              <Text style={S.inputLabel}>{t("debts.enterAmount") || "Montant à payer"}</Text>
              <View style={S.inputWrapper}>
                <Feather name="dollar-sign" size={18} color={D.inkSoft} />
                <TextInput
                  style={S.input}
                  value={settlementAmount}
                  onChangeText={handleSettlementAmountChange}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={D.inkGhost}
                />
                <Text style={S.inputSuffix}>MAD</Text>
              </View>

              <TouchableOpacity
                style={S.quickAmountsRow}
              >
                {[10, 50, 100, 200].map(amt => (
                  <TouchableOpacity
                    key={amt}
                    style={S.quickAmountBtn}
                    onPress={() => setSettlementAmount(String(amt))}
                  >
                    <Text style={S.quickAmountTxt}>{amt}</Text>
                  </TouchableOpacity>
                ))}
              </TouchableOpacity>

              <TouchableOpacity
                style={S.quickAmountsRow}
              >
                <TouchableOpacity
                  style={[S.quickAmountBtn, S.quickAmountBtnFull]}
                  onPress={() => {
                    if (selectedSaleForSettlement) {
                      const remaining = selectedSaleForSettlement.amount - selectedSaleForSettlement.paid;
                      setSettlementAmount(String(remaining));
                    }
                  }}
                >
                  <Text style={S.quickAmountTxt}>{t("debts.payFull") || "Payer total"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.quickAmountBtn, S.quickAmountBtnFull]}
                  onPress={() => setSettlementAmount("0")}
                >
                  <Text style={S.quickAmountTxt}>{t("debts.noPayment") || "Non payer"}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          )}

          <View style={S.modalActions}>
            {showPreview ? (
              <>
                <TouchableOpacity style={S.cancelBtn} onPress={() => setShowPreview(false)}>
                  <Text style={S.cancelBtnTxt}>{t("common.back") || "Retour"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.confirmBtn} onPress={saveSettlement}>
                  <Text style={S.confirmBtnTxt}>{t("common.confirm") || "Confirmer"}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={S.confirmBtn} onPress={confirmSettlement}>
                <Text style={S.confirmBtnTxt}>{t("debts.preview") || "Aperçu"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const openSettlement = useCallback((sale: Sale) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedSaleForSettlement(sale);
    setSettlementAmount("");
    setShowPreview(false);
    setShowSettlementModal(true);
  }, []);

  const closeSettlement = useCallback(() => {
    setShowSettlementModal(false);
    setSelectedSaleForSettlement(null);
    setSettlementAmount("");
    setShowPreview(false);
  }, []);

  const handleSettlementAmountChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    setSettlementAmount(cleaned);
  }, []);

  const confirmSettlement = useCallback(() => {
    const amount = parseFloat(settlementAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t("common.error"), t("debts.invalidAmount") || "Montant invalide");
      return;
    }
    if (selectedSaleForSettlement) {
      const remaining = selectedSaleForSettlement.amount - selectedSaleForSettlement.paid;
      if (amount > remaining) {
        Alert.alert(t("common.error"), t("debts.amountExceeds") || "Le montant dépasse le reste à payer");
        return;
      }
    }
    setShowPreview(true);
  }, [settlementAmount, selectedSaleForSettlement, t]);

  const saveSettlement = useCallback(async () => {
    if (!selectedSaleForSettlement) return;
    const amount = parseFloat(settlementAmount);
    if (isNaN(amount) || amount < 0) return;

    const remaining = selectedSaleForSettlement.amount - selectedSaleForSettlement.paid - amount;
    const isFullPayment = remaining <= 0;
    const isPartial = amount > 0 && !isFullPayment;

    const settlementData: SettlementData = {
      customerName: selectedSaleForSettlement.customerName,
      customerPhone: selectedSaleForSettlement.customerPhone || '',
      vendorName: selectedSaleForSettlement.vendeur || userProfile?.name || '',
      date: selectedSaleForSettlement.date,
      invoiceNumber: selectedSaleForSettlement.invoiceNumber,
      totalAmount: selectedSaleForSettlement.amount,
      paidAmount: amount,
      remainingAmount: remaining > 0 ? remaining : 0,
      isPartial: isPartial,
    };

    // Save to local database
    addDebtSettlement({
      saleId: selectedSaleForSettlement.id,
      customerName: selectedSaleForSettlement.customerName,
      customerPhone: selectedSaleForSettlement.customerPhone || '',
      vendorName: selectedSaleForSettlement.vendeur || userProfile?.name || '',
      date: selectedSaleForSettlement.date,
      invoiceNumber: selectedSaleForSettlement.invoiceNumber,
      totalAmount: selectedSaleForSettlement.amount,
      paidAmount: amount,
      remainingAmount: remaining > 0 ? remaining : 0,
      isPartial: isPartial,
    });

    updateSalePayment(selectedSaleForSettlement.id, amount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Print settlement receipt
    try {
      await printSettlement(settlementData);
    } catch (e) {
      console.log('Print failed, but payment saved');
    }
    
    closeSettlement();
  }, [selectedSaleForSettlement, settlementAmount, updateSalePayment, addDebtSettlement, closeSettlement, printSettlement, userProfile]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-MA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (selectedCustomer) {
    return (
      <View style={{ flex: 1, backgroundColor: D.bg }}>
        <View style={S.hero}>
          <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
          <View style={S.blob1} pointerEvents="none" />
          <View style={S.blob2} pointerEvents="none" />

          <AppHeader
            dark
            showBack
            onBackPress={goBack}
            rightActions={
              <View style={S.heroDuePill}>
                <Text style={S.heroDuePillLabel}>{t("debts.totalDue")}</Text>
                <Text style={S.heroDuePillAmount}>{fmt(selectedCustomer.totalDue)}</Text>
              </View>
            }
          />

          <View style={S.detailCustomerInfo}>
            <Text style={S.detailHeroName} numberOfLines={1}>
              {selectedCustomer.customerName}
            </Text>
            {selectedCustomer.customerPhone ? (
              <Text style={S.detailHeroPhone}>{selectedCustomer.customerPhone}</Text>
            ) : null}
          </View>
        </View>

        <View style={S.detailChipsRow}>
          <SummaryChip
            label={t("debts.invoices")}
            value={String(selectedCustomer.invoiceCount)}
            color={D.violet}
          />
          <SummaryChip
            label={t("debts.totalAmount")}
            value={fmt(selectedCustomer.totalAmount)}
            color={D.blue}
          />
          <SummaryChip
            label={t("debts.paid")}
            value={fmt(selectedCustomer.totalPaid)}
            color={D.emerald}
          />
        </View>

        <FlatList
          data={selectedCustomer.sales}
          keyExtractor={s => s.id}
          contentContainerStyle={S.detailList}
          renderItem={({ item }) => {
            const due = item.amount - item.paid;
            const isPartial = item.status === "partial";
            const accentColor = isPartial ? D.amber : D.rose;
            const accentBg = isPartial ? D.amberBg : D.roseBg;

            return (
              <View style={S.invoiceCard}>
                <View style={[S.invoiceStrip, { backgroundColor: accentColor }]} />
                <View style={S.invoiceBody}>
                  <View style={S.invoiceTopRow}>
                    <Text style={S.invoiceNum}>#{item.invoiceNumber}</Text>
                    <View style={[S.statusBadge, { backgroundColor: accentBg }]}>
                      <Text style={[S.statusBadgeTxt, { color: accentColor }]}>
                        {isPartial ? t("sales.partialStatus") : t("sales.dueStatus")}
                      </Text>
                    </View>
                  </View>

                  <Text style={S.invoiceDate}>
                    {new Date(item.date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>

                  <View style={S.dividerThin} />

                  <AmountLine label={t("debts.totalAmount")} value={fmt(item.amount)} color={D.inkMid} />
                  <AmountLine label={t("debts.paid")} value={fmt(item.paid)} color={D.emerald} />
                  <AmountLine
                    label={t("debts.remaining")}
                    value={fmt(due)}
                    color={D.rose}
                    bold
                  />
                  
                  <TouchableOpacity
                    style={S.settleBtn}
                    onPress={() => openSettlement(item)}
                    activeOpacity={0.8}
                  >
                    <Feather name="dollar-sign" size={14} color="#fff" />
                    <Text style={S.settleBtnTxt}>{t("debts.settle") || "Régler"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
        {renderSettlementModal()}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: D.bg }}>
      {/* Hero with gradient */}
      <View style={S.hero}>
        <LinearGradient colors={[D.heroA, D.heroB]} style={StyleSheet.absoluteFill} />
        <View style={S.blob1} pointerEvents="none" />
        <View style={S.blob2} pointerEvents="none" />

        <AppHeader
          title={t("debts.title")}
          dark
          showMenu
          onMenuPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsSidebarOpen(true);
          }}
        />

        <View style={S.summaryInner}>
          <View style={S.summaryIconWrap}>
            <Feather name="alert-circle" size={22} color={D.rose} />
          </View>
          <View>
            <Text style={S.summaryLabel}>{t("debts.totalOutstanding")}</Text>
            <Text style={S.summaryAmount}>{fmt(totalAllDue)}</Text>
          </View>
        </View>
        <Text style={S.summaryMeta}>
          {debtors.length} {t("debts.customersWithDue")}
        </Text>
      </View>

      <View style={S.searchWrap}>
        <View style={S.searchBox}>
          <Feather name="search" size={15} color={D.inkSoft} style={{ marginRight: 8 }} />
          <TextInput
            style={S.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t("common.search")}
            placeholderTextColor={D.inkGhost}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={D.inkSoft} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Toggle */}
      <View style={S.tabToggle}>
        <TouchableOpacity
          style={[S.tabBtn, !showHistory && S.tabBtnActive]}
          onPress={() => setShowHistory(false)}
        >
          <Text style={[S.tabBtnTxt, !showHistory && S.tabBtnTxtActive]}>
            {t("debts.title")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[S.tabBtn, showHistory && S.tabBtnActive]}
          onPress={() => setShowHistory(true)}
        >
          <Text style={[S.tabBtnTxt, showHistory && S.tabBtnTxtActive]}>
            {t("debts.settlementHistory")}
          </Text>
        </TouchableOpacity>
      </View>

      {showHistory ? (
        /* Settlement History */
        <FlatList
          data={debtSettlements}
          keyExtractor={item => item.id}
          contentContainerStyle={[S.list, { paddingBottom: insets.bottom + 80 }]}
          ListEmptyComponent={
            <View style={S.empty}>
              <Feather name="file-text" size={52} color={D.inkGhost} />
              <Text style={S.emptyTitle}>{t("debts.noSettlements")}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={S.historyCard}>
              <View style={S.historyHeader}>
                <Text style={S.historyInvoice}>#{item.invoiceNumber}</Text>
                <View style={[item.isPartial ? S.statusPartial : S.statusFull]}>
                  <Text style={[item.isPartial ? S.statusTxtPartial : S.statusTxtFull]}>
                    {item.isPartial ? "PARTIEL" : "COMPLET"}
                  </Text>
                </View>
              </View>
              <Text style={S.historyClient}>{item.customerName}</Text>
              <Text style={S.historyDate}>
                {new Date(item.settlementDate).toLocaleDateString("fr-MA", {
                  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                })}
              </Text>
              <View style={S.historyAmountRow}>
                <Text style={S.historyAmountLabel}>Montant payé:</Text>
                <Text style={S.historyAmount}>{fmt(item.paidAmount)} MAD</Text>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={d => d.customerName}
          contentContainerStyle={[S.list, { paddingBottom: insets.bottom + 80 }]}
        ListEmptyComponent={
          <View style={S.empty}>
            <Feather name="check-circle" size={52} color={D.emerald} />
            <Text style={S.emptyTitle}>{t("debts.allClear")}</Text>
            <Text style={S.emptySub}>{t("debts.allClearSub")}</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const initials = item.customerName
            .split(" ")
            .map(w => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];

          return (
            <TouchableOpacity
              style={S.card}
              onPress={() => openCustomer(item)}
              activeOpacity={0.82}
            >
              <View style={[S.avatar, { backgroundColor: avatarColor + "22" }]}>
                <Text style={[S.avatarTxt, { color: avatarColor }]}>{initials}</Text>
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <Text style={S.customerName} numberOfLines={1}>
                  {item.customerName}
                </Text>
                {item.customerPhone ? (
                  <Text style={S.customerPhone}>{item.customerPhone}</Text>
                ) : null}
                <Text style={S.invoiceHint}>
                  {item.invoiceCount} {t("debts.unpaidInvoices")}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={S.dueAmount}>{fmt(item.totalDue)}</Text>
                <Feather name="chevron-right" size={15} color={D.inkGhost} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
      )}

      {/* Settlement Modal */}
      <Modal visible={showSettlementModal} transparent animationType="slide" onRequestClose={closeSettlement}>
        <Pressable style={S.modalBackdrop} onPress={closeSettlement} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={S.modalContainer}>
          <View style={S.modalContent}>
            <View style={S.modalHandle} />
            
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>{t("debts.settlement") || "Règlement"}</Text>
              <TouchableOpacity onPress={closeSettlement}>
                <Feather name="x" size={20} color={D.ink} />
              </TouchableOpacity>
            </View>

            {showPreview && selectedSaleForSettlement ? (
              /* Preview Mode */
              <View style={S.previewContainer}>
                {(() => {
                  const amount = parseFloat(settlementAmount) || 0;
                  const remaining = selectedSaleForSettlement.amount - selectedSaleForSettlement.paid - amount;
                  const isFullPayment = remaining <= 0;
                  const isPartial = amount > 0 && !isFullPayment;
                  
                  return (
                    <>
                      <Text style={S.previewTitle}>
                        {amount === 0 
                          ? t("debts.noPaySettlement") || "REGLEMENT NO PAYE"
                          : isFullPayment
                            ? t("debts.fullSettlement") || "REGLEMENT COMPLET"
                            : t("debts.partialSettlement") || "REGLEMENT PARTIEL"}
                      </Text>
                      <View style={S.previewLine} />
                      <Text style={S.previewRow}>Client  : {selectedSaleForSettlement.customerName}</Text>
                      <Text style={S.previewRow}>Tel     : {selectedSaleForSettlement.customerPhone || "-"}</Text>
                      <Text style={S.previewRow}>Vendeur : {selectedSaleForSettlement.vendeur || userProfile?.name || "-"}</Text>
                      <Text style={S.previewRow}>Date    : {formatDate(selectedSaleForSettlement.date)}</Text>
                      <Text style={S.previewRow}>Facture : #{selectedSaleForSettlement.invoiceNumber}</Text>
                      <View style={S.previewLine} />
                      <Text style={S.previewRow}>Total Facture : {fmt(selectedSaleForSettlement.amount).padStart(12)} MAD</Text>
                      <Text style={S.previewRow}>Montant Paye  : {fmt(amount).padStart(12)} MAD</Text>
                      <View style={S.previewLine} />
                      <Text style={[S.previewRow, S.previewBold]}>RESTE A PAYER : {fmt(remaining > 0 ? remaining : 0).padStart(12)} MAD</Text>
                      <View style={S.previewLine} />
                      <Text style={S.previewStatus}>
                        Statut : {amount === 0 
                          ? t("debts.noPayeStatus") || "PAIEMENT NO PAYE"
                          : isFullPayment
                            ? t("debts.fullPayeStatus") || "PAIEMENT COMPLET"
                            : t("debts.partialStatus") || "PAIEMENT PARTIEL"}
                      </Text>
                      <View style={S.previewLine} />
                      <Text style={S.previewFooter}>{t("debts.thankYou") || "Merci pour votre confiance"}</Text>
                    </>
                  );
                })()}
              </View>
            ) : (
              /* Input Mode */
              <View style={S.inputContainer}>
                <Text style={S.inputLabel}>{t("debts.selectSale") || "Facture"}</Text>
                <View style={S.saleInfoBox}>
                  <Text style={S.saleInfoRow}>
                    <Text style={S.saleInfoLabel}>#{selectedSaleForSettlement?.invoiceNumber}</Text>
                    <Text style={S.saleInfoDue}> - {t("debts.remaining")}: {fmt((selectedSaleForSettlement?.amount || 0) - (selectedSaleForSettlement?.paid || 0))} MAD</Text>
                  </Text>
                </View>

                <Text style={S.inputLabel}>{t("debts.enterAmount") || "Montant à payer"}</Text>
                <View style={S.inputWrapper}>
                  <Feather name="dollar-sign" size={18} color={D.inkSoft} />
                  <TextInput
                    style={S.input}
                    value={settlementAmount}
                    onChangeText={handleSettlementAmountChange}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor={D.inkGhost}
                  />
                  <Text style={S.inputSuffix}>MAD</Text>
                </View>

                <TouchableOpacity
                  style={S.quickAmountsRow}
                >
                  {[10, 50, 100, 200].map(amt => (
                    <TouchableOpacity
                      key={amt}
                      style={S.quickAmountBtn}
                      onPress={() => setSettlementAmount(String(amt))}
                    >
                      <Text style={S.quickAmountTxt}>{amt}</Text>
                    </TouchableOpacity>
                  ))}
                </TouchableOpacity>

                <TouchableOpacity
                  style={S.quickAmountsRow}
                >
                  <TouchableOpacity
                    style={[S.quickAmountBtn, S.quickAmountBtnFull]}
                    onPress={() => {
                      if (selectedSaleForSettlement) {
                        const remaining = selectedSaleForSettlement.amount - selectedSaleForSettlement.paid;
                        setSettlementAmount(String(remaining));
                      }
                    }}
                  >
                    <Text style={S.quickAmountTxt}>{t("debts.payFull") || "Payer total"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[S.quickAmountBtn, S.quickAmountBtnFull]}
                    onPress={() => setSettlementAmount("0")}
                  >
                    <Text style={S.quickAmountTxt}>{t("debts.noPayment") || "Non payer"}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            )}

            <View style={S.modalActions}>
              {showPreview ? (
                <>
                  <TouchableOpacity style={S.cancelBtn} onPress={() => setShowPreview(false)}>
                    <Text style={S.cancelBtnTxt}>{t("common.back") || "Retour"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.confirmBtn} onPress={saveSettlement}>
                    <Text style={S.confirmBtnTxt}>{t("common.confirm") || "Confirmer"}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={S.confirmBtn} onPress={confirmSettlement}>
                  <Text style={S.confirmBtnTxt}>{t("debts.preview") || "Aperçu"}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SummaryChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[S.chip, { borderColor: color + "40", backgroundColor: color + "12" }]}>
      <Text style={[S.chipLabel, { color }]}>{label}</Text>
      <Text style={[S.chipValue, { color }]}>{value}</Text>
    </View>
  );
}

function AmountLine({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
}) {
  return (
    <View style={S.amountLine}>
      <Text style={S.amountLineLabel}>{label}</Text>
      <Text style={[S.amountLineValue, { color }, bold ? { fontFamily: "Inter_700Bold" } : {}]}>
        {value}
      </Text>
    </View>
  );
}

const S = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  blob1: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: D.heroAccent, opacity: 0.08, top: -60, right: -60 },
  blob2: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: D.heroGlow, opacity: 0.06, bottom: 20, left: -40 },

  summaryInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(240,78,106,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  summaryAmount: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  summaryMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    marginTop: 6,
  },

  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: D.ink,
  },

  list: {
    padding: 16,
    gap: 10,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: D.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: D.border,
    marginBottom: 10,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTxt: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  customerName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: D.ink,
  },
  customerPhone: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: D.inkSoft,
  },
  invoiceHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: D.inkGhost,
  },
  dueAmount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: D.rose,
  },

  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: D.ink,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: D.inkSoft,
    textAlign: "center",
    paddingHorizontal: 40,
  },

  detailCustomerInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailHeroName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  detailHeroPhone: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  heroDuePill: {
    backgroundColor: "rgba(240,78,106,0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(240,78,106,0.3)",
  },
  heroDuePillLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroDuePillAmount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: D.rose,
  },

  detailChipsRow: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
  },
  chip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 2,
  },
  chipLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chipValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },

  detailList: {
    padding: 16,
    gap: 10,
  },

  invoiceCard: {
    flexDirection: "row",
    backgroundColor: D.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: D.border,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  invoiceStrip: {
    width: 4,
  },
  invoiceBody: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  invoiceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  invoiceNum: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: D.inkMid,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeTxt: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  invoiceDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: D.inkSoft,
    marginBottom: 6,
  },
  dividerThin: {
    height: 1,
    backgroundColor: D.border,
    marginVertical: 8,
  },
  amountLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  amountLineLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: D.inkSoft,
  },
  amountLineValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  // Settlement Button
  settleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: D.emerald,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  settleBtnTxt: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  // Settlement Modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: D.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: D.inkGhost,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: D.ink,
  },

  // Input Container
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: D.inkSoft,
    marginBottom: 8,
  },
  saleInfoBox: {
    backgroundColor: D.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: D.border,
  },
  saleInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  saleInfoLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: D.ink,
  },
  saleInfoDue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: D.rose,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    paddingHorizontal: 14,
    height: 50,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: D.ink,
  },
  inputSuffix: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: D.inkSoft,
  },

  // Quick Amounts
  quickAmountsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  quickAmountBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: D.bg,
    borderWidth: 1,
    borderColor: D.border,
    justifyContent: "center",
    alignItems: "center",
  },
  quickAmountBtnFull: {
    flex: 1,
  },
  quickAmountTxt: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: D.ink,
  },

  // Preview
  previewContainer: {
    backgroundColor: D.bg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: D.border,
  },
  previewTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: D.ink,
    textAlign: "center",
    marginBottom: 8,
  },
  previewLine: {
    height: 1,
    backgroundColor: D.border,
    marginVertical: 8,
  },
  previewRow: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: D.ink,
    marginVertical: 2,
  },
  previewBold: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  previewStatus: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: D.emerald,
    textAlign: "center",
    marginTop: 4,
  },
  previewFooter: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: D.inkSoft,
    textAlign: "center",
    marginTop: 8,
  },

  // Modal Actions
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: D.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: D.surface,
  },
  cancelBtnTxt: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: D.inkMid,
  },
  confirmBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: D.heroAccent,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtnTxt: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  // Tab Toggle
  tabToggle: {
    flexDirection: "row",
    backgroundColor: D.surface,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: D.heroAccent,
  },
  tabBtnTxt: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: D.inkSoft,
  },
  tabBtnTxtActive: {
    color: "#fff",
  },

  // History Card
  historyCard: {
    backgroundColor: D.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: D.border,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyInvoice: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: D.inkMid,
  },
  statusPartial: {
    backgroundColor: D.amberBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusFull: {
    backgroundColor: D.emeraldBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTxtPartial: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: D.amber,
  },
  statusTxtFull: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: D.emerald,
  },
  historyClient: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: D.ink,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: D.inkSoft,
    marginBottom: 8,
  },
  historyAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: D.border,
  },
  historyAmountLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: D.inkSoft,
  },
  historyAmount: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: D.emerald,
  },
});
