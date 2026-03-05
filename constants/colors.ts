// constants/colors.ts
// FlurryIce — Single source of truth for all colors

export const Colors = {
  // ── Brand Core ────────────────────────────────
  primary:      '#1C439C',  // Deep Navy — trust, premium
  primaryLight: '#1B3FA0',  // Medium Navy — buttons, active states
  primaryDark:  '#061540',  // Darker navy — pressed states
  secondary:    '#64748B',  // Secondary color
  accent:       '#00B4D8',  // Ice Blue — highlights, badges, links
  accentLight:  '#38C9E8',  // Lighter ice blue
  accentSoft:   '#E0F7FC',  // Ice Blue tint — chips, selected bg
  transparent:   '#ffffff00',

  // ── Neutrals ─────────────────────────────────
  white:        '#FFFFFF',
  background:   '#F8FAFC',  // App background
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
  text:          '#0F172A', // Default text color

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

  // ── Dark Theme ────────────────────────────────
  dark: {
    primary: '#1A3C8F',
    secondary: '#2D3748',
    gold: '#D4AF37',
    background: '#0B0F1A',
    surface: '#151C28',
    card: '#1E2738',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#2D3748',
    success: '#2ECC71',
    danger: '#EF4444',
    warning: '#F0B429',
  },
};

// Quick-access named semantic colors
export const StatusColors = {
  paid:    { bg: Colors.successBg,  text: Colors.successText, border: Colors.success },
  partial: { bg: Colors.warningBg,  text: Colors.warningText, border: Colors.warning },
  due:     { bg: Colors.dangerBg,   text: Colors.dangerText,  border: Colors.danger  },
  draft:   { bg: Colors.inputBg,    text: Colors.textSecondary, border: Colors.border },
};

export default Colors;
