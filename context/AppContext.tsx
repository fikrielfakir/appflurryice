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
  user: string | null;
  isLoggedIn: boolean;
  sales: Sale[];
  contacts: Contact[];
  expenses: Expense[];
  products: Product[];
  transfers: Transfer[];
  cart: CartItem[];
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

const DEMO_CREDENTIALS = { username: "admin", password: "admin123" };

export const DEMO_PRODUCTS: Product[] = [];
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19504",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=Pot%20600%20Ml%20vanille%2F%20fraise"
  },
  {
    "id": "p77",
    "name": "Pot 600 Ml vanille/chocolat",
    "price": 1.4,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19505",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=Pot%20600%20Ml%20vanille%2Fchocolat"
  },
  {
    "id": "p78",
    "name": "Pot 600 Ml chocolat",
    "price": 1.4,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19506",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=Pot%20600%20Ml%20chocolat"
  },
  {
    "id": "p79",
    "name": "polo 50",
    "price": 20,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19508",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=polo%2050"
  },
  {
    "id": "p80",
    "name": "mariposa",
    "price": 52,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "Flurryice",
    "sku": "19509",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=mariposa"
  },
  {
    "id": "p81",
    "name": "biscuit roule mini",
    "price": 0.54,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19510",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=biscuit%20roule%20mini"
  },
  {
    "id": "p82",
    "name": "pot 85",
    "price": 0.48,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19511",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=pot%2085"
  },
  {
    "id": "p83",
    "name": "cacao coloracom",
    "price": 50,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19512",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=cacao%20coloracom"
  },
  {
    "id": "p84",
    "name": "lygomme cremodan",
    "price": 102,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19513",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=lygomme%20cremodan"
  },
  {
    "id": "p85",
    "name": "cacao gerkens",
    "price": 150,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19514",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=cacao%20gerkens"
  },
  {
    "id": "p86",
    "name": "almidon",
    "price": 20,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19515",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=almidon"
  },
  {
    "id": "p87",
    "name": "POT T.MINI",
    "price": 0.17,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19516",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=POT%20T.MINI"
  },
  {
    "id": "p88",
    "name": "carton G",
    "price": 3.15,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19517",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=carton%20G"
  },
  {
    "id": "p89",
    "name": "arome vanille lc",
    "price": 162,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19518",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=arome%20vanille%20lc"
  },
  {
    "id": "p90",
    "name": "lecithin liquid",
    "price": 19.8,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19519",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=lecithin%20liquid"
  },
  {
    "id": "p91",
    "name": "NATA ARCONSA",
    "price": 210,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19520",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=NATA%20ARCONSA"
  },
  {
    "id": "p92",
    "name": "FRAISE ARCONSA",
    "price": 135,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19521",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=FRAISE%20ARCONSA"
  },
  {
    "id": "p93",
    "name": "NAWTRO",
    "price": 40,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19522",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=NAWTRO"
  },
  {
    "id": "p94",
    "name": "choclat agbil",
    "price": 137,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19523",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=choclat%20agbil"
  },
  {
    "id": "p95",
    "name": "TAS 15 DH",
    "price": 13,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19524",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=TAS%2015%20DH"
  },
  {
    "id": "p96",
    "name": "choco go",
    "price": 130,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19525",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=choco%20go"
  },
  {
    "id": "p97",
    "name": "calippo",
    "price": 0.77,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19526",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=calippo"
  },
  {
    "id": "p98",
    "name": "caramel aromes co",
    "price": 200,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19527",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=caramel%20aromes%20co"
  },
  {
    "id": "p99",
    "name": "goyave aromes co",
    "price": 200,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19528",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=goyave%20aromes%20co"
  },
  {
    "id": "p100",
    "name": "chocolat aromes co",
    "price": 200,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19529",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=chocolat%20aromes%20co"
  },
  {
    "id": "p101",
    "name": "pomme aromes co",
    "price": 200,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19530",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=pomme%20aromes%20co"
  },
  {
    "id": "p102",
    "name": "pistache aromes co",
    "price": 200,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19531",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=pistache%20aromes%20co"
  },
  {
    "id": "p103",
    "name": "vanille aromes co",
    "price": 200,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19532",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=vanille%20aromes%20co"
  },
  {
    "id": "p104",
    "name": "fraise aromes co",
    "price": 200,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19533",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=fraise%20aromes%20co"
  },
  {
    "id": "p105",
    "name": "apikote a 347",
    "price": 33.6,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19534",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=apikote%20a%20347"
  },
  {
    "id": "p106",
    "name": "apikote 27 30",
    "price": 33.6,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19535",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=apikote%2027%2030"
  },
  {
    "id": "p107",
    "name": "cacao alkalinise 10",
    "price": 69.6,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19536",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=cacao%20alkalinise%2010"
  },
  {
    "id": "p108",
    "name": "skimmik powder",
    "price": 29.5,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19537",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=skimmik%20powder"
  },
  {
    "id": "p109",
    "name": "lygomme supreme 106",
    "price": 28.8,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19538",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=lygomme%20supreme%20106"
  },
  {
    "id": "p110",
    "name": "emballage jbilou",
    "price": 62,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19539",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=emballage%20jbilou"
  },
  {
    "id": "p111",
    "name": "skotch normal",
    "price": 10.2,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19540",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=skotch%20normal"
  },
  {
    "id": "p112",
    "name": "skotch couleur",
    "price": 16.8,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19541",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=skotch%20couleur"
  },
  {
    "id": "p113",
    "name": "titan",
    "price": 205,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19542",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=titan"
  },
  {
    "id": "p114",
    "name": "oreo",
    "price": 320,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19543",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=oreo"
  },
  {
    "id": "p115",
    "name": "molka",
    "price": 320,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19544",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=molka"
  },
  {
    "id": "p116",
    "name": "kitkat",
    "price": 320,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "No Flurryice Article",
    "sku": "19545",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=kitkat"
  },
  {
    "id": "p117",
    "name": "milka",
    "price": 320,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19546",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=milka"
  },
  {
    "id": "p118",
    "name": "ruban noire",
    "price": 48,
    "stock": 0,
    "unit": "ml",
    "category": "General",
    "sku": "19547",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=ruban%20noire"
  },
  {
    "id": "p119",
    "name": "pomme pa15 aroma",
    "price": 90,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19548",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=pomme%20pa15%20aroma"
  },
  {
    "id": "p120",
    "name": "mangue pa15 aroma",
    "price": 99,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19549",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=mangue%20pa15%20aroma"
  },
  {
    "id": "p121",
    "name": "coco pa15 aroma",
    "price": 90,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19550",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=coco%20pa15%20aroma"
  },
  {
    "id": "p122",
    "name": "nata pa15 aroma",
    "price": 99,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19551",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=nata%20pa15%20aroma"
  },
  {
    "id": "p123",
    "name": "nougat pa15 aroma",
    "price": 128,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19552",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=nougat%20pa15%20aroma"
  },
  {
    "id": "p124",
    "name": "arla",
    "price": 29,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19553",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=arla"
  },
  {
    "id": "p125",
    "name": "danino",
    "price": 800,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19554",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=danino"
  },
  {
    "id": "p126",
    "name": "sel",
    "price": 280,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19555",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=sel"
  },
  {
    "id": "p127",
    "name": "tas 25 dh",
    "price": 23,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19556",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=tas%2025%20dh"
  },
  {
    "id": "p128",
    "name": "strathroy",
    "price": 29,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19557",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=strathroy"
  },
  {
    "id": "p129",
    "name": "FRICONE",
    "price": 32,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19558",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=FRICONE"
  },
  {
    "id": "p130",
    "name": "magnum",
    "price": 350,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "No Flurryice Article",
    "sku": "19545",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=magnum"
  },
  {
    "id": "p131",
    "name": "nata PA 24",
    "price": 62,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19560",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=nata%20PA%2024"
  },
  {
    "id": "p132",
    "name": "choclat PA 24",
    "price": 67,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19561",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=choclat%20PA%2024"
  },
  {
    "id": "p133",
    "name": "nougat PA 24",
    "price": 72,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19562",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=nougat%20PA%2024"
  },
  {
    "id": "p134",
    "name": "peche PA0411",
    "price": 102,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19563",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=peche%20PA0411"
  },
  {
    "id": "p135",
    "name": "biscuits sandwich cacao",
    "price": 0,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19564",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=biscuits%20sandwich%20cacao"
  },
  {
    "id": "p136",
    "name": "LIBAGE",
    "price": 8,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19565",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=LIBAGE"
  },
  {
    "id": "p137",
    "name": "unipectine OG",
    "price": 250,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19566",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=unipectine%20OG"
  },
  {
    "id": "p138",
    "name": "Arome fraise 110 231",
    "price": 145,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19568",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=Arome%20fraise%20110%20231"
  },
  {
    "id": "p139",
    "name": "NATIF CORN",
    "price": 6.2,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19569",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=NATIF%20CORN"
  },
  {
    "id": "p140",
    "name": "LYGOMME PALSGAARD",
    "price": 73,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19570",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=LYGOMME%20PALSGAARD"
  },
  {
    "id": "p141",
    "name": "CUIL PETITE COULEUR",
    "price": 30,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19571",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=CUIL%20PETITE%20COULEUR"
  },
  {
    "id": "p142",
    "name": "LACTO",
    "price": 16,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19572",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=LACTO"
  },
  {
    "id": "p143",
    "name": "biscuits roules standard",
    "price": 0.59,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19573",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=biscuits%20roules%20standard"
  },
  {
    "id": "p144",
    "name": "dalah",
    "price": 112,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19574",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=dalah"
  },
  {
    "id": "p145",
    "name": "lygomme cremgel",
    "price": 144,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19575",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=lygomme%20cremgel"
  },
  {
    "id": "p146",
    "name": "IFFCO 35",
    "price": 36,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19576",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=IFFCO%2035"
  },
  {
    "id": "p147",
    "name": "natali",
    "price": 80,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19577",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=natali"
  },
  {
    "id": "p148",
    "name": "solero",
    "price": 300,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19578",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=solero"
  },
  {
    "id": "p149",
    "name": "libage glace",
    "price": 80,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19579",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=libage%20glace"
  },
  {
    "id": "p150",
    "name": "IFFCO 38 40",
    "price": 17.5,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19580",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=IFFCO%2038%2040"
  },
  {
    "id": "p151",
    "name": "Soya lecithin liquid",
    "price": 19.8,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19581",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=Soya%20lecithin%20liquid"
  },
  {
    "id": "p152",
    "name": "pomme PA 24",
    "price": 67,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19582",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=pomme%20PA%2024"
  },
  {
    "id": "p153",
    "name": "PISTACHE PA 24",
    "price": 67,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19583",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=PISTACHE%20PA%2024"
  },
  {
    "id": "p154",
    "name": "ANANAS PA 24",
    "price": 62,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19584",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=ANANAS%20PA%2024"
  },
  {
    "id": "p155",
    "name": "COCO PA 24",
    "price": 62,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19585",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=COCO%20PA%2024"
  },
  {
    "id": "p156",
    "name": "NOISETTE PA 24",
    "price": 67,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19586",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=NOISETTE%20PA%2024"
  },
  {
    "id": "p157",
    "name": "lygomme stabalite",
    "price": 27,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19587",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=lygomme%20stabalite"
  },
  {
    "id": "p158",
    "name": "fraise",
    "price": 0,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19588",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=fraise"
  },
  {
    "id": "p159",
    "name": "vanille",
    "price": 0,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19589",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=vanille"
  },
  {
    "id": "p160",
    "name": "pistache",
    "price": 0,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19590",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=pistache"
  },
  {
    "id": "p161",
    "name": "citron",
    "price": 0,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19591",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=citron"
  },
  {
    "id": "p162",
    "name": "couleur noir",
    "price": 0,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19592",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=couleur%20noir"
  },
  {
    "id": "p163",
    "name": "couleur marron",
    "price": 0,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19593",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=couleur%20marron"
  },
  {
    "id": "p164",
    "name": "TAS GRAND",
    "price": 76.8,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19594",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=TAS%20GRAND"
  },
  {
    "id": "p165",
    "name": "arome creme SC",
    "price": 222,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19595",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=arome%20creme%20SC"
  },
  {
    "id": "p166",
    "name": "arome yaourt SC",
    "price": 180,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19596",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=arome%20yaourt%20SC"
  },
  {
    "id": "p167",
    "name": "LEMON FLAVOR",
    "price": 192,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19597",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=LEMON%20FLAVOR"
  },
  {
    "id": "p168",
    "name": "tirlan",
    "price": 34.8,
    "stock": 0,
    "unit": "Kg",
    "category": "General",
    "sku": "19598",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=tirlan"
  },
  {
    "id": "p169",
    "name": "test",
    "price": 10,
    "stock": 0,
    "unit": "Pc(s)",
    "category": "General",
    "sku": "19599",
    "image": "https://api.dicebear.com/7.x/identicon/svg?seed=test"
  }
];

const DEMO_SALES: Sale[] = [];

const DEMO_CONTACTS: Contact[] = [];

const DEMO_EXPENSES: Expense[] = [];

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
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [savedUser, savedSales, savedContacts, savedExpenses, savedTransfers, savedProducts, initialDataLoaded] = await Promise.all([
        AsyncStorage.getItem(KEYS.user),
        AsyncStorage.getItem(KEYS.sales),
        AsyncStorage.getItem(KEYS.contacts),
        AsyncStorage.getItem(KEYS.expenses),
        AsyncStorage.getItem(KEYS.transfers),
        AsyncStorage.getItem(KEYS.products),
        AsyncStorage.getItem(KEYS.initialDataLoaded),
      ]);

      if (!initialDataLoaded) {
        // First time opening the app, initialize with demo data
        setUser("admin");
        setSales(DEMO_SALES);
        setContacts(DEMO_CONTACTS);
        setExpenses(DEMO_EXPENSES);
        setProducts(DEMO_PRODUCTS);
        
        await Promise.all([
          AsyncStorage.setItem(KEYS.user, "admin"),
          AsyncStorage.setItem(KEYS.sales, JSON.stringify(DEMO_SALES)),
          AsyncStorage.setItem(KEYS.contacts, JSON.stringify(DEMO_CONTACTS)),
          AsyncStorage.setItem(KEYS.expenses, JSON.stringify(DEMO_EXPENSES)),
          AsyncStorage.setItem(KEYS.products, JSON.stringify(DEMO_PRODUCTS)),
          AsyncStorage.setItem(KEYS.initialDataLoaded, "true"),
        ]);
      } else {
        if (savedUser) setUser(savedUser);
        setSales(savedSales ? JSON.parse(savedSales) : []);
        setContacts(savedContacts ? JSON.parse(savedContacts) : []);
        setExpenses(savedExpenses ? JSON.parse(savedExpenses) : []);
        setTransfers(savedTransfers ? JSON.parse(savedTransfers) : []);
        setProducts(savedProducts ? JSON.parse(savedProducts) : DEMO_PRODUCTS);
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

  async function addTransfer(transfer: Transfer) {
    const updatedTransfers = [transfer, ...transfers];
    setTransfers(updatedTransfers);
    await AsyncStorage.setItem(KEYS.transfers, JSON.stringify(updatedTransfers));

    // Update product stock
    const updatedProducts = products.map(p => {
      const item = transfer.items.find(it => it.sku === p.sku);
      if (item) {
        // Transfer 'to' destination adds quantity, 'from' subtracts? 
        // User said "update the new quantity Transfed". Usually means from -> to.
        // If from is our stock, subtract. If to is our stock, add.
        // Assuming 'Produits finis' is our current stock category.
        if (transfer.from === "Produits finis") {
          return { ...p, stock: p.stock - item.qty };
        } else if (transfer.to === "Produits finis") {
          return { ...p, stock: p.stock + item.qty };
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

  async function syncData() {
  if (isSyncing) {
    console.log('⏳ Sync already in progress');
    return;
  }
  
  setIsSyncing(true);
  try {
    console.log('🔄 Starting sync from Supabase...');
    
    // Call pullAll instead of syncAll
    const results = await syncService.forceFullSync();
    
    console.log('📦 Sync results:', results);
    
    // Reload products from AsyncStorage if sync was successful
    if (results.products.success) {
      const syncedProducts = await AsyncStorage.getItem('@bizpos_products');
      if (syncedProducts) {
        const parsedProducts = JSON.parse(syncedProducts);
        console.log(`✅ Loaded ${parsedProducts.length} products from storage`);
        setProducts(parsedProducts);
      }
    }
    
    // Reload contacts from AsyncStorage if sync was successful
    if (results.contacts.success) {
      const syncedContacts = await AsyncStorage.getItem('@bizpos_contacts');
      if (syncedContacts) {
        const parsedContacts = JSON.parse(syncedContacts);
        console.log(`✅ Loaded ${parsedContacts.length} contacts from storage`);
        setContacts(parsedContacts);
      }
    }
    
    // Reload sales from AsyncStorage if sync was successful
    if (results.sales.success) {
      const syncedSales = await AsyncStorage.getItem('@bizpos_sales');
      if (syncedSales) {
        const parsedSales = JSON.parse(syncedSales);
        console.log(`✅ Loaded ${parsedSales.length} sales from storage`);
        setSales(parsedSales);
      }
    }
    
    // Update last sync time
    const lastSync = await syncService.getLastSyncTime();
    setLastSyncTime(lastSync);
    
    // Show success message
    if (results.overall.success) {
      console.log('✅ Sync completed successfully!');
      alert(`Sync Complete!\n\n${results.products.count || 0} products\n${results.contacts.count || 0} contacts\n${results.sales.count || 0} sales`);
    } else {
      console.error('❌ Sync completed with errors:', results.overall.error);
      alert(`Sync Error: ${results.overall.error}`);
    }
    
  } catch (error: any) {
    console.error('❌ Sync error:', error);
    alert(`Sync Failed: ${error.message || 'Unknown error occurred'}`);
  } finally {
    setIsSyncing(false);
  }
}

  const totalSales = useMemo(() => sales.reduce((sum, s) => sum + s.amount, 0), [sales]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const totalDue = useMemo(() => sales.reduce((sum, s) => sum + (s.amount - s.paid), 0), [sales]);
  const netProfit = useMemo(() => totalSales - totalExpenses, [totalSales, totalExpenses]);

  const value = useMemo(() => ({
    user, isLoggedIn: !!user,
    sales, contacts, expenses, products, transfers, cart,
    login, logout,
    addSale, deleteSale,
    addContact, deleteContact,
    addExpense, deleteExpense,
    addTransfer,
    addToCart, removeFromCart, updateCartQty, clearCart,
    totalSales, totalExpenses, totalDue, netProfit, isLoading,
    isSyncing, syncData, lastSyncTime,
  }), [user, sales, contacts, expenses, products, transfers, cart, totalSales, totalExpenses, totalDue, netProfit, isLoading, isSyncing, lastSyncTime]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
