import { Pressable, ActivityIndicator, StyleSheet, View, type ViewStyle, type TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import { impact, ImpactFeedbackStyle } from '@/lib/haptics';
import DText from './DText';

interface Props {
  children: React.ReactNode;
  mode?: 'contained' | 'outlined' | 'text' | 'contained-tonal';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  buttonColor?: string;
  textColor?: string;
  compact?: boolean;
}

export default function DButton({
  children, mode = 'contained', icon, loading, disabled, onPress,
  style, contentStyle, buttonColor, textColor, compact,
}: Props) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;

  const bg =
    mode === 'contained' ? (buttonColor ?? colors.primary) :
    mode === 'contained-tonal' ? colors.primaryLight :
    'transparent';

  const fg =
    textColor ??
    (mode === 'contained' ? '#FFFFFF' :
     mode === 'contained-tonal' ? colors.primary :
     colors.primary);

  return (
    <Pressable
      onPress={() => {
        if (isDisabled) return;
        impact(ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: bg },
        mode === 'outlined' && { backgroundColor: colors.surfaceContainer },
        pressed && !isDisabled && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      <View style={[styles.content, compact && styles.contentCompact, contentStyle]}>
        {loading ? (
          <ActivityIndicator size={18} color={fg} />
        ) : icon ? (
          <MaterialCommunityIcons name={icon as any} size={18} color={fg} />
        ) : null}
        <DText
          variant={compact ? 'labelMd' : 'labelLg'}
          weight="700"
          color={fg}
        >
          {children}
        </DText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  compact: {
    borderRadius: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 16,
  },
  contentCompact: {
    minHeight: 34,
    paddingHorizontal: 10,
  },
});
