import * as Haptics from 'expo-haptics';
import { useHapticsStore } from '@/stores';

export function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) {
  if (!useHapticsStore.getState().enabled) return;
  Haptics.impactAsync(style);
}

export function notification(type: Haptics.NotificationFeedbackType) {
  if (!useHapticsStore.getState().enabled) return;
  Haptics.notificationAsync(type);
}

export function selection() {
  if (!useHapticsStore.getState().enabled) return;
  Haptics.selectionAsync();
}

export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
