import { View, Pressable, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/theme';

const ICONS: Record<string, string> = {
  index: 'cart',
  inventory: 'package-variant',
  sales: 'receipt-text-outline',
  expenses: 'cash-minus',
  reports: 'chart-bar',
  settings: 'cog-outline',
};

const LABELS: Record<string, string> = {
  index: 'POS',
  inventory: 'Inventory',
  sales: 'Sales',
  expenses: 'Expenses',
  reports: 'Reports',
  settings: 'Settings',
};

function TabItem({
  routeName,
  isFocused,
  onPress,
  onLongPress,
}: {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);
  const progress = useSharedValue(isFocused ? 1 : 0);

  if (isFocused && progress.value !== 1) {
    progress.value = withSpring(1, { damping: 15, stiffness: 200 });
  } else if (!isFocused && progress.value !== 0) {
    progress.value = withTiming(0, { duration: 200 });
  }

  const animatedIcon = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      {
        translateY: interpolate(
          progress.value, [0, 1], [0, -2],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const animatedDot = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  const iconColor = isFocused ? colors.primary : colors.textSecondary;
  const icon = ICONS[routeName] || 'circle';
  const label = LABELS[routeName] || routeName;

  return (
    <Pressable
      onPress={() => {
        scale.value = withSequence(
          withSpring(0.9, { damping: 20, stiffness: 400 }),
          withSpring(1, { damping: 15, stiffness: 200 }),
        );
        onPress();
      }}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      <Animated.View style={animatedIcon}>
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={iconColor}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color: iconColor, fontWeight: isFocused ? '700' : '500' },
        ]}
      >
        {label}
      </Text>
      <Animated.View style={[styles.dot, animatedDot, { backgroundColor: colors.primary }]} />
    </Pressable>
  );
}

type AnimatedTabBarProps = {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  descriptors: Record<string, unknown>;
  emitter?: any;
  navigation?: any;
};

export default function AnimatedTabBar({ state, descriptors, emitter, navigation }: AnimatedTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = (emitter ?? navigation)?.emit?.({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event?.defaultPrevented) {
              const destination = route.name === 'index'
                ? '/(tabs)'
                : `/(tabs)/${route.name}`;
              router.navigate(destination as Href);
            }
          };

          const onLongPress = () => {
            (emitter ?? navigation)?.emit?.({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  },
  bar: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
});
