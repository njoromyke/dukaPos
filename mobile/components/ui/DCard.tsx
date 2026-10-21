import type { PropsWithChildren } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/lib/theme';

export default function DCard({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
  },
});
