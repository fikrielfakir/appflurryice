import { useMemo } from "react";
import { Sale, Transaction, Product } from "@/context/AppContext";

export type FilterKey = "daily" | "weekly" | "monthly" | "all";

function getDateBoundary(filter: FilterKey): Date | null {
  if (filter === "all") return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "weekly") {
    const w = new Date(today);
    w.setDate(today.getDate() - 7);
    return w;
  }
  return today;
}

function filterByDate<T extends { date: string }>(
  items: T[],
  filter: FilterKey
): T[] {
  if (filter === "all") return items;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const boundary = getDateBoundary(filter);
  return items.filter((item) => {
    const d = new Date(item.date);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (filter === "daily") return day.getTime() === today.getTime();
    if (filter === "weekly") return boundary !== null && day >= boundary;
    if (filter === "monthly")
      return (
        day.getMonth() === today.getMonth() &&
        day.getFullYear() === today.getFullYear()
      );
    return true;
  });
}

export interface ReportFinancials {
  totalRevenue: number;
  cashCollected: number;
  customerCredit: number;
  avgSaleValue: number;
  collectionRate: number;
}

export interface ReportStatusCounts {
  paid: number;
  due: number;
  partial: number;
  total: number;
}

export interface ReportTruckStock {
  count: number;
  value: number;
}

export interface ReportMetrics {
  filteredSales: Sale[];
  filteredTransactions: Transaction[];
  financials: ReportFinancials;
  statusCounts: ReportStatusCounts;
  truckStock: ReportTruckStock;
}

export function useReportMetrics(
  sales: Sale[],
  transactions: Transaction[],
  products: Product[],
  filter: FilterKey
): ReportMetrics {
  const filteredSales = useMemo(
    () => filterByDate(sales, filter),
    [sales, filter]
  );

  const filteredTransactions = useMemo(
    () => filterByDate(transactions, filter),
    [transactions, filter]
  );

  const financials = useMemo<ReportFinancials>(() => {
    const totalRevenue = filteredSales.reduce((s, x) => s + x.amount, 0);
    const cashCollected = filteredSales.reduce((s, x) => s + x.paid, 0);
    const customerCredit = totalRevenue - cashCollected;
    const avgSaleValue =
      filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
    const collectionRate =
      totalRevenue > 0 ? (cashCollected / totalRevenue) * 100 : 0;
    return {
      totalRevenue,
      cashCollected,
      customerCredit,
      avgSaleValue,
      collectionRate,
    };
  }, [filteredSales]);

  const statusCounts = useMemo<ReportStatusCounts>(() => {
    const paid = filteredSales.filter((s) => s.status === "paid").length;
    const due = filteredSales.filter((s) => s.status === "due").length;
    const partial = filteredSales.filter(
      (s) => s.status === "partial"
    ).length;
    const total = paid + due + partial || 1;
    return { paid, due, partial, total };
  }, [filteredSales]);

  const truckStock = useMemo<ReportTruckStock>(() => {
    const inStock = products.filter((p) => (p.stock || 0) > 0);
    const count = inStock.length;
    const value = inStock.reduce(
      (s, p) => s + (p.stock || 0) * (p.price || 0),
      0
    );
    return { count, value };
  }, [products]);

  return {
    filteredSales,
    filteredTransactions,
    financials,
    statusCounts,
    truckStock,
  };
}
