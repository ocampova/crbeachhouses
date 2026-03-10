export const colors = {
  // Primary dark background
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',

  // Accent - gold/financial
  primary: '#F59E0B',
  primaryLight: '#FCD34D',
  primaryDark: '#D97706',

  // Secondary - emerald/growth
  secondary: '#10B981',
  secondaryLight: '#34D399',
  secondaryDark: '#059669',

  // Danger/loss
  danger: '#EF4444',
  dangerLight: '#FCA5A5',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Chart colors
  chartBlue: '#3B82F6',
  chartPurple: '#8B5CF6',
  chartOrange: '#F97316',
  chartPink: '#EC4899',

  // Avatar
  avatarSkin: '#FBBF24',
  avatarSkinDark: '#F59E0B',
  avatarHair: '#1E293B',
  avatarEyes: '#1E293B',

  // Borders
  border: '#334155',
  borderLight: '#475569',

  // Overlays
  overlay: 'rgba(15, 23, 42, 0.9)',

  // Gradients (use as arrays)
  gradientPrimary: ['#F59E0B', '#D97706'] as const,
  gradientSecondary: ['#10B981', '#059669'] as const,
  gradientDark: ['#1E293B', '#0F172A'] as const,
  gradientPurple: ['#6366F1', '#4F46E5'] as const,
};

export type Colors = typeof colors;
