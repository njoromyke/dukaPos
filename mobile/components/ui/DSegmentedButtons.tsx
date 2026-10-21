import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import { selection } from '@/lib/haptics';
import DText from './DText';

interface Segment {
  value: string;
  label: string;
  icon?: string;
}

interface Props {
  value: string;
  onValueChange: (value: string) => void;
  buttons: Segment[];
  style?: ViewStyle;
}

export default function DSegmentedButtons({ value, onValueChange, buttons, style }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceContainer }, style]}>
      {buttons.map((btn) => {
        const active = value === btn.value;
        return (
          <Pressable
            key={btn.value}
            onPress={() => {
              selection();
              onValueChange(btn.value);
            }}
            style={[
              styles.segment,
              { backgroundColor: active ? colors.primaryLight : 'transparent' },
            ]}
          >
            {btn.icon && (
              <MaterialCommunityIcons
                name={btn.icon as any}
                size={16}
                color={active ? colors.primary : colors.textSecondary}
              />
            )}
            <DText
              variant="labelMd"
              weight={active ? '700' : '500'}
              color={active ? colors.primary : colors.textSecondary}
            >
              {btn.label}
            </DText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    gap: 4,
    padding: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
