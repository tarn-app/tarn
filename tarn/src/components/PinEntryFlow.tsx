import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { PinPad } from './PinPad';
import { colors, spacing } from '../theme';

type Step = 'enter' | 'confirm';

interface PinEntryFlowProps {
  title: string;
  subtitle?: string;
  confirmTitle?: string;
  confirmSubtitle?: string;
  onComplete: (pin: string) => void | Promise<void>;
  onValidate?: (pin: string) => Promise<string | null> | string | null;
  onBack?: () => void;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
  loadingText?: string;
}

export function PinEntryFlow({
  title,
  subtitle,
  confirmTitle = 'Confirm PIN',
  confirmSubtitle = 'Enter your PIN again',
  onComplete,
  onValidate,
  onBack,
  minLength = 4,
  maxLength = 6,
  disabled = false,
  loadingText,
}: PinEntryFlowProps) {
  const [step, setStep] = useState<Step>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleEnterSubmit = useCallback(async () => {
    if (pin.length >= minLength) {
      if (onValidate) {
        setIsValidating(true);
        try {
          const validationError = await onValidate(pin);
          if (validationError) {
            setError(true);
            setErrorMessage(validationError);
            setPin('');
            setTimeout(() => {
              setError(false);
              setErrorMessage(null);
            }, 2000);
            return;
          }
        } finally {
          setIsValidating(false);
        }
      }
      setConfirmPin('');
      setStep('confirm');
    }
  }, [pin, minLength, onValidate]);

  const handleConfirmSubmit = useCallback(async () => {
    if (confirmPin !== pin) {
      setError(true);
      setConfirmPin('');
      setTimeout(() => setError(false), 500);
      return;
    }

    try {
      await onComplete(pin);
    } catch {
      setError(true);
      setConfirmPin('');
      setTimeout(() => setError(false), 500);
    }
  }, [confirmPin, pin, onComplete]);

  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      setPin('');
      setConfirmPin('');
      setStep('enter');
    } else if (onBack) {
      onBack();
    }
  }, [step, onBack]);

  const currentTitle = step === 'enter' ? title : confirmTitle;
  const currentSubtitle = step === 'enter' ? subtitle : confirmSubtitle;
  const currentValue = step === 'enter' ? pin : confirmPin;
  const currentOnChange = step === 'enter' ? setPin : setConfirmPin;
  const currentOnSubmit = step === 'enter' ? handleEnterSubmit : handleConfirmSubmit;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{currentTitle}</Text>
        {currentSubtitle && (
          <Text style={styles.subtitle}>{currentSubtitle}</Text>
        )}
      </View>

      <PinPad
        value={currentValue}
        onChange={currentOnChange}
        onSubmit={currentOnSubmit}
        error={error}
        disabled={disabled || isValidating}
        minLength={minLength}
        maxLength={maxLength}
      />

      {error && step === 'enter' && errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}

      {error && step === 'confirm' && (
        <Text style={styles.errorText}>PINs don't match. Try again.</Text>
      )}

      {loadingText && disabled && (
        <Text style={styles.loadingText}>{loadingText}</Text>
      )}

      {(step === 'confirm' || onBack) && (
        <Text style={styles.backLink} onPress={handleBack}>
          ← Back
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.deepTarn,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.stone,
    textAlign: 'center',
  },
  errorText: {
    color: colors.alert,
    fontSize: 14,
    marginTop: spacing.lg,
  },
  loadingText: {
    color: colors.stone,
    fontSize: 14,
    marginTop: spacing.lg,
  },
  backLink: {
    color: colors.stone,
    fontSize: 14,
    marginTop: spacing.xl,
  },
});
