import { Image, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/lib/theme';
import { blobApi } from '@/lib/api';
import { useAuthStore } from '@/stores';

type Props = { imageUrl?: string | null; imageData?: string | null; size?: number; radius?: number; iconSize?: number };

export default function ProductImage({ imageUrl, imageData, size = 56, radius = 14, iconSize = 24 }: Props) {
  const { colors } = useAppTheme();
  const token = useAuthStore((state) => state.token);
  const tenantId = useAuthStore((state) => state.tenantId);
  const imageId = imageUrl?.split('/').filter(Boolean).pop();
  const uri = imageUrl?.startsWith('http') ? imageUrl : imageId ? blobApi.getUrl(imageId) : null;
  const apiImage = uri?.startsWith(blobApi.getUrl('')) ?? false;
  const headers = apiImage ? { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}) } : undefined;
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: radius, backgroundColor: colors.secondaryLight }]}>
      {imageData || uri ? (
        <Image source={{ uri: imageData || uri!, headers: imageData ? undefined : headers }} resizeMode="cover" style={{ width: size, height: size, borderRadius: radius }} />
      ) : (
        <MaterialCommunityIcons name="image-outline" size={iconSize} color={colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ frame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' } });
