import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { syncService, SyncResult } from "@/lib/syncService";

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  category: string;
  image?: string;
  sku?: string;
  stock: number;
}

export interface TransferItem {
  sku: string;
  name: string;
  qty: number;
  unit: string;
}

export interface Transfer {
  id: string;
  ref: string;
  date: string;
  from: string;
  to: string;
  items: TransferItem[];
  total: number;
  sig: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  paid: number;
  discount: number;
  shippingFee: number;
  date: string;
  status: "paid" | "partial" | "due";
  items: SaleItem[];
  paymentMethod: string;
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
  user: any | null;
  isLoggedIn: boolean;
  sales: Sale[];
  contacts: Contact[];
  expenses: Expense[];
  products: Product[];
  transfers: Transfer[];
  cart: CartItem[];
  login: (username: string, password: string) => Promise<boolean>;
  loginWithQR: (qrData: string) => Promise<boolean>;
  logout: () => void;
  addSale: (sale: Omit<Sale, "id" | "date" | "invoiceNumber">) => Sale;
  deleteSale: (id: string) => void;
  addContact: (contact: Omit<Contact, "id" | "date">) => void;
  deleteContact: (id: string) => void;
  addExpense: (expense: Omit<Expense, "id" | "date">) => void;
  deleteExpense: (id: string) => void;
  addTransfer: (transfer: Transfer) => void;
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalSales: number;
  totalExpenses: number;
  totalDue: number;
  netProfit: number;
  isLoading: boolean;
  isSyncing: boolean;
  syncData: () => Promise<void>;
  lastSyncTime: string | null;
}

const AppContext = createContext<AppContextValue | null>(null);

const KEYS = {
  user: "bizpos_user",
  sales: "bizpos_sales",
  contacts: "bizpos_contacts",
  expenses: "bizpos_expenses",
  transfers: "bizpos_transfers",
  products: "bizpos_products",
  initialDataLoaded: "bizpos_initial_data_loaded",
};

// Supabase storage keys used by syncService
const SYNC_KEYS = {
  products: "@bizpos_products",
  contacts: "@bizpos_contacts",
  sales: "@bizpos_sales",
};

function genInvoiceNumber(existingCount: number) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${existingCount + 1}_${y}${m}${d}${h}${min}`;
}

async function checkOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    await fetch("https://cxlbdhtymgquyuqwxdhk.supabase.co", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    const initUser = async () => {
      const savedUser = await AsyncStorage.getItem(KEYS.user);
      if (!savedUser) {
        const initialUserData = {
          id: 12,
          username: "basiri",
          password: "",
          name: "ABDALAH BASIRI",
          email: "abdlahbasiri3@gmail.com",
          role: "Distribtion",
          business_id: 1,
          status: "active",
          locations: [{ id: 10, name: "CAM 01 - 0199-A-44", location_id: "0199-A-44" }],
          created_at: "2025-03-01T16:33:05+00:00",
        };
        const userStr = JSON.stringify(initialUserData);
        await AsyncStorage.setItem(KEYS.user, userStr);
        setUser(userStr);
      } else {
        setUser(savedUser);
      }
    };
    initUser();
    loadData();
  }, []);

  async function loadData() {
    try {
      const [
        savedSales,
        savedContacts,
        savedExpenses,
        savedTransfers,
        savedProducts,
        initialDataLoaded,
      ] = await Promise.all([
        AsyncStorage.getItem(KEYS.sales),
        AsyncStorage.getItem(KEYS.contacts),
        AsyncStorage.getItem(KEYS.expenses),
        AsyncStorage.getItem(KEYS.transfers),
        AsyncStorage.getItem(KEYS.products),
        AsyncStorage.getItem(KEYS.initialDataLoaded),
      ]);

      // Load whatever is in local storage first (instant startup)
      setSales(savedSales ? JSON.parse(savedSales) : []);
      setContacts(savedContacts ? JSON.parse(savedContacts) : []);
      setExpenses(savedExpenses ? JSON.parse(savedExpenses) : []);
      setTransfers(savedTransfers ? JSON.parse(savedTransfers) : []);
      setProducts(savedProducts ? JSON.parse(savedProducts) : []);

      // Load last sync time
      const lastSync = await syncService.getLastSyncTime();
      setLastSyncTime(lastSync);

      const localIsEmpty =
        !savedProducts || JSON.parse(savedProducts).length === 0;

      const shouldAutoSync = !initialDataLoaded || localIsEmpty;

      if (shouldAutoSync) {
        // Check connectivity before trying to sync
        const online = await checkOnline();
        if (online) {
          console.log("📡 Online detected — auto-syncing from Supabase...");
          setIsLoading(false); // unblock UI while syncing in background
          await performSync(true /* silent */);
          if (!initialDataLoaded) {
            await AsyncStorage.setItem(KEYS.initialDataLoaded, "true");
          }
          return;
        } else {
          console.log("📴 Offline — using local data (empty on first launch)");
        }
      }
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setIsLoading(false);
    }
  }

  /** Internal sync that loads results into state */
  async function performSync(silent = false) {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const results = await syncService.forceFullSync();

      if (results.products.success) {
        const raw = await AsyncStorage.getItem(SYNC_KEYS.products);
        if (raw) {
          const parsed = JSON.parse(raw);
          setProducts(parsed);
          // Mirror to the legacy key so subsequent cold starts load it
          await AsyncStorage.setItem(KEYS.products, raw);
        }
      }

      if (results.contacts.success) {
        const raw = await AsyncStorage.getItem(SYNC_KEYS.contacts);
        if (raw) {
          const parsed = JSON.parse(raw);
          setContacts(parsed);
          await AsyncStorage.setItem(KEYS.contacts, raw);
        }
      }

      if (results.sales.success) {
        const raw = await AsyncStorage.getItem(SYNC_KEYS.sales);
        if (raw) {
          const parsed = JSON.parse(raw);
          setSales(parsed);
          await AsyncStorage.setItem(KEYS.sales, raw);
        }
      }

      const newLastSync = await syncService.getLastSyncTime();
      setLastSyncTime(newLastSync);

      if (!silent) {
        const p = results.products.count ?? 0;
        const c = results.contacts.count ?? 0;
        const s = results.sales.count ?? 0;
        if (results.overall.success) {
          alert(`Sync Complete!\n\n${p} products\n${c} contacts\n${s} sales`);
        } else {
          alert(`Sync Error: ${results.overall.error}`);
        }
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      if (!silent) alert(`Sync Failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSyncing(false);
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
    try {
      const savedUser = await AsyncStorage.getItem(KEYS.user);
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        if (userData.username.toLowerCase() === username.toLowerCase()) {
          // If password matches or is empty (for initial user)
          if (userData.password === "" || userData.password === password) {
            if (userData.password === "" && password !== "") {
              // Update password on first login
              userData.password = password;
              const updatedUser = JSON.stringify(userData);
              await AsyncStorage.setItem(KEYS.user, updatedUser);
              setUser(updatedUser);
            }
            return true;
          }
        }
      }
    } catch (e) {
      console.error("Login error", e);
    }
    return false;
  }

  async function loginWithQR(qrData: string): Promise<boolean> {
    try {
      const userData = JSON.parse(qrData);
      // Basic validation of the expected format
      if (userData && userData.username && userData.id) {
        const userStr = JSON.stringify(userData);
        await AsyncStorage.setItem(KEYS.user, userStr);
        setUser(userStr);
        return true;
      }
    } catch (e) {
      console.error("QR Login error", e);
    }
    return false;
  }

  async function logout() {
    setUser(null);
    await AsyncStorage.removeItem(KEYS.user);
  }

  function addSale(sale: Omit<Sale, "id" | "date" | "invoiceNumber">): Sale {
    const newSale: Sale = {
      ...sale,
      id: genId(),
      invoiceNumber: genInvoiceNumber(sales.length),
      date: new Date().toISOString(),
    };
    const updated = [newSale, ...sales];
    setSales(updated);
    AsyncStorage.setItem(KEYS.sales, JSON.stringify(updated));
    return newSale;
  }

  async function deleteSale(id: string) {
    const updated = sales.filter(s => s.id !== id);
    setSales(updated);
    await AsyncStorage.setItem(KEYS.sales, JSON.stringify(updated));
  }

  async function addContact(contact: Omit<Contact, "id" | "date">) {
    const newContact: Contact = {
      ...contact,
      id: genId(),
      date: new Date().toISOString(),
    };
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
    const newExpense: Expense = {
      ...expense,
      id: genId(),
      date: new Date().toISOString(),
    };
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(updated));
  }

  async function deleteExpense(id: string) {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(updated));
  }

  async function addTransfer(transfer: Transfer) {
    const updatedTransfers = [transfer, ...transfers];
    setTransfers(updatedTransfers);
    await AsyncStorage.setItem(KEYS.transfers, JSON.stringify(updatedTransfers));

    const updatedProducts = products.map(p => {
      const item = transfer.items.find(it => it.sku === p.sku);
      if (item) {
        if (transfer.from === "Produits finis") {
          return { ...p, stock: (p.stock ?? 0) - item.qty };
        } else if (transfer.to === "Produits finis") {
          return { ...p, stock: (p.stock ?? 0) + item.qty };
        }
      }
      return p;
    });
    setProducts(updatedProducts);
    await AsyncStorage.setItem(KEYS.products, JSON.stringify(updatedProducts));
  }

  function addToCart(product: Product, qty = 1) {
    setCart(prev => {
      const existing = prev.find(ci => ci.product.id === product.id);
      if (existing) {
        return prev.map(ci =>
          ci.product.id === product.id ? { ...ci, qty: ci.qty + qty } : ci
        );
      }
      return [...prev, { product, qty }];
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(ci => ci.product.id !== productId));
  }

  function updateCartQty(productId: string, qty: number) {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart(prev =>
      prev.map(ci => ci.product.id === productId ? { ...ci, qty } : ci)
    );
  }

  function clearCart() { setCart([]); }

  /** Public syncData — called manually from UI */
  async function syncData() {
    await performSync(false);
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
    products,
    transfers,
    cart,
    login,
    loginWithQR,
    logout,
    addSale,
    deleteSale,
    addContact,
    deleteContact,
    addExpense,
    deleteExpense,
    addTransfer,
    addToCart,
    removeFromCart,
    updateCartQty,
    clearCart,
    totalSales,
    totalExpenses,
    totalDue,
    netProfit,
    isLoading,
    isSyncing,
    syncData,
    lastSyncTime,
  }), [
    user, sales, contacts, expenses, products, transfers, cart,
    totalSales, totalExpenses, totalDue, netProfit,
    isLoading, isSyncing, lastSyncTime,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}