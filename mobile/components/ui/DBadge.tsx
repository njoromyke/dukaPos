import { View, StyleSheet, Text } from 'react-native';

interface Props {
  count: number;
  color?: string;
  style?: object;
}

export default function DBadge({ count, color = '#EF4444', style }: Props) {
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -4,
    borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: { color: '#FFF', fontSize: 10, fontWeight: '800' },
});
