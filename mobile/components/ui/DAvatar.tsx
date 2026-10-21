import { View, StyleSheet, Text } from 'react-native';

interface Props {
  label: string;
  size?: number;
  backgroundColor?: string;
  color?: string;
}

export default function DAvatar({ label, size = 48, backgroundColor = '#0EA5E9', color = '#FFF' }: Props) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      <Text style={[styles.text, { color, fontSize: size * 0.4 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700' },
});
