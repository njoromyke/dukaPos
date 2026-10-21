import { View, Pressable, Switch, StyleSheet, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import { impact, ImpactFeedbackStyle } from '@/lib/haptics';
import DText from './DText';
import DDivider from './DDivider';

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function DListSection({ title, children, style }: SectionProps) {
  const { colors } = useAppTheme();
  return (
    <View style={style}>
      {title && (
        <DText variant="labelMd" color={colors.textSecondary} style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          {title}
        </DText>
      )}
      {children}
    </View>
  );
}

interface ItemProps {
  title: string;
  description?: string;
  icon?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  chevron?: boolean;
}

export function DListItem({ title, description, icon, onPress, right, chevron }: ItemProps) {
  const { colors } = useAppTheme();
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={() => {
        if (onPress) {
          impact(ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      style={({ pressed }: any) => [
        styles.item,
        pressed && onPress && { backgroundColor: colors.primaryLight },
      ]}
    >
      {icon && (
        <View style={[styles.iconBg, { backgroundColor: colors.primaryLight }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={colors.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <DText variant="bodyMd" weight="500">{title}</DText>
        {description && <DText variant="bodySm" color={colors.textSecondary} style={{ marginTop: 1 }}>{description}</DText>}
      </View>
      {right}
      {chevron && <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBg: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});
