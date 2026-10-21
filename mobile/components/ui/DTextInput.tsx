import { useState, useRef } from 'react';
import {
  View, TextInput, Pressable, StyleSheet, Animated,
  type TextInputProps, type ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import DText from './DText';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  mode?: 'outlined';
  left?: { icon: string };
  right?: { icon: string; onPress?: () => void };
  visibilityToggle?: boolean;
  dense?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
  style?: ViewStyle;
}

export default function DTextInput({
  label, left, right, visibilityToggle, dense,
  error, containerStyle, style,
  secureTextEntry, onFocus, onBlur, value,
  ...rest
}: Props) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = (e: any) => {
    setFocused(true);
    Animated.timing(labelAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setFocused(false);
    if (!value) {
      Animated.timing(labelAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();
    }
    onBlur?.(e);
  };

  const isSecure = secureTextEntry && !visible;
  const bg = focused ? colors.surface : colors.surfaceContainer;
  const borderColor = error ? colors.danger : focused ? colors.primary : 'transparent';
  const borderWidth = focused || error ? 2 : 0;
  const floated = focused || !!value;

  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = focused ? colors.primary : colors.textSecondary;

  return (
    <View style={[containerStyle, style]}>
      <View
        style={[
          styles.container,
          dense && styles.dense,
          { borderColor, borderWidth, backgroundColor: bg },
        ]}
      >
        {left && (
          <MaterialCommunityIcons
            name={left.icon as any}
            size={20}
            color={focused ? colors.primary : colors.textTertiary}
            style={{ marginRight: 8, marginTop: floated && label ? 6 : 0 }}
          />
        )}

        <View style={{ flex: 1 }}>
          {label && floated && (
            <Animated.Text
              style={[styles.floatedLabel, { fontSize: labelSize, color: labelColor }]}
              numberOfLines={1}
            >
              {label}
            </Animated.Text>
          )}
          <TextInput
            value={value}
            secureTextEntry={isSecure}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.input,
              { color: colors.text, fontFamily: 'Inter_400Regular' },
              dense && styles.inputDense,
              floated && label && styles.inputWithLabel,
            ]}
            {...rest}
            placeholder={floated ? rest.placeholder : label}
          />
        </View>

        {visibilityToggle && secureTextEntry && (
          <Pressable onPress={() => setVisible(!visible)} hitSlop={8}>
            <MaterialCommunityIcons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>
        )}
        {right && !visibilityToggle && (
          <Pressable onPress={right.onPress} hitSlop={8}>
            <MaterialCommunityIcons name={right.icon as any} size={20} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>
      {error && (
        <DText variant="labelSm" color={colors.danger} style={{ marginTop: 4, marginLeft: 4 }}>
          {error}
        </DText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  dense: { minHeight: 44 },
  floatedLabel: {
    marginTop: 8,
    marginBottom: -2,
  },
  input: {
    fontSize: 15,
    paddingVertical: 14,
    padding: 0,
  },
  inputDense: {
    paddingVertical: 10,
  },
  inputWithLabel: {
    paddingTop: 2,
    paddingBottom: 10,
  },
});
