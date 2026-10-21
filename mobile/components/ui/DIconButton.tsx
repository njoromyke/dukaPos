import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import { impact, ImpactFeedbackStyle } from '@/lib/haptics';

interface Props {
  icon: string;
  size?: number;
  color?: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  outlined?: boolean;
}

export default function DIconButton({ icon, size = 22, color, onPress, disabled, style, outlined }: Props) {
  const { colors } = useAppTheme();
  const iconColor = color ?? colors.text;
  const hitSize = Math.max(size + 16, 36);
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        impact(ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { width: hitSize, height: hitSize, borderRadius: hitSize / 2 },
        outlined && { borderWidth: 1, borderColor: colors.border },
        pressed && !disabled && { opacity: 0.6, transform: [{ scale: 0.92 }] },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <MaterialCommunityIcons name={icon as any} size={size} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
});
