import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FuelEntry, FuelBudget } from "./AppContext";

const FUEL_ENTRIES_KEY = "fuel_entries";
const FUEL_BUDGET_KEY = "fuel_budget";

interface FuelContextValue {
  entries: FuelEntry[];
  budget: FuelBudget | null;
  addEntry: (entry: Omit<FuelEntry, "id" | "consumption">) => Promise<FuelEntry>;
  deleteEntry: (id: string) => Promise<void>;
  updateBudget: (budget: FuelBudget) => Promise<void>;
  getEntriesForMonth: (year: number, month: number) => FuelEntry[];
  getEntriesForTruck: (truckId: string) => FuelEntry[];
  getMonthlyTotals: (year: number, month: number) => {
    totalLiters: number;
    totalCost: number;
    totalKm: number;
    avgConsumption: number;
  };
  refreshEntries: () => Promise<void>;
}

const FuelContext = createContext<FuelContextValue | null>(null);

export function FuelProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [budget, setBudget] = useState<FuelBudget | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(FUEL_ENTRIES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setEntries(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.error("Error loading fuel entries:", e);
      setEntries([]);
    }
  }, []);

  const loadBudget = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(FUEL_BUDGET_KEY);
      if (data) {
        setBudget(JSON.parse(data));
      }
    } catch (e) {
      console.error("Error loading fuel budget:", e);
    }
  }, []);

  useEffect(() => {
    loadEntries();
    loadBudget();
  }, [loadEntries, loadBudget]);

  const refreshEntries = useCallback(async () => {
    await loadEntries();
  }, [loadEntries]);

  const addEntry = useCallback(async (entryData: Omit<FuelEntry, "id" | "consumption">): Promise<FuelEntry> => {
    const { liters, pricePerLiter, odometer, truckId } = entryData;
    const totalCost = liters * pricePerLiter;

    const previousEntry = entries
      .filter(e => e.truckId === truckId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    let consumption: number | undefined;
    if (previousEntry && odometer > previousEntry.odometer) {
      const kmDiff = odometer - previousEntry.odometer;
      consumption = (liters / kmDiff) * 100;
    }

    const newEntry: FuelEntry = {
      ...entryData,
      id: `FUEL-${Date.now()}`,
      totalCost,
      consumption,
    };

    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);
    await AsyncStorage.setItem(FUEL_ENTRIES_KEY, JSON.stringify(updatedEntries));

    return newEntry;
  }, [entries]);

  const deleteEntry = useCallback(async (id: string) => {
    const updatedEntries = entries.filter(e => e.id !== id);
    setEntries(updatedEntries);
    await AsyncStorage.setItem(FUEL_ENTRIES_KEY, JSON.stringify(updatedEntries));
  }, [entries]);

  const updateBudget = useCallback(async (newBudget: FuelBudget) => {
    setBudget(newBudget);
    await AsyncStorage.setItem(FUEL_BUDGET_KEY, JSON.stringify(newBudget));
  }, []);

  const getEntriesForMonth = useCallback((year: number, month: number): FuelEntry[] => {
    return entries.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [entries]);

  const getEntriesForTruck = useCallback((truckId: string): FuelEntry[] => {
    return entries.filter(e => e.truckId === truckId);
  }, [entries]);

  const getMonthlyTotals = useCallback((year: number, month: number) => {
    const monthEntries = getEntriesForMonth(year, month);
    const totalLiters = monthEntries.reduce((sum, e) => sum + e.liters, 0);
    const totalCost = monthEntries.reduce((sum, e) => sum + e.totalCost, 0);
    
    const sorted = [...monthEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let totalKm = 0;
    for (let i = 1; i < sorted.length; i++) {
      totalKm += sorted[i].odometer - sorted[i - 1].odometer;
    }
    
    const consumptions = monthEntries.filter(e => e.consumption).map(e => e.consumption!);
    const avgConsumption = consumptions.length > 0 
      ? consumptions.reduce((sum, c) => sum + c, 0) / consumptions.length 
      : 0;

    return { totalLiters, totalCost, totalKm, avgConsumption };
  }, [getEntriesForMonth]);

  const value = useMemo(() => ({
    entries,
    budget,
    addEntry,
    deleteEntry,
    updateBudget,
    getEntriesForMonth,
    getEntriesForTruck,
    getMonthlyTotals,
    refreshEntries,
  }), [entries, budget, addEntry, deleteEntry, updateBudget, getEntriesForMonth, getEntriesForTruck, getMonthlyTotals, refreshEntries]);

  return <FuelContext.Provider value={value}>{children}</FuelContext.Provider>;
}

export function useFuel(): FuelContextValue {
  const context = useContext(FuelContext);
  if (!context) {
    throw new Error("useFuel must be used within a FuelProvider");
  }
  return context;
}
