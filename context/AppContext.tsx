import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { syncService } from "@/lib/syncService";
import Colors from "@/constants/colors";
import Toast from "react-native-root-toast";

const C = Colors.dark;

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
  productId?: string;
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
  returnAmount?: number;
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
  productId?: string;
}

export interface Transaction {
  id: string;
  date: string;
  referenceNo: string;
  type: "sell" | "transfer_in" | "transfer_out" | "adjustment";
  productId: string;
  productName: string;
  quantity: number;
  remainingStock: number;
  sellId?: string;
  transferId?: string;
}

// ... existing interfaces ...
export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  type: "customer" | "lead" | "supplier";
  date: string;
  totalPurchased?: number;
  balance?: number;
  refrigerators?: string;
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

interface AppConfig {
  fullScreen: boolean;
  keepScreenOn: boolean;
  darkMode: boolean;
  truckLocation: string;
}

interface AppContextValue {
  user: string | null;
  userProfile: AppUser | null;
  isLoggedIn: boolean;
  needsSetup: boolean;
  sales: Sale[];
  transactions: Transaction[];
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  expenses: Expense[];
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  transfers: Transfer[];
  cart: CartItem[];
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
  setupFromQR: (qrData: string) => Promise<{ success: boolean; data?: Partial<AppUser>; error?: string }>;
  completeSetup: (profile: AppUser) => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  addSale: (sale: Omit<Sale, "id" | "date" | "invoiceNumber">) => Sale;
  deleteSale: (id: string) => void;
  addContact: (contact: Omit<Contact, "id" | "date">) => void;
  deleteContact: (id: string) => void;
  updateContact: (id: string, updates: Partial<Omit<Contact, "id" | "date">>) => void;
  addExpense: (expense: Omit<Expense, "id" | "date">) => void;
  deleteExpense: (id: string) => void;
  addTransfer: (transfer: Transfer) => void;
  resetAllStock: () => void;
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
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  syncData: () => Promise<void>;
  lastSyncTime: string | null;
}

// ─── Storage keys ───────────────────────────────────────────────────────────────

const KEYS = {
  userProfile: "bizpos_user_profile",
  activeUser: "bizpos_active_user",
  sales: "bizpos_sales",
  transactions: "bizpos_transactions",
  contacts: "bizpos_contacts",
  expenses: "bizpos_expenses",
  transfers: "bizpos_transfers",
  products: "bizpos_products",
  initialDataLoaded: "bizpos_initial_data_loaded",
  themeMode: "bizpos_theme_mode",
  config: "bizpos_app_config",
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [config, setConfig] = useState<AppConfig>({
    fullScreen: false,
    keepScreenOn: false,
    darkMode: false,
    truckLocation: 'CAM 01 - 0199-A-44',
  });

  useEffect(() => { loadData(); }, []);

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  async function loadData() {
    try {
      const [
        profileRaw,
        activeUserRaw,
        savedSales,
        savedTransactions,
        savedContacts,
        savedExpenses,
        savedTransfers,
        savedProducts,
        initialDataLoaded,
        configRaw,
      ] = await Promise.all([
        AsyncStorage.getItem(KEYS.userProfile),
        AsyncStorage.getItem(KEYS.activeUser),
        AsyncStorage.getItem(KEYS.sales),
        AsyncStorage.getItem(KEYS.transactions),
        AsyncStorage.getItem(KEYS.contacts),
        AsyncStorage.getItem(KEYS.expenses),
        AsyncStorage.getItem(KEYS.transfers),
        AsyncStorage.getItem(KEYS.products),
        AsyncStorage.getItem(KEYS.initialDataLoaded),
        AsyncStorage.getItem(KEYS.config),
      ]);

      // Restore user session
      if (profileRaw) {
        const profile: AppUser = JSON.parse(profileRaw);
        setUserProfile(profile);
        if (activeUserRaw) setActiveUser(activeUserRaw);
      } else {
        setNeedsSetup(true);
      }

      // Restore config
      if (configRaw) {
        setConfig(JSON.parse(configRaw));
      }

      // ── Local data ─────────────────────────────────────────────────────────
      setSales(savedSales ? JSON.parse(savedSales) : []);
      setTransactions(savedTransactions ? JSON.parse(savedTransactions) : []);
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

  const updateConfig = async (updates: Partial<AppConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    await AsyncStorage.setItem(KEYS.config, JSON.stringify(newConfig));
  };

  // ── QR Setup ─────────────────────────────────────────────────────────────────

  async function setupFromQR(
    qrData: string
  ): Promise<{ success: boolean; data?: Partial<AppUser>; error?: string }> {
    try {
      const parsed = JSON.parse(qrData) as Partial<AppUser>;

      if (!parsed.username || !parsed.id) {
        return { success: false, error: "Invalid QR code: missing username or id." };
      }

      return { success: true, data: parsed };
    } catch {
      return {
        success: false,
        error: "Failed to parse QR code. Make sure it contains valid JSON.",
      };
    }
  }

  async function completeSetup(profile: AppUser) {
    await AsyncStorage.setItem(KEYS.userProfile, JSON.stringify(profile));
    setUserProfile(profile);
    setNeedsSetup(false);
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
        const raw = await AsyncStorage.getItem(KEYS.products);
        if (raw) {
          const syncedProducts = JSON.parse(raw);
          const existingProducts = products;

          const mergedProducts = syncedProducts.map((syncedProduct: Product) => {
            const existingProduct = existingProducts.find(p => p.id === syncedProduct.id);
            if (existingProduct) {
              return { ...syncedProduct, stock: existingProduct.stock };
            }
            return syncedProduct;
          });

          setProducts(mergedProducts);
        }
      }
      if (results.contacts.success) {
        const raw = await AsyncStorage.getItem(KEYS.contacts);
        if (raw) {
          setContacts(JSON.parse(raw));
        }
      }
      if (results.sales.success) {
        const raw = await AsyncStorage.getItem(KEYS.sales);
        if (raw) {
          setSales(JSON.parse(raw));
        }
      }

      const newLastSync = await syncService.getLastSyncTime();
      setLastSyncTime(newLastSync);

      if (!silent) {
        const p = results.products.count ?? 0;
        const c = results.contacts.count ?? 0;
        const s = results.sales.count ?? 0;
        if (results.overall.success) {
          Toast.show(`Sync Complete!\n\n${p} products\n${c} contacts\n${s} sales`, {
            duration: Toast.durations.LONG,
            backgroundColor: C.success,
          });
        } else {
          Toast.show(`Sync Error: ${results.overall.error}`, {
            duration: Toast.durations.SHORT,
            backgroundColor: C.danger,
          });
        }
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      if (!silent) Toast.show(`Sync Failed: ${error.message || "Unknown error"}`, {
        duration: Toast.durations.SHORT,
        backgroundColor: C.danger,
      });
    } finally {
      setIsSyncing(false);
    }
  }

  async function syncData() {
    await performSync(false);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  function addSale(sale: Omit<Sale, "id" | "date" | "invoiceNumber">): Sale {
    const now = new Date().toISOString();

    // ✅ Enrich items with productId before saving
    const enrichedItems: SaleItem[] = sale.items.map(item => {
      const product = products.find(p => p.name === item.name);
      return {
        ...item,
        productId: item.productId || product?.id || '',  // ensure productId is always set
      };
    });

    const newSale: Sale = {
      ...sale,
      items: enrichedItems,   // ✅ use enriched items
      id: genId(),
      invoiceNumber: genInvoiceNumber(sales.length),
      date: now,
    };

    const updatedProducts = products.map(p => {
      const saleItem = enrichedItems.find(item => item.productId === p.id); // ✅ match by id
      if (saleItem) {
        return { ...p, stock: Math.max(0, (p.stock || 0) - saleItem.qty) };
      }
      return p;
    });

    const newTransactions: Transaction[] = sale.items.map(item => {
      const product = products.find(p => p.name === item.name);
      const updatedProduct = updatedProducts.find(p => p.name === item.name);
      return {
        id: genId(),
        date: now,
        referenceNo: newSale.invoiceNumber,
        type: "sell",
        productId: product?.id || '',
        productName: item.name,
        quantity: -item.qty,
        remainingStock: updatedProduct?.stock || 0,
        sellId: newSale.id,
      };
    });

    const updatedTransactions = [...newTransactions, ...transactions];
    setTransactions(updatedTransactions);
    AsyncStorage.setItem(KEYS.transactions, JSON.stringify(updatedTransactions));

    setProducts(updatedProducts);
    AsyncStorage.setItem(KEYS.products, JSON.stringify(updatedProducts));

    const updated = [newSale, ...sales];
    setSales(updated);
    AsyncStorage.setItem(KEYS.sales, JSON.stringify(updated));
    return newSale;
  }

  async function deleteSale(id: string) {
    const saleToDelete = sales.find(s => s.id === id);

    if (saleToDelete?.items) {
      const updatedProducts = products.map(product => {
        const saleItem = saleToDelete.items.find(
          item => item.productId === product.id || item.name === product.name
        );
        if (saleItem) {
          return { ...product, stock: product.stock + saleItem.qty };
        }
        return product;
      });
      setProducts(updatedProducts);
      await AsyncStorage.setItem(KEYS.products, JSON.stringify(updatedProducts));
    }

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

  async function updateContact(id: string, updates: Partial<Omit<Contact, "id" | "date">>) {
    const updated = contacts.map(c => c.id === id ? { ...c, ...updates } : c);
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

  // ─── FIXED addTransfer ───────────────────────────────────────────────────────
// Drop-in replacement for addTransfer inside AppProvider
// Fixes: transfer_in QR scans not updating stock

async function addTransfer(transfer: Transfer) {
  const ref = (transfer.ref || '').toLowerCase();

  // ── Determine transfer direction from ref prefix ──────────────────────────
  // "TR-OUT..."= Transfer OUT       (manual truck dispatch)
  // anything else → Transfer IN     (QR scan from warehouse → truck)
  const isDefiniteIn  = !ref.startsWith('tr-out');
  const isDefiniteOut = ref.startsWith('tr-out');

  const isTruck = (loc: string) =>
    loc.includes('truck') ||
    loc.includes('vehicle') ||
    loc.includes('cam 01') ||
    loc.includes('0199-a-44');

  const isStorage = (loc: string) =>
    loc.includes('produits finis') ||
    loc.includes('main store') ||
    loc.includes('main warehouse') ||
    loc.includes('warehouse') ||
    loc.includes('storage');

  const fromLoc = (transfer.from || '').toLowerCase();
  const toLoc   = (transfer.to   || '').toLowerCase();

  // ── Compute stock delta for each item ─────────────────────────────────────
  // +qty = stock increases (transfer IN)
  // -qty = stock decreases (transfer OUT)
  const getQtyDelta = (item: TransferItem): number => {
    if (isDefiniteIn)  return +item.qty;   // QR scan always adds stock
    if (isDefiniteOut) return -item.qty;   // TR-OUT always removes stock

    // Fallback: location-based logic
    if (isTruck(toLoc))                          return -item.qty; // going to truck
    if (isTruck(fromLoc) && isStorage(toLoc))    return +item.qty; // return from truck
    if (isStorage(fromLoc) && isStorage(toLoc))  return -item.qty; // storage-to-storage
    if (isStorage(fromLoc))                      return -item.qty; // default out
    return 0;
  };

  // ── Build updated products list ───────────────────────────────────────────
  const updatedProducts = products.map(p => {
    const item = transfer.items.find(
      it => it.productId === p.id || (it.sku && it.sku === p.sku)
    );
    if (!item) return p;

    const delta    = getQtyDelta(item);
    const newStock = Math.max(0, (p.stock ?? 0) + delta);

    console.log(
      `[Transfer] ${p.name}: stock ${p.stock} ${delta >= 0 ? '+' : ''}${delta} → ${newStock} (ref: ${transfer.ref})`
    );

    return { ...p, stock: newStock };
  });

  // ── Build transaction records ─────────────────────────────────────────────
  const now = new Date().toISOString();

  const transferTransactions: Transaction[] = transfer.items.map(item => {
    const product = products.find(
      p => p.id === item.productId || (item.sku && p.sku === item.sku)
    );
    const updatedProduct = updatedProducts.find(
      p => p.id === item.productId || (item.sku && p.sku === item.sku)
    );

    const delta   = getQtyDelta(item);
    const txType: Transaction['type'] = delta >= 0 ? 'transfer_in' : 'transfer_out';

    return {
      id: genId(),
      date: transfer.date || now,
      referenceNo: transfer.ref,
      type: txType,
      productId: product?.id || item.productId || '',
      productName: item.name,
      quantity: delta,                           // signed: +qty or -qty
      remainingStock: updatedProduct?.stock ?? 0,
      transferId: transfer.id,
    };
  });

  // ── Persist everything ────────────────────────────────────────────────────
  const updatedTransactions = [...transferTransactions, ...transactions];
  setTransactions(updatedTransactions);
  AsyncStorage.setItem(KEYS.transactions, JSON.stringify(updatedTransactions));

  const updatedTransfers = [transfer, ...transfers];
  setTransfers(updatedTransfers);
  await AsyncStorage.setItem(KEYS.transfers, JSON.stringify(updatedTransfers));

  // ✅ Products must be set LAST so remainingStock in transactions is accurate
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
    sales, transactions, contacts, setContacts, expenses, products, transfers, cart, config, updateConfig, setProducts,
    setupFromQR,
    completeSetup,
    login, logout,
    addSale, deleteSale,
    addContact, deleteContact, updateContact,
    addExpense, deleteExpense,
    addTransfer,
    resetAllStock: () => {
      const updatedProducts = products.map(p => ({ ...p, stock: 0 }));
      setProducts(updatedProducts);
      AsyncStorage.setItem(KEYS.products, JSON.stringify(updatedProducts));
    },
    addToCart, removeFromCart, updateCartQty, clearCart,
    totalSales, totalExpenses, totalDue, netProfit,
    isLoading, isSyncing, isSidebarOpen, setIsSidebarOpen, syncData, lastSyncTime,
  }), [
    activeUser, userProfile, needsSetup,
    sales, transactions, contacts, expenses, products, transfers, cart, config,
    totalSales, totalExpenses, totalDue, netProfit,
    isLoading, isSyncing, isSidebarOpen, lastSyncTime,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}