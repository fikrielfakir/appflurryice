# BizPOS (FlurryIce) Redesign

## Project Status
- **Design System**: New "Deep Navy + Ice Blue" theme implemented in `constants/`.
- **Colors**: Consolidated into `constants/colors.ts` with `Colors` and `StatusColors`.
- **Typography/Layout**: Standardized in `constants/typography.ts` and `constants/layout.ts`.
- **Refactor**: All main screens (`login`, `setup`, `dashboard`, `sales`, `products`, `transfers`, `contacts`, `expenses`, `reports`) updated to use new color tokens and imports from `@/constants`.
- **Components**: New reusable components in `components/common/` (`AppHeader`, `Button`, `Card`, `StatusBadge`, `SearchBar`).

## Rules
- All design tokens MUST be imported from `@/constants` barrel.
- Use `Colors.surface` instead of `background`.
- Use `Colors.textPrimary` instead of `text`.
- Use `Colors.accent` for primary highlights.
- Header height is fixed at `HeaderHeight.bar` (56).
