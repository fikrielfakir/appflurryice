import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { syncService } from "@/lib/syncService";

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface AppUser {
  id: number;
  username: string;
  /** password stored locally after QR setup */
  password: string;
  name: string;
  email: string;
  role: string;
  business_id: number;
  status: string;
  locations: { id: number; name: string; location_id: string }[];
  created_at: string;
}

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

// ─── Context shape ──────────────────────────────────────────────────────────────

interface AppContextValue {
  user: string | null;
  userProfile: AppUser | null;
  isLoggedIn: boolean;
  needsSetup: boolean;
  sales: Sale[];
  contacts: Contact[];
  expenses: Expense[];
  products: Product[];
  transfers: Transfer[];
  cart: CartItem[];
  setupFromQR: (qrData: string) => Promise<{ success: boolean; error?: string }>;
  login: (username: string, password: string) => Promise<boolean>;
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

// ─── Storage keys ───────────────────────────────────────────────────────────────

const KEYS = {
  userProfile: "bizpos_user_profile",
  activeUser: "bizpos_active_user",
  sales: "bizpos_sales",
  contacts: "bizpos_contacts",
  expenses: "bizpos_expenses",
  transfers: "bizpos_transfers",
  products: "bizpos_products",
  initialDataLoaded: "bizpos_initial_data_loaded",
};

const SYNC_KEYS = {
  products: "@bizpos_products",
  contacts: "@bizpos_contacts",
  sales: "@bizpos_sales",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

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

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [activeUser, setActiveUser] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const [sales, setSales] = useState<Sale[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  async function loadData() {
    try {
      const [
        profileRaw,
        activeUserRaw,
        savedSales,
        savedContacts,
        savedExpenses,
        savedTransfers,
        savedProducts,
        initialDataLoaded,
      ] = await Promise.all([
        AsyncStorage.getItem(KEYS.userProfile),
        AsyncStorage.getItem(KEYS.activeUser),
        AsyncStorage.getItem(KEYS.sales),
        AsyncStorage.getItem(KEYS.contacts),
        AsyncStorage.getItem(KEYS.expenses),
        AsyncStorage.getItem(KEYS.transfers),
        AsyncStorage.getItem(KEYS.products),
        AsyncStorage.getItem(KEYS.initialDataLoaded),
      ]);

      // Restore user session
      if (profileRaw) {
        const profile: AppUser = JSON.parse(profileRaw);
        setUserProfile(profile);
        if (activeUserRaw) setActiveUser(activeUserRaw);
      } else {
        setNeedsSetup(true);
      }

      // ── Local data ─────────────────────────────────────────────────────────
      setSales(savedSales ? JSON.parse(savedSales) : []);
      setContacts(savedContacts ? JSON.parse(savedContacts) : []);
      setExpenses(savedExpenses ? JSON.parse(savedExpenses) : []);
      setTransfers(savedTransfers ? JSON.parse(savedTransfers) : []);
      setProducts(savedProducts ? JSON.parse(savedProducts) : []);

      const lastSync = await syncService.getLastSyncTime();
      setLastSyncTime(lastSync);

      // ── Auto-sync when local data is empty ─────────────────────────────────
      const localIsEmpty = !savedProducts || JSON.parse(savedProducts).length === 0;
      if (!initialDataLoaded || localIsEmpty) {
        const online = await checkOnline();
        if (online) {
          console.log("📡 Auto-syncing from Supabase...");
          setIsLoading(false);
          await performSync(true);
          if (!initialDataLoaded) {
            await AsyncStorage.setItem(KEYS.initialDataLoaded, "true");
          }
          return;
        } else {
          console.log("📴 Offline — using local data");
        }
      }
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setIsLoading(false);
    }
  }

  // ── QR Setup ─────────────────────────────────────────────────────────────────

  /**
   * Scanned QR JSON format:
   * {
   *   "id": 12, "username": "basiri", "password": "",
   *   "name": "ABDALAH BASIRI", "email": "abdlahbasiri3@gmail.com",
   *   "role": "Distribution", "business_id": 1, "status": "active",
   *   "locations": [{"id":10,"name":"CAM 01 - 0199-A-44","location_id":"0199-A-44"}],
   *   "created_at": "2025-03-01T16:33:05+00:00"
   * }
   *
   * If the password field in the QR is empty, the username is used as the
   * initial local password so the user can log in immediately after scanning.
   */
  async function setupFromQR(
    qrData: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const parsed = JSON.parse(qrData) as Partial<AppUser>;

      if (!parsed.username || !parsed.id) {
        return { success: false, error: "Invalid QR code: missing username or id." };
      }

      // Use username as initial password when QR password is blank
      const initialPassword =
        parsed.password && parsed.password.trim() !== ""
          ? parsed.password
          : parsed.username;

      const profile: AppUser = {
        id: parsed.id,
        username: parsed.username,
        password: initialPassword,
        name: parsed.name ?? parsed.username,
        email: parsed.email ?? "",
        role: parsed.role ?? "",
        business_id: parsed.business_id ?? 0,
        status: parsed.status ?? "active",
        locations: parsed.locations ?? [],
        created_at: parsed.created_at ?? new Date().toISOString(),
      };

      await AsyncStorage.setItem(KEYS.userProfile, JSON.stringify(profile));
      setUserProfile(profile);
      setNeedsSetup(false);

      return { success: true };
    } catch {
      return {
        success: false,
        error: "Failed to parse QR code. Make sure it contains valid JSON.",
      };
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────────

  async function login(username: string, password: string): Promise<boolean> {
    if (!userProfile) return false;

    const usernameMatch =
      userProfile.username.toLowerCase() === username.toLowerCase();
    const passwordMatch = userProfile.password === password;

    if (usernameMatch && passwordMatch) {
      const displayName = userProfile.name || userProfile.username;
      setActiveUser(displayName);
      await AsyncStorage.setItem(KEYS.activeUser, displayName);
      return true;
    }
    return false;
  }

  async function logout() {
    setActiveUser(null);
    await AsyncStorage.removeItem(KEYS.activeUser);
  }

  // ── Sync ──────────────────────────────────────────────────────────────────────

  async function performSync(silent = false) {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const results = await syncService.forceFullSync();

      if (results.products.success) {
        const raw = await AsyncStorage.getItem(SYNC_KEYS.products);
        if (raw) {
          setProducts(JSON.parse(raw));
          await AsyncStorage.setItem(KEYS.products, raw);
        }
      }
      if (results.contacts.success) {
        const raw = await AsyncStorage.getItem(SYNC_KEYS.contacts);
        if (raw) {
          setContacts(JSON.parse(raw));
          await AsyncStorage.setItem(KEYS.contacts, raw);
        }
      }
      if (results.sales.success) {
        const raw = await AsyncStorage.getItem(SYNC_KEYS.sales);
        if (raw) {
          setSales(JSON.parse(raw));
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

  async function syncData() {
    await performSync(false);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────────

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

  async function addTransfer(transfer: Transfer) {
    const updatedTransfers = [transfer, ...transfers];
    setTransfers(updatedTransfers);
    await AsyncStorage.setItem(KEYS.transfers, JSON.stringify(updatedTransfers));

    const updatedProducts = products.map(p => {
      const item = transfer.items.find(it => it.sku === p.sku);
      if (!item) return p;
      if (transfer.from === "Produits finis") return { ...p, stock: (p.stock ?? 0) - item.qty };
      if (transfer.to === "Produits finis") return { ...p, stock: (p.stock ?? 0) + item.qty };
      return p;
    });
    setProducts(updatedProducts);
    await AsyncStorage.setItem(KEYS.products, JSON.stringify(updatedProducts));
  }

  function addToCart(product: Product, qty = 1) {
    setCart(prev => {
      const existing = prev.find(ci => ci.product.id === product.id);
      if (existing) return prev.map(ci => ci.product.id === product.id ? { ...ci, qty: ci.qty + qty } : ci);
      return [...prev, { product, qty }];
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(ci => ci.product.id !== productId));
  }

  function updateCartQty(productId: string, qty: number) {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart(prev => prev.map(ci => ci.product.id === productId ? { ...ci, qty } : ci));
  }

  function clearCart() { setCart([]); }

  // ── Computed totals ───────────────────────────────────────────────────────────

  const totalSales = useMemo(() => sales.reduce((s, x) => s + x.amount, 0), [sales]);
  const totalExpenses = useMemo(() => expenses.reduce((s, x) => s + x.amount, 0), [expenses]);
  const totalDue = useMemo(() => sales.reduce((s, x) => s + (x.amount - x.paid), 0), [sales]);
  const netProfit = useMemo(() => totalSales - totalExpenses, [totalSales, totalExpenses]);

  const value = useMemo<AppContextValue>(() => ({
    user: activeUser,
    userProfile,
    isLoggedIn: !!activeUser,
    needsSetup,
    sales, contacts, expenses, products, transfers, cart,
    setupFromQR,
    login, logout,
    addSale, deleteSale,
    addContact, deleteContact,
    addExpense, deleteExpense,
    addTransfer,
    addToCart, removeFromCart, updateCartQty, clearCart,
    totalSales, totalExpenses, totalDue, netProfit,
    isLoading, isSyncing, syncData, lastSyncTime,
  }), [
    activeUser, userProfile, needsSetup,
    sales, contacts, expenses, products, transfers, cart,
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