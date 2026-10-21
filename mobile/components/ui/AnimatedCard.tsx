import { memo } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  delay?: number;
  style?: ViewStyle;
}

export default memo(function AnimatedCard({ children, onPress, style }: Props) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface },
        style,
        pressed && onPress && { opacity: 0.95, transform: [{ scale: 0.98 }] },
      ]}
    >
      {children}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
  },
});
