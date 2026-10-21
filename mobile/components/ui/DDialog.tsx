import { useEffect } from 'react';
import { Modal, View, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/lib/theme';
import DText from './DText';
import DDivider from './DDivider';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function DDialog({ visible, onDismiss, title, children, actions }: Props) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.9, { duration: 150 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const dialogStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} statusBarTranslucent animationType="none">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.wrapper}>
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
          </Animated.View>
          <Animated.View style={[styles.dialog, { backgroundColor: colors.surfaceContainer }, dialogStyle]}>
            {title && (
              <>
                <DText variant="headlineSm" style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
                  {title}
                </DText>
                <DDivider />
              </>
            )}
            <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {actions && (
              <>
                <DDivider />
                <View style={styles.actions}>{actions}</View>
              </>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 16,
  },
});
