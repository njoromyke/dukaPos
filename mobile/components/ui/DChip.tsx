import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import { selection } from '@/lib/haptics';
import DText from './DText';

interface Props {
  label: string;
  selected?: boolean;
  icon?: string;
  compact?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textColor?: string;
}

export default function DChip({ label, selected, icon, compact, onPress, style, textColor }: Props) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={() => {
        selection();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.compact,
        {
          backgroundColor: selected ? colors.primaryLight : colors.surfaceContainer,
        },
        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
        style,
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={compact ? 14 : 16}
          color={selected ? colors.primary : (textColor ?? colors.textSecondary)}
        />
      )}
      <DText
        variant={compact ? 'labelSm' : 'labelMd'}
        weight="700"
        color={selected ? colors.primary : (textColor ?? colors.textSecondary)}
      >
        {label}
      </DText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  compact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
