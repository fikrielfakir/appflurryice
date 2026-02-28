# BizPOS — Business Management App

A React Native (Expo) business POS/CRM management mobile app. Rebuilt from a Flutter source library.

## Architecture

- **Frontend**: Expo Router (file-based routing), React Native
- **Backend**: Express.js on port 5000 (serves landing page + API)
- **State**: AsyncStorage for local persistence, React Context for shared state
- **Fonts**: Inter (Google Fonts via @expo-google-fonts/inter)
- **Theme**: Dark navy blue (Colors.dark in constants/colors.ts)

## Screens

- `app/login.tsx` — Login screen (demo: admin / admin123)
- `app/(tabs)/index.tsx` — Dashboard with stats, greeting, quick actions, recent sales
- `app/(tabs)/sales.tsx` — Sales list + add new sale modal
- `app/(tabs)/contacts.tsx` — Customer/lead/supplier management with search + filter
- `app/(tabs)/expenses.tsx` — Expense tracking by category with payment methods
- `app/(tabs)/reports.tsx` — Business reports: P&L, expense breakdown, contact summary, collection rate

## Key Files

- `context/AppContext.tsx` — All app state (sales, contacts, expenses, auth)
- `constants/colors.ts` — Dark theme color palette
- `app/_layout.tsx` — Root layout with font loading, auth routing
- `app/(tabs)/_layout.tsx` — Tab bar with liquid glass (iOS 26+) support

## Color Palette

- Background: #0B0F1A
- Card: #151B2D
- Surface: #1E2540
- Primary: #4C6FFF (blue)
- Secondary: #FF8A48 (orange)
- Success: #41D37E (green)
- Warning: #FFC107 (yellow)
- Danger: #FF5252 (red)

## Data

Demo data pre-loaded on first launch. All data persisted in AsyncStorage.
Demo credentials: username `admin`, password `admin123`

## Workflows

- **Start Backend**: `npm run server:dev` (port 5000)
- **Start Frontend**: `npm run expo:dev` (port 8081)
