import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import DText from '@/components/ui/DText';

export default function FeatureUpgradeHint({ feature, label }: { feature: string; label: string }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => Alert.alert(
        `${label} plan feature`,
        'Available on Intermediate and Business plans. Contact the seller for an upgrade: 0729842998.',
      )}
      style={[styles.container, { backgroundColor: colors.primaryLight }]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons name="lock-outline" size={18} color={colors.primary} />
        <DText variant="labelMd" color={colors.text}>{label}</DText>
        <MaterialCommunityIcons name="information-outline" size={16} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
