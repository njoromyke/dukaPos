import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

interface Props {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  gradient?: boolean;
}

export default function ScreenHeader({ title, subtitle, rightAction, gradient }: Props) {
  const insets = useSafeAreaInsets();

  if (gradient) {
    return (
      <LinearGradient
        colors={Colors.light.gradient as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientHeader, { paddingTop: insets.top + 12 }]}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.gradientTitle}>{title}</Text>
            {subtitle && <Text style={styles.gradientSubtitle}>{subtitle}</Text>}
          </View>
          {rightAction}
        </Animated.View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.headerContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rightAction}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  gradientHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  gradientTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  gradientSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});
