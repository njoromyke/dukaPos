import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import DText from './DText';

interface Props {
  label: string;
  value: string;
  icon: string;
  color: string;
  bgColor: string;
  delay?: number;
}

export default memo(function StatCard({ label, value, icon, color, bgColor }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconBg, { backgroundColor: bgColor }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <DText variant="labelMd" color={colors.textSecondary}>{label}</DText>
      <DText variant="headlineSm" color={color} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </DText>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    minWidth: '45%',
  },
  iconBg: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
});
