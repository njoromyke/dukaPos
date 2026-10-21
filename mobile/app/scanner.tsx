import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { inventoryApi, salesApi } from '@/lib/api';
import { usePosStore, useAuthStore } from '@/stores';
import { notification, NotificationFeedbackType } from '@/lib/haptics';

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuthStore();
  const pos = usePosStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || adding) return;
    setScanned(true);
    setAdding(true);
    notification(NotificationFeedbackType.Success);
    setResult(data);

    try {
      const branchId = auth.user?.branchId || '';
      const res = await inventoryApi.getByBarcode(data, branchId);
      const product = res.data;
      if (product) {
        const cashierId = auth.user?.id || '';
        const cashierName = auth.user?.name || '';

        let saleId = pos.currentSale?.id;
        if (!saleId) {
          const saleRes = await salesApi.open(cashierId, cashierName, branchId);
          pos.setCurrentSale(saleRes.data);
          saleId = saleRes.data.id;
        }

        const addRes = await salesApi.addItem(saleId!, {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unit: product.unit,
          unitPrice: product.sellingPrice,
          vatRatePercent: product.vatRate >= 0 ? product.vatRate : 0,
        });
        pos.setCurrentSale(addRes.data);
        setResult(`${product.name} added · scan another item`);
        setAdding(false);
      } else {
        setResult(`No product found for ${data}`);
        setAdding(false);
      }
    } catch {
      setResult('Could not add item. Try scanning again.');
      setAdding(false);
    }
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialCommunityIcons name="camera-off" size={48} color="#94A3B8" />
        <Text style={styles.permText}>Camera access needed to scan barcodes</Text>
        <Pressable onPress={requestPermission} style={styles.permBtn}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
      />

      <View style={[styles.topOverlay, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialCommunityIcons name="close" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.scanTitle}>Scan Barcode</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.scanFrame}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
      </View>

      <Animated.View entering={FadeInDown.delay(300)} style={styles.bottomHint}>
        <MaterialCommunityIcons name="barcode-scan" size={20} color="#FFF" />
        <Text style={styles.hintText}>
          {scanned ? result : 'Point camera at a barcode · scan again to add another'}
        </Text>
      </Animated.View>
      {scanned && !adding && (
        <Pressable
          accessibilityRole="button"
          onPress={() => { setResult(null); setScanned(false); }}
          style={[styles.nextScan, { bottom: insets.bottom + 20 }]}
        >
          <MaterialCommunityIcons name="barcode-scan" size={20} color="#FFF" />
          <Text style={styles.nextScanText}>Scan next item</Text>
        </Pressable>
      )}
    </View>
  );
}

const FRAME = 250;
const CORNER = 30;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
  permText: { fontSize: 16, color: '#94A3B8', textAlign: 'center' },
  permBtn: {
    backgroundColor: '#0EA5E9', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12,
  },
  permBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, zIndex: 10,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  scanFrame: {
    position: 'absolute', top: '50%', left: '50%',
    width: FRAME, height: FRAME,
    marginTop: -FRAME / 2, marginLeft: -FRAME / 2,
  },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER,
    borderColor: '#0EA5E9', borderWidth: 3,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  bottomHint: {
    position: 'absolute', bottom: 60, left: 40, right: 40,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 14, borderRadius: 14,
  },
  hintText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  nextScan: {
    position: 'absolute', bottom: 20, alignSelf: 'center', flexDirection: 'row',
    alignItems: 'center', gap: 8, backgroundColor: '#0EA5E9',
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14,
  },
  nextScanText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
