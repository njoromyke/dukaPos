import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/lib/theme';

export default function DDivider({ style }: { style?: ViewStyle }) {
  const { colors } = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border + '20' }, style]} />;
}

const styles = StyleSheet.create({
  divider: { height: 1, marginHorizontal: 16 },
});
