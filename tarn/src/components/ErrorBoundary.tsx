import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';
import { manualWipe } from '../lib/crypto/destruct';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showWipeConfirm: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showWipeConfirm: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error info for debugging (in dev only)
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    // In production, we intentionally do NOT log errors externally
    // to maintain privacy - no crash reporting, no analytics
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleWipeRequest = () => {
    // Show confirmation dialog before wiping
    Alert.alert(
      'Wipe All Data?',
      'This will permanently delete all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe Data',
          style: 'destructive',
          onPress: this.handleWipe,
        },
      ]
    );
  };

  handleWipe = async () => {
    await manualWipe();
    // After wipe, the app will restart in setup mode
    this.setState({ hasError: false, error: null, showWipeConfirm: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              The app encountered an unexpected error. Your data remains encrypted and secure.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}

            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={this.handleRetry}
                style={styles.button}
              >
                Try Again
              </Button>

              <Button
                mode="outlined"
                onPress={this.handleWipeRequest}
                style={styles.wipeButton}
                textColor={colors.alert}
              >
                Wipe Data & Reset
              </Button>
            </View>

            <Text style={styles.hint}>
              If this error persists, try wiping data and starting fresh.
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.snow,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.deepTarn,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.stone,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  errorBox: {
    backgroundColor: colors.mist,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xl,
    maxWidth: '100%',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.alert,
  },
  actions: {
    width: '100%',
    maxWidth: 300,
    gap: spacing.md,
  },
  button: {
    backgroundColor: colors.deepTarn,
  },
  wipeButton: {
    borderColor: colors.alert,
  },
  hint: {
    fontSize: 14,
    color: colors.predicted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
