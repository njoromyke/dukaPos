import React, { useState, useEffect, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Dimensions, RefreshControl, Alert, Vibration,
} from 'react-native';
import {
  Text, Searchbar, Chip, Card, IconButton, Button, Badge, FAB,
  Portal, Modal, Divider, Surface, useTheme,
} from 'react-native-paper';
import { usePosStore, useProductStore, useAuthStore } from '../stores';
import { salesApi, inventoryApi } from '../lib/api';
import type { Product, LineItem } from '../stores';
import CartSheet from '../components/CartSheet';
import PaymentSheet from '../components/PaymentSheet';
import TabsSheet from '../components/TabsSheet';

const { width: SCREEN_W } = Dimensions.get('window');
const PRODUCT_COLS = SCREEN_W > 600 ? 4 : 3;
const TILE_W = (SCREEN_W - 24 - (PRODUCT_COLS - 1) * 8) / PRODUCT_COLS;

export default function PosScreen() {
  const theme = useTheme();
  const auth = useAuthStore();
  const pos = usePosStore();
  const prodStore = useProductStore();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cartVisible, setCartVisible] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [tabsVisible, setTabsVisible] = useState(false);

  const branchId = auth.user?.branchId || '';
  const cashierId = auth.user?.id || '';
  const cashierName = auth.user?.name || '';

  // ── Data loading ──
  const loadProducts = useCallback(async (searchStr?: string, catId?: string) => {
    try {
      const res = await inventoryApi.getProducts(branchId, {
        search: searchStr, categoryId: catId || undefined,
      });
      prodStore.setProducts(res.data);
    } catch { /* snackbar */ }
  }, [branchId]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await inventoryApi.getCategories();
      prodStore.setCategories(res.data);
    } catch { /* */ }
  }, []);

  const loadTabs = useCallback(async () => {
    try {
      const res = await salesApi.getTabs(branchId);
      pos.setOpenTabs(res.data);
    } catch { /* */ }
  }, [branchId]);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadTabs();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(search, selectedCat || undefined), loadTabs()]);
    setRefreshing(false);
  };

  // ── Cart operations ──
  const ensureSaleOpen = async (): Promise<string> => {
    if (pos.currentSale?.id) return pos.currentSale.id;
    const res = await salesApi.open(cashierId, cashierName, branchId);
    pos.setCurrentSale(res.data);
    return res.data.id;
  };

  const addProduct = async (product: Product) => {
    try {
      Vibration.vibrate(30);
      const saleId = await ensureSaleOpen();
      const res = await salesApi.addItem(saleId, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unit: product.unit,
        unitPrice: product.sellingPrice,
        vatRatePercent: product.vatRate >= 0 ? product.vatRate : 0,
      });
      pos.setCurrentSale(res.data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add item');
    }
  };

  const updateQuantity = async (lineItemId: string, delta: number) => {
    if (!pos.currentSale?.id) return;
    const item = pos.currentSale.lineItems.find((li) => li.id === lineItemId);
    if (!item) return;
    try {
      const res = await salesApi.updateQuantity(pos.currentSale.id, lineItemId, item.quantity + delta);
      pos.setCurrentSale(res.data);
    } catch { /* */ }
  };

  const removeItem = async (lineItemId: string) => {
    if (!pos.currentSale?.id) return;
    try {
      const res = await salesApi.removeItem(pos.currentSale.id, lineItemId);
      pos.setCurrentSale(res.data);
    } catch { /* */ }
  };

  const parkSale = async (customerName?: string) => {
    if (!pos.currentSale?.id) return;
    try {
      await salesApi.parkAsTab(pos.currentSale.id, cashierId, cashierName, customerName);
      pos.setCurrentSale(null);
      setCartVisible(false);
      loadTabs();
      Alert.alert('Parked', 'Sale saved as tab');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to park');
    }
  };

  const recallTab = async (tabId: string) => {
    try {
      const res = await salesApi.recallTab(tabId, cashierId);
      pos.setCurrentSale(res.data);
      setTabsVisible(false);
      loadTabs();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to recall');
    }
  };

  const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  const cartItemCount = pos.currentSale?.lineItems.length || 0;

  // ── Product tile ──
  const renderProduct = ({ item }: { item: Product }) => (
    <Card
      style={[styles.productTile, { width: TILE_W, backgroundColor: theme.colors.surface }]}
      onPress={() => addProduct(item)}
      mode="outlined"
    >
      <Card.Content style={styles.tileContent}>
        <Text variant="bodySmall" numberOfLines={2} style={styles.productName}>
          {item.name}
        </Text>
        <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '800' }}>
          {item.sellingPrice.toFixed(0)}
        </Text>
        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
          {item.stockQuantity > 0 ? `${item.stockQuantity} ${item.unit}` : 'Out'}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Header bar ── */}
      <Surface style={styles.header} elevation={0}>
        <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.primary }}>
          DukaPoS
        </Text>
        <Chip compact textStyle={{ fontSize: 11 }}>{cashierName}</Chip>
        <View style={{ flex: 1 }} />
        <Badge visible={pos.openTabs.length > 0} size={18} style={{ position: 'absolute', right: 88, top: 8 }}>
          {pos.openTabs.length}
        </Badge>
        <IconButton icon="bookmark-outline" size={22} onPress={() => setTabsVisible(true)} />
        <IconButton icon="lock-outline" size={22} onPress={() => pos.setLocked(true)} />
      </Surface>

      {/* ── Search ── */}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search or scan barcode..."
          value={search}
          onChangeText={(q) => { setSearch(q); loadProducts(q, selectedCat || undefined); }}
          style={styles.searchbar}
          inputStyle={{ fontSize: 14 }}
        />
      </View>

      {/* ── Category chips ── */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: 'all', name: 'All' }, ...prodStore.categories]}
        keyExtractor={(c) => c.id}
        style={styles.catList}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
        renderItem={({ item: cat }) => (
          <Chip
            compact
            selected={selectedCat === (cat.id === 'all' ? null : cat.id)}
            onPress={() => {
              const catId = cat.id === 'all' ? null : cat.id;
              setSelectedCat(catId);
              loadProducts(search, catId || undefined);
            }}
            textStyle={{ fontSize: 12 }}
          >
            {cat.name}
          </Chip>
        )}
      />

      {/* ── Product grid ── */}
      <FlatList
        data={prodStore.products}
        keyExtractor={(p) => p.id}
        numColumns={PRODUCT_COLS}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: 8 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={renderProduct}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>
              No products found
            </Text>
          </View>
        }
      />

      {/* ── Floating cart button ── */}
      {cartItemCount > 0 && (
        <FAB
          icon="cart"
          label={`${cartItemCount} items · ${formatKES(pos.currentSale!.grandTotal)}`}
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color="#fff"
          onPress={() => setCartVisible(true)}
        />
      )}

      {/* ── Bottom sheets ── */}
      <Portal>
        <CartSheet
          visible={cartVisible}
          onDismiss={() => setCartVisible(false)}
          sale={pos.currentSale}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onPark={parkSale}
          onPay={() => { setCartVisible(false); setPaymentVisible(true); }}
          formatKES={formatKES}
        />
        <PaymentSheet
          visible={paymentVisible}
          onDismiss={() => setPaymentVisible(false)}
          sale={pos.currentSale}
          onComplete={() => {
            pos.setCurrentSale(null);
            setPaymentVisible(false);
          }}
          formatKES={formatKES}
        />
        <TabsSheet
          visible={tabsVisible}
          onDismiss={() => setTabsVisible(false)}
          tabs={pos.openTabs}
          onRecall={recallTab}
          formatKES={formatKES}
        />
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd',
  },
  searchRow: { paddingHorizontal: 12, paddingTop: 8 },
  searchbar: { height: 42, borderRadius: 10 },
  catList: { maxHeight: 46, marginTop: 8 },
  grid: { padding: 12 },
  productTile: { borderRadius: 10, overflow: 'hidden' },
  tileContent: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, gap: 2 },
  productName: { textAlign: 'center', fontWeight: '600', minHeight: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  fab: { position: 'absolute', bottom: 24, left: 16, right: 16, borderRadius: 16 },
});
