import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/lib/theme';

interface Props {
  progress: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export default function DProgressBar({ progress, color, height = 6, style }: Props) {
  const { colors } = useAppTheme();
  const barColor = color ?? colors.primary;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.border }, style]}>
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, height, borderRadius: height / 2, backgroundColor: barColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden' },
  fill: {},
});
