import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/theme';
import { impact, ImpactFeedbackStyle } from '@/lib/haptics';
import DText from './DText';

interface Props {
  icon: string;
  label?: string;
  onPress: () => void;
  style?: ViewStyle;
  color?: string;
  gradient?: boolean;
}

export default function DFab({ icon, label, onPress, style, color, gradient = true }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const inner = (
    <View style={styles.content}>
      <MaterialCommunityIcons name={icon as any} size={22} color="#FFF" />
      {label && <DText variant="labelLg" weight="700" color="#FFF">{label}</DText>}
    </View>
  );

  return (
    <Pressable
      onPress={() => {
        impact(ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [
        styles.container,
        { bottom: Math.max(insets.bottom, 16) + 16, shadowColor: colors.primary },
        pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {gradient ? (
        <LinearGradient
          colors={colors.gradient as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View style={[styles.gradient, { backgroundColor: color ?? colors.primary }]}>
          {inner}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 16,
  },
  gradient: {
    borderRadius: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
});
