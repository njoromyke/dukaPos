import { Text, type TextProps, type TextStyle } from 'react-native';
import { useAppTheme, type AppTheme } from '@/lib/theme';

type TypographyVariant = keyof AppTheme['typography'];

interface Props extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
}

export default function DText({ variant, color, weight, align, style, ...rest }: Props) {
  const theme = useAppTheme();
  const typo = variant ? theme.typography[variant] : undefined;
  return (
    <Text
      {...rest}
      style={[
        { color: color ?? theme.colors.text },
        typo && { fontSize: typo.fontSize, fontWeight: typo.fontWeight, lineHeight: typo.lineHeight, fontFamily: typo.fontFamily },
        weight && { fontWeight: weight },
        align && { textAlign: align },
        style,
      ]}
    />
  );
}
