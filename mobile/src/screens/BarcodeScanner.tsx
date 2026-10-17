import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, IconButton, Surface, useTheme } from 'react-native-paper';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { inventoryApi } from '../lib/api';

interface Props {
  onProductFound: (product: any) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onProductFound, onClose }: Props) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastBarcode, setLastBarcode] = useState('');

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge" style={{ textAlign: 'center', marginBottom: 16 }}>
          Camera permission is needed to scan barcodes
        </Text>
        <Button mode="contained" onPress={requestPermission}>Grant permission</Button>
        <Button mode="text" onPress={onClose} style={{ marginTop: 8 }}>Cancel</Button>
      </View>
    );
  }

  const handleBarcode = async (result: BarcodeScanningResult) => {
    if (scanned) return;
    const barcode = result.data;
    if (barcode === lastBarcode) return;

    setScanned(true);
    setLastBarcode(barcode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const res = await inventoryApi.getByBarcode(barcode);
      if (res.data) {
        onProductFound(res.data);
      } else {
        Alert.alert('Not found', `No product matches barcode: ${barcode}`);
      }
    } catch {
      Alert.alert('Error', 'Failed to look up barcode');
    } finally {
      // Allow re-scan after a brief pause
      setTimeout(() => setScanned(false), 1500);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
        onBarcodeScanned={handleBarcode}
      />

      {/* Viewfinder overlay */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <Text variant="bodyMedium" style={{ color: '#fff', textAlign: 'center', marginTop: 16 }}>
            Point at a barcode to scan
          </Text>
          {lastBarcode ? (
            <Surface style={styles.lastScan} elevation={2}>
              <Text variant="labelSmall" style={{ color: theme.colors.outline }}>Last scan</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>{lastBarcode}</Text>
            </Surface>
          ) : null}
        </View>
      </View>

      {/* Close button */}
      <IconButton
        icon="close"
        iconColor="#fff"
        size={28}
        style={styles.closeBtn}
        onPress={onClose}
      />
    </View>
  );
}

const FINDER_SIZE = 260;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject },
  topOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  bottomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center' },
  middleRow: { flexDirection: 'row', height: FINDER_SIZE },
  sideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  viewfinder: { width: FINDER_SIZE, height: FINDER_SIZE },
  corner: {
    position: 'absolute', width: 32, height: 32,
    borderColor: '#4f8cff', borderWidth: 3,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  closeBtn: { position: 'absolute', top: 48, right: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  lastScan: {
    marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center',
  },
});
