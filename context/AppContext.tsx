import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";

export interface Sale {
  id: string;
  customerName: string;
  amount: number;
  paid: number;
  date: string;
  status: "paid" | "partial" | "due";
  items: SaleItem[];
  note?: string;
}

export interface SaleItem {
  name: string;
  qty: number;
  price: number;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  type: "customer" | "lead" | "supplier";
  date: string;
  totalPurchased?: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
  paymentMethod: string;
}

interface AppContextValue {
  user: string | null;
  isLoggedIn: boolean;
  sales: Sale[];
  contacts: Contact[];
  expenses: Expense[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  addSale: (sale: Omit<Sale, "id" | "date">) => void;
  deleteSale: (id: string) => void;
  addContact: (contact: Omit<Contact, "id" | "date">) => void;
  deleteContact: (id: string) => void;
  addExpense: (expense: Omit<Expense, "id" | "date">) => void;
  deleteExpense: (id: string) => void;
  totalSales: number;
  totalExpenses: number;
  totalDue: number;
  netProfit: number;
  isLoading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const KEYS = {
  user: "bizpos_user",
  sales: "bizpos_sales",
  contacts: "bizpos_contacts",
  expenses: "bizpos_expenses",
};

const DEMO_CREDENTIALS = { username: "admin", password: "admin123" };

const DEMO_SALES: Sale[] = [
  { id: "s1", customerName: "John Smith", amount: 1250.00, paid: 1250.00, date: new Date(Date.now() - 86400000).toISOString(), status: "paid", items: [{ name: "Product A", qty: 2, price: 500 }, { name: "Product B", qty: 1, price: 250 }] },
  { id: "s2", customerName: "Sarah Connor", amount: 875.50, paid: 500.00, date: new Date(Date.now() - 172800000).toISOString(), status: "partial", items: [{ name: "Service X", qty: 1, price: 875.50 }] },
  { id: "s3", customerName: "Mike Johnson", amount: 430.00, paid: 0, date: new Date(Date.now() - 259200000).toISOString(), status: "due", items: [{ name: "Product C", qty: 3, price: 143.33 }] },
  { id: "s4", customerName: "Emma Davis", amount: 2100.00, paid: 2100.00, date: new Date(Date.now() - 345600000).toISOString(), status: "paid", items: [{ name: "Package Pro", qty: 1, price: 2100 }] },
  { id: "s5", customerName: "Robert Lee", amount: 640.00, paid: 640.00, date: new Date(Date.now() - 432000000).toISOString(), status: "paid", items: [{ name: "Service Y", qty: 2, price: 320 }] },
];

const DEMO_CONTACTS: Contact[] = [
  { id: "c1", name: "John Smith", phone: "+1 555-0101", email: "john@example.com", type: "customer", date: new Date(Date.now() - 864000000).toISOString(), totalPurchased: 1250 },
  { id: "c2", name: "Sarah Connor", phone: "+1 555-0102", email: "sarah@example.com", type: "customer", date: new Date(Date.now() - 1728000000).toISOString(), totalPurchased: 875.50 },
  { id: "c3", name: "Mike Johnson", phone: "+1 555-0103", type: "lead", date: new Date(Date.now() - 432000000).toISOString() },
  { id: "c4", name: "Emma Davis", phone: "+1 555-0104", email: "emma@example.com", type: "customer", date: new Date(Date.now() - 2592000000).toISOString(), totalPurchased: 2100 },
  { id: "c5", name: "TechSupply Co.", phone: "+1 555-0200", email: "orders@techsupply.com", type: "supplier", date: new Date(Date.now() - 5184000000).toISOString() },
];

const DEMO_EXPENSES: Expense[] = [
  { id: "e1", category: "Office Rent", amount: 1500.00, date: new Date(Date.now() - 86400000).toISOString(), paymentMethod: "Bank Transfer", note: "Monthly office rent" },
  { id: "e2", category: "Utilities", amount: 245.00, date: new Date(Date.now() - 259200000).toISOString(), paymentMethod: "Cash" },
  { id: "e3", category: "Salaries", amount: 3200.00, date: new Date(Date.now() - 345600000).toISOString(), paymentMethod: "Bank Transfer" },
  { id: "e4", category: "Marketing", amount: 400.00, date: new Date(Date.now() - 432000000).toISOString(), paymentMethod: "Card", note: "Social media ads" },
  { id: "e5", category: "Supplies", amount: 180.00, date: new Date(Date.now() - 518400000).toISOString(), paymentMethod: "Cash" },
];

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [savedUser, savedSales, savedContacts, savedExpenses] = await Promise.all([
        AsyncStorage.getItem(KEYS.user),
        AsyncStorage.getItem(KEYS.sales),
        AsyncStorage.getItem(KEYS.contacts),
        AsyncStorage.getItem(KEYS.expenses),
      ]);

      if (savedUser) setUser(savedUser);

      if (savedSales) {
        setSales(JSON.parse(savedSales));
      } else {
        setSales(DEMO_SALES);
        await AsyncStorage.setItem(KEYS.sales, JSON.stringify(DEMO_SALES));
      }

      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      } else {
        setContacts(DEMO_CONTACTS);
        await AsyncStorage.setItem(KEYS.contacts, JSON.stringify(DEMO_CONTACTS));
      }

      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      } else {
        setExpenses(DEMO_EXPENSES);
        await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(DEMO_EXPENSES));
      }
    } catch (e) {
      setSales(DEMO_SALES);
      setContacts(DEMO_CONTACTS);
      setExpenses(DEMO_EXPENSES);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
    if (username.toLowerCase() === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password) {
      setUser(username);
      await AsyncStorage.setItem(KEYS.user, username);
      return true;
    }
    return false;
  }

  async function logout() {
    setUser(null);
    await AsyncStorage.removeItem(KEYS.user);
  }

  async function addSale(sale: Omit<Sale, "id" | "date">) {
    const newSale: Sale = { ...sale, id: genId(), date: new Date().toISOString() };
    const updated = [newSale, ...sales];
    setSales(updated);
    await AsyncStorage.setItem(KEYS.sales, JSON.stringify(updated));
  }

  async function deleteSale(id: string) {
    const updated = sales.filter(s => s.id !== id);
    setSales(updated);
    await AsyncStorage.setItem(KEYS.sales, JSON.stringify(updated));
  }

  async function addContact(contact: Omit<Contact, "id" | "date">) {
    const newContact: Contact = { ...contact, id: genId(), date: new Date().toISOString() };
    const updated = [newContact, ...contacts];
    setContacts(updated);
    await AsyncStorage.setItem(KEYS.contacts, JSON.stringify(updated));
  }

  async function deleteContact(id: string) {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    await AsyncStorage.setItem(KEYS.contacts, JSON.stringify(updated));
  }

  async function addExpense(expense: Omit<Expense, "id" | "date">) {
    const newExpense: Expense = { ...expense, id: genId(), date: new Date().toISOString() };
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(updated));
  }

  async function deleteExpense(id: string) {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(updated));
  }

  const totalSales = useMemo(() => sales.reduce((sum, s) => sum + s.amount, 0), [sales]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const totalDue = useMemo(() => sales.reduce((sum, s) => sum + (s.amount - s.paid), 0), [sales]);
  const netProfit = useMemo(() => totalSales - totalExpenses, [totalSales, totalExpenses]);

  const value = useMemo(() => ({
    user,
    isLoggedIn: !!user,
    sales,
    contacts,
    expenses,
    login,
    logout,
    addSale,
    deleteSale,
    addContact,
    deleteContact,
    addExpense,
    deleteExpense,
    totalSales,
    totalExpenses,
    totalDue,
    netProfit,
    isLoading,
  }), [user, sales, contacts, expenses, totalSales, totalExpenses, totalDue, netProfit, isLoading]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
