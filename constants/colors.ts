// constants/colors.ts
// FlurryIce — Single source of truth for all colors

export const Colors = {
  // ── Brand Core ────────────────────────────────
  primary:      '#0A2463',  // Deep Navy — trust, premium
  primaryLight: '#1B3FA0',  // Medium Navy — buttons, active states
  primaryDark:  '#061540',  // Darker navy — pressed states
  accent:       '#00B4D8',  // Ice Blue — highlights, badges, links
  accentLight:  '#38C9E8',  // Lighter ice blue
  accentSoft:   '#E0F7FC',  // Ice Blue tint — chips, selected bg

  // ── Neutrals ─────────────────────────────────
  white:        '#FFFFFF',
  surface:      '#F8FAFC',  // App background
  card:         '#FFFFFF',  // Card background
  border:       '#E2E8F0',  // Dividers and card borders
  borderLight:  '#F1F5F9',  // Subtle borders
  inputBg:      '#F1F5F9',  // Input fields

  // ── Text ──────────────────────────────────────
  textPrimary:   '#0F172A', // Headlines
  textSecondary: '#64748B', // Labels, captions
  textMuted:     '#94A3B8', // Placeholders, disabled
  textOnDark:    '#FFFFFF', // Text on primary/dark backgrounds
  textOnAccent:  '#FFFFFF', // Text on accent backgrounds

  // ── Semantic / Status ─────────────────────────
  success:    '#10B981',
  successBg:  '#ECFDF5',
  successText:'#065F46',

  warning:    '#F59E0B',
  warningBg:  '#FFFBEB',
  warningText:'#92400E',

  danger:     '#EF4444',
  dangerBg:   '#FEF2F2',
  dangerText: '#991B1B',

  info:       '#3B82F6',
  infoBg:     '#EFF6FF',
  infoText:   '#1E40AF',

  // ── Gradients (use with LinearGradient) ───────
  gradientStart:  '#0A2463',
  gradientMid:    '#1B3FA0',
  gradientEnd:    '#0E3A8A',

  // ── Overlay ───────────────────────────────────
  overlay:        'rgba(10, 36, 99, 0.5)',
  overlayLight:   'rgba(10, 36, 99, 0.15)',

  // ── Tab Bar ───────────────────────────────────
  tabActive:      '#0A2463',
  tabInactive:    '#94A3B8',
  tabBar:         '#FFFFFF',

  // ── Sidebar ───────────────────────────────────
  sidebarBg:      '#0A2463',
  sidebarItem:    'rgba(255,255,255,0.08)',
  sidebarItemActive: 'rgba(0,180,216,0.18)',
  sidebarText:    '#FFFFFF',
  sidebarTextMuted: 'rgba(255,255,255,0.6)',

  // Compatibility with old code
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E2E8F0',
    primary: '#0A2463',
    secondary: '#1B3FA0',
    accent: '#00B4D8',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    gold: '#F59E0B',
  },
  dark: {
    background: '#061540',
    card: '#0A2463',
    surface: '#1B3FA0',
    border: '#1E2D5A',
    primary: '#1B3FA0',
    primaryDark: '#061540',
    gold: '#F59E0B',
    goldLight: '#FFFBEB',
    secondary: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    accent: '#00B4D8',
  }
};

// Quick-access named semantic colors
export const StatusColors = {
  paid:    { bg: Colors.successBg,  text: Colors.successText, border: Colors.success },
  partial: { bg: Colors.warningBg,  text: Colors.warningText, border: Colors.warning },
  due:     { bg: Colors.dangerBg,   text: Colors.dangerText,  border: Colors.danger  },
  draft:   { bg: Colors.inputBg,    text: Colors.textSecondary, border: Colors.border },
};

export default Colors;
