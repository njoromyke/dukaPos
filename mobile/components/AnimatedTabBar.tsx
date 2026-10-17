import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, interpolate, Extrapolation,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ICONS: Record<string, string> = {
  index: 'cart',
  inventory: 'package-variant',
  expenses: 'cash-minus',
  reports: 'chart-bar',
  settings: 'cog-outline',
};

const LABELS: Record<string, string> = {
  index: 'POS',
  inventory: 'Inventory',
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

  const iconColor = isFocused ? Colors.light.primary : Colors.light.tabBarInactive;
  const icon = ICONS[routeName] || 'circle';
  const label = LABELS[routeName] || routeName;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withSequence(
          withSpring(0.85, { damping: 15, stiffness: 400 }),
          withSpring(1, { damping: 12, stiffness: 200 }),
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
      <Animated.View style={[styles.dot, animatedDot, { backgroundColor: Colors.light.primary }]} />
    </Pressable>
  );
}

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
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
