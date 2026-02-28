import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  category: string;
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
  user: string | null;
  isLoggedIn: boolean;
  sales: Sale[];
  contacts: Contact[];
  expenses: Expense[];
  products: Product[];
  cart: CartItem[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  addSale: (sale: Omit<Sale, "id" | "date" | "invoiceNumber">) => Sale;
  deleteSale: (id: string) => void;
  addContact: (contact: Omit<Contact, "id" | "date">) => void;
  deleteContact: (id: string) => void;
  addExpense: (expense: Omit<Expense, "id" | "date">) => void;
  deleteExpense: (id: string) => void;
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;
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
  initialDataLoaded: "bizpos_initial_data_loaded",
};

const DEMO_CREDENTIALS = { username: "admin", password: "admin123" };

export const DEMO_PRODUCTS: Product[] = [
  { id: "p1", name: "dudu", price: 64.00, stock: 8785, unit: "pcs", category: "Produits finis" },
  { id: "p2", name: "rene", price: 60.00, stock: 24130, unit: "pcs", category: "Produits finis" },
  { id: "p3", name: "pikoti", price: 56.00, stock: 42440, unit: "pcs", category: "Produits finis" },
  { id: "p4", name: "kokix", price: 75.00, stock: 1102, unit: "pcs", category: "Produits finis" },
  { id: "p5", name: "polero", price: 60.00, stock: 632, unit: "pcs", category: "Produits finis" },
  { id: "p6", name: "miyomi", price: 100.00, stock: 7, unit: "pcs", category: "Produits finis" },
  { id: "p7", name: "choco go", price: 130.00, stock: 40, unit: "pcs", category: "Produits finis" },
  { id: "p8", name: "flurry", price: 87.50, stock: 19604, unit: "pcs", category: "Produits finis" },
  { id: "p9", name: "tas mini", price: 60.00, stock: 37, unit: "pcs", category: "Produits finis" },
  { id: "p10", name: "choco bar", price: 45.00, stock: 890, unit: "pcs", category: "Produits finis" },
  { id: "p11", name: "vanilla ice", price: 55.00, stock: 1250, unit: "pcs", category: "Produits finis" },
  { id: "p12", name: "sorbet mix", price: 95.00, stock: 8, unit: "pcs", category: "Produits finis" },
];

const DEMO_SALES: Sale[] = [
  { id: "s1", invoiceNumber: "INV-001", customerName: "Mahdi Wadlaw", customerPhone: "0623845152", amount: 255.00, paid: 255.00, discount: 0, shippingFee: 0, date: new Date(Date.now() - 86400000).toISOString(), status: "paid", items: [{ name: "dudu", qty: 1, price: 64 }, { name: "rene", qty: 1, price: 60 }, { name: "pikoti", qty: 1, price: 56 }, { name: "kokix", qty: 1, price: 75 }], paymentMethod: "Cash" },
  { id: "s2", invoiceNumber: "INV-002", customerName: "Sarah Connor", customerPhone: "0612345678", amount: 875.50, paid: 500.00, discount: 0, shippingFee: 0, date: new Date(Date.now() - 172800000).toISOString(), status: "partial", items: [{ name: "flurry", qty: 10, price: 87.50 }], paymentMethod: "Cash" },
  { id: "s3", invoiceNumber: "INV-003", customerName: "Walk-in Customer", amount: 430.00, paid: 0, discount: 0, shippingFee: 0, date: new Date(Date.now() - 259200000).toISOString(), status: "due", items: [{ name: "choco go", qty: 3, price: 130 }, { name: "miyomi", qty: 1, price: 100 }], paymentMethod: "Cash" },
  { id: "s4", invoiceNumber: "INV-004", customerName: "Emma Davis", amount: 2100.00, paid: 2100.00, discount: 5, shippingFee: 0, date: new Date(Date.now() - 345600000).toISOString(), status: "paid", items: [{ name: "polero", qty: 20, price: 60 }, { name: "rene", qty: 15, price: 60 }], paymentMethod: "Bank Transfer" },
];

const DEMO_CONTACTS: Contact[] = [
  { id: "c1", name: "Mahdi Wadlaw", phone: "0623845152", email: "mahdi@example.com", type: "customer", date: new Date(Date.now() - 864000000).toISOString(), totalPurchased: 255 },
  { id: "c2", name: "Sarah Connor", phone: "0612345678", email: "sarah@example.com", type: "customer", date: new Date(Date.now() - 1728000000).toISOString(), totalPurchased: 875.50 },
  { id: "c3", name: "Ahmed Benali", phone: "0661234567", type: "customer", date: new Date(Date.now() - 432000000).toISOString(), totalPurchased: 0 },
  { id: "c4", name: "Emma Davis", phone: "0698765432", email: "emma@example.com", type: "customer", date: new Date(Date.now() - 2592000000).toISOString(), totalPurchased: 2100 },
  { id: "c5", name: "TechSupply Co.", phone: "0522334455", email: "orders@techsupply.com", type: "supplier", date: new Date(Date.now() - 5184000000).toISOString() },
  { id: "c6", name: "Youssef El Mansouri", phone: "0677889900", type: "lead", date: new Date(Date.now() - 86400000).toISOString() },
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

function genInvoiceNumber(existingCount: number) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${existingCount + 1}_${y}${m}${d}${h}${min}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products] = useState<Product[]>(DEMO_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [savedUser, savedSales, savedContacts, savedExpenses, initialDataLoaded] = await Promise.all([
        AsyncStorage.getItem(KEYS.user),
        AsyncStorage.getItem(KEYS.sales),
        AsyncStorage.getItem(KEYS.contacts),
        AsyncStorage.getItem(KEYS.expenses),
        AsyncStorage.getItem(KEYS.initialDataLoaded),
      ]);

      if (!initialDataLoaded) {
        // First time opening the app, initialize with demo data
        setUser("admin");
        setSales(DEMO_SALES);
        setContacts(DEMO_CONTACTS);
        setExpenses(DEMO_EXPENSES);
        
        await Promise.all([
          AsyncStorage.setItem(KEYS.user, "admin"),
          AsyncStorage.setItem(KEYS.sales, JSON.stringify(DEMO_SALES)),
          AsyncStorage.setItem(KEYS.contacts, JSON.stringify(DEMO_CONTACTS)),
          AsyncStorage.setItem(KEYS.expenses, JSON.stringify(DEMO_EXPENSES)),
          AsyncStorage.setItem(KEYS.initialDataLoaded, "true"),
        ]);
      } else {
        if (savedUser) setUser(savedUser);
        setSales(savedSales ? JSON.parse(savedSales) : []);
        setContacts(savedContacts ? JSON.parse(savedContacts) : []);
        setExpenses(savedExpenses ? JSON.parse(savedExpenses) : []);
      }
    } catch (e) {
      console.error("Failed to load data", e);
      setSales(DEMO_SALES); setContacts(DEMO_CONTACTS); setExpenses(DEMO_EXPENSES);
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

  function addToCart(product: Product, qty = 1) {
    setCart(prev => {
      const existing = prev.find(ci => ci.product.id === product.id);
      if (existing) {
        return prev.map(ci => ci.product.id === product.id ? { ...ci, qty: ci.qty + qty } : ci);
      }
      return [...prev, { product, qty }];
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(ci => ci.product.id !== productId));
  }

  function updateCartQty(productId: string, qty: number) {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(ci => ci.product.id === productId ? { ...ci, qty } : ci));
  }

  function clearCart() {
    setCart([]);
  }

  const totalSales = useMemo(() => sales.reduce((sum, s) => sum + s.amount, 0), [sales]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const totalDue = useMemo(() => sales.reduce((sum, s) => sum + (s.amount - s.paid), 0), [sales]);
  const netProfit = useMemo(() => totalSales - totalExpenses, [totalSales, totalExpenses]);

  const value = useMemo(() => ({
    user, isLoggedIn: !!user,
    sales, contacts, expenses, products, cart,
    login, logout,
    addSale, deleteSale,
    addContact, deleteContact,
    addExpense, deleteExpense,
    addToCart, removeFromCart, updateCartQty, clearCart,
    totalSales, totalExpenses, totalDue, netProfit, isLoading,
  }), [user, sales, contacts, expenses, products, cart, totalSales, totalExpenses, totalDue, netProfit, isLoading]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
