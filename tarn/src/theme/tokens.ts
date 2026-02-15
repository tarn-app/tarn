// Tarn Design Tokens
// Neutral palette - nothing that screams "period tracker"

export const colors = {
  // Primary
  deepTarn: '#1C3A4B',    // Primary brand, headers, primary buttons
  stone: '#4A5568',       // Body text, secondary UI
  mist: '#E8ECEF',        // Backgrounds, cards
  snow: '#FAFBFC',        // Page backgrounds

  // Accent
  currentDay: '#2D6A4F',  // Today indicator, active states
  period: '#6B7280',      // Period days on calendar (NOT red/pink)
  predicted: '#9CA3AF',   // Predicted days (lighter, dashed)
  ovulation: '#059669',   // Ovulation confirmed indicator
  alert: '#DC2626',       // Destructive actions only

  // Phase card tints (use with 10-15% opacity for backgrounds)
  phaseMenstrual: '#6B7280',
  phaseFollicular: '#3B82F6',
  phaseOvulation: '#059669',
  phaseLuteal: '#8B5CF6',

  // Functional
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

