export const colors = {
  navy: {
    50: '#E8EEF7', 100: '#C5D4E9', 200: '#8FAAD3',
    500: '#2B5BA8', 700: '#1B3A6B', 900: '#0D1D35',
  },
  gold: {
    50: '#FDF5E6', 100: '#F9E4B8', 200: '#F3CC82',
    500: '#C8973A', 700: '#8F6420', 900: '#4A3110',
  },
  gray: {
    50: '#F9FAFB', 100: '#F2F4F7', 200: '#E4E7EC',
    300: '#D0D5DD', 400: '#98A2B3', 500: '#667085',
    600: '#475467', 700: '#344054', 800: '#1D2939', 900: '#101828',
  },
  success: { 100: '#D1FAE5', 500: '#10B981', 700: '#065F46' },
  warning: { 100: '#FEF3C7', 500: '#F59E0B', 700: '#92400E' },
  error:   { 100: '#FEE2E2', 500: '#EF4444', 700: '#991B1B' },
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorToken = typeof colors;
