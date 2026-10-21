import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/lib/theme';
import DText from './DText';

interface Props {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  gradient?: boolean;
}

export default function ScreenHeader({ title, subtitle, rightAction, gradient }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, dark } = useAppTheme();

  if (gradient) {
    return (
      <LinearGradient
        colors={dark ? (colors.gradient as unknown as [string, string]) : (colors.gradient as unknown as [string, string])}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientHeader, { paddingTop: insets.top + 12 }]}
      >
        <StatusBar style="light" />
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <DText variant="displayMd" color="#FFFFFF">{title}</DText>
            {subtitle && <DText variant="bodyMd" color="rgba(255,255,255,0.8)" style={{ marginTop: 2 }}>{subtitle}</DText>}
          </View>
          {rightAction}
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.background }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={styles.headerContent}>
        <View style={{ flex: 1 }}>
          <DText variant="displayMd">{title}</DText>
          {subtitle && <DText variant="bodyMd" color={colors.textSecondary} style={{ marginTop: 2 }}>{subtitle}</DText>}
        </View>
        {rightAction}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  gradientHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
