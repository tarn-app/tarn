import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { colors, spacing, radii } from './tokens';

// Configure React Native Paper theme with Tarn colors
export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.deepTarn,
    onPrimary: colors.white,
    primaryContainer: colors.mist,
    onPrimaryContainer: colors.deepTarn,
    secondary: colors.stone,
    onSecondary: colors.white,
    secondaryContainer: colors.mist,
    onSecondaryContainer: colors.stone,
    background: colors.snow,
    onBackground: colors.stone,
    surface: colors.white,
    onSurface: colors.stone,
    surfaceVariant: colors.mist,
    onSurfaceVariant: colors.stone,
    error: colors.alert,
    onError: colors.white,
    outline: colors.mist,
    outlineVariant: colors.mist,
  },
  roundness: radii.md,
};

export { colors, spacing, radii } from './tokens';
