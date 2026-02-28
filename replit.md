# BizPOS — Business Management App

A React Native (Expo) business POS/CRM management mobile app. Rebuilt from a Flutter source library.

## Architecture

- **Frontend**: Expo Router (file-based routing), React Native
- **Backend**: Express.js on port 5000 (serves landing page + API)
- **State**: AsyncStorage for local persistence, React Context for shared state
- **Fonts**: Inter (Google Fonts via @expo-google-fonts/inter)
- **Themes**: Dark navy (#0B0F1A) for main tabs; Pink/magenta (#C2185B) for POS flow

## Main Screens

- `app/login.tsx` — Login screen (demo: admin / admin123)
- `app/(tabs)/index.tsx` — Dashboard with stats, quick actions (New Sale goes directly to POS), recent sales
- `app/(tabs)/sales.tsx` — Invoice history with filter chips (All/Paid/Partial/Due) + pink FAB → POS
- `app/(tabs)/contacts.tsx` — Customer/lead/supplier management with search + filter
- `app/(tabs)/expenses.tsx` — Expense tracking by category with payment methods
- `app/(tabs)/reports.tsx` — Business reports: P&L, expense breakdown, contact summary, collection rate

## POS Flow (app/pos/)

Full-screen modal POS workflow (registered as `fullScreenModal` in root Stack):

- `app/pos/products.tsx` — Product catalog with search, quick add (+), quantity modal, cart bar
- `app/pos/cart.tsx` — Cart with qty controls (+/-), discount panel (%), and "Select Customer" CTA
- `app/pos/customer.tsx` — Customer search/select, QR scan option, walk-in shortcut, add new customer
- `app/pos/payment.tsx` — Payment method chips, amount paid input, shipping fee, payment summary
- `app/pos/invoice.tsx` — Printable invoice with barcode visualization, share + print buttons

## Key Files

- `context/AppContext.tsx` — All app state: sales, contacts, expenses, products, cart, auth
- `constants/colors.ts` — Dark theme color palette (main tabs)
- `constants/pos-colors.ts` — Light pink/magenta theme for POS screens
- `app/_layout.tsx` — Root layout with font loading, auth routing, pos modal registration
- `app/(tabs)/_layout.tsx` — Tab bar with liquid glass (iOS 26+) support

## Color Palettes

### Main Tabs (Dark Navy)
- Background: #0B0F1A, Card: #151B2D, Surface: #1E2540
- Primary: #4C6FFF, Secondary: #FF8A48, Success: #41D37E

### POS Flow (Light/Pink)
- Primary: #C2185B (magenta), Background: #F5F5F5, Surface: #FFFFFF
- Success: #4CAF50, Danger: #F44336

## Data & Currency

- Currency: MAD (Moroccan Dirham) in POS flow
- Demo products: dudu, rene, pikoti, kokix, polero, flurry, choco go, miyomi, etc.
- Demo sales pre-loaded with INV-001 through INV-004
- All data persisted in AsyncStorage
- Demo credentials: username `admin`, password `admin123`

## Workflows

- **Start Backend**: `npm run server:dev` (port 5000)
- **Start Frontend**: `npm run expo:dev` (port 8081)
