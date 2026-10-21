import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Dimensions, RefreshControl,
  Alert, Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { usePosStore, useProductStore, useAuthStore } from '@/stores';
import { salesApi, inventoryApi, branchesApi } from '@/lib/api';
import type { Product, LineItem } from '@/stores';
import CartSheet from '@/components/CartSheet';
import PaymentSheet from '@/components/PaymentSheet';
import TabsSheet from '@/components/TabsSheet';
import { Colors } from '@/constants/Colors';
import ProductImage from '@/components/ui/ProductImage';
import DSearchbar from '@/components/ui/DSearchbar';
import DChip from '@/components/ui/DChip';
import * as SecureStore from 'expo-secure-store';
import FeatureUpgradeHint from '@/components/FeatureUpgradeHint';
import { useAppTheme } from '@/lib/theme';
import { StatusBar } from 'expo-status-bar';
import { impact, notification, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const PRODUCT_COLS = SCREEN_W > 600 ? 4 : 3;
const TILE_GAP = 10;
const TILE_W = (SCREEN_W - 32 - (PRODUCT_COLS - 1) * TILE_GAP) / PRODUCT_COLS;


const ProductTile = React.memo(function ProductTile({ item, onPress }: { item: Product; onPress: () => void; index: number }) {
  const { colors } = useAppTheme();
  const outOfStock = item.stockQuantity <= 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.productTile,
        { width: TILE_W, opacity: outOfStock ? 0.5 : 1, backgroundColor: colors.surface },
        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
      ]}
    >
      <View style={{ marginBottom: 8 }}><ProductImage imageUrl={item.imageUrl} imageData={item.imageData} size={56} radius={12} iconSize={23} /></View>
      <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
      <Text style={[styles.productPrice, { color: colors.primary }]}>
        {item.sellingPrice.toFixed(0)}
      </Text>
      <Text style={[
        styles.productStock,
        { color: outOfStock ? colors.danger : colors.textSecondary },
      ]}>
        {outOfStock ? 'Out' : `${item.stockQuantity} ${item.unit}`}
      </Text>
    </Pressable>
  );
});

export default function PosScreen() {
  const { colors, dark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const auth = useAuthStore();
  const pos = usePosStore();
  const prodStore = useProductStore();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cartVisible, setCartVisible] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [tabsVisible, setTabsVisible] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string; address: string }[]>([]);
  const [branchMenuVisible, setBranchMenuVisible] = useState(false);

  const branchId = auth.user?.branchId || '';
  const cashierId = auth.user?.id || '';
  const cashierName = auth.user?.name || '';
  const currentBranchName = auth.user?.branchName || 'Store';

  const loadProducts = useCallback(async (searchStr?: string, catId?: string, page = 1, append = false) => {
    try {
      const res = await inventoryApi.getProducts(branchId, {
        search: searchStr, categoryId: catId || undefined, page, pageSize: 50,
      });
      const data = res.data;
      const products = Array.isArray(data) ? data : data?.products ?? data?.Products ?? [];
      prodStore.setProducts(append ? [...useProductStore.getState().products, ...products] : products);
      setProductPage(page);
      setHasMoreProducts(page * 50 < (data?.totalCount ?? data?.TotalCount ?? products.length));
    } catch {}
  }, [branchId, prodStore.setProducts]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await inventoryApi.getCategories();
      prodStore.setCategories(Array.isArray(res.data) ? res.data : res.data?.categories ?? []);
    } catch {}
  }, []);

  const loadTabs = useCallback(async () => {
    try {
      const res = await salesApi.getTabs(branchId);
      pos.setOpenTabs(res.data);
    } catch {}
  }, [branchId]);

  const loadBranches = useCallback(async () => {
    try {
      const res = await branchesApi.list();
      setBranches(Array.isArray(res.data) ? res.data : []);
    } catch {}
  }, []);

  const switchBranch = async (newBranchId: string) => {
    setBranchMenuVisible(false);
    if (newBranchId === branchId) return;
    try {
      const res = await branchesApi.select(newBranchId);
      const { token, user, tenantId } = res.data;
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      auth.login(token, user, tenantId, auth.features);
      pos.setCurrentSale(null);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not switch store');
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadTabs();
    loadBranches();
  }, [loadProducts, loadCategories, loadTabs, loadBranches]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(search, selectedCat || undefined, 1), loadTabs()]);
    setRefreshing(false);
  };

  const ensureSaleOpen = async (): Promise<string> => {
    if (pos.currentSale?.id) return pos.currentSale.id;
    const res = await salesApi.open(cashierId, cashierName, branchId);
    pos.setCurrentSale(res.data);
    return res.data.id;
  };

  const addProduct = async (product: Product) => {
    if (product.stockQuantity <= 0) {
      notification(NotificationFeedbackType.Warning);
      Alert.alert('Out of Stock', `${product.name} is out of stock.`);
      return;
    }
    try {
      impact(ImpactFeedbackStyle.Medium);
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
      const message = err.response?.status === 401
        ? 'Your mobile session was rejected. Sign out, sign back in, then try adding the item again.'
        : err.response?.data?.message || err.response?.data?.detail || err.response?.data?.title || err.message;
      Alert.alert('Could not add item', message || 'The sale could not be updated. Check your connection and try again.');
    }
  };

  const updateQuantity = async (lineItemId: string, delta: number) => {
    if (!pos.currentSale?.id) return;
    const item = pos.currentSale.lineItems.find((li) => li.id === lineItemId);
    if (!item) return;
    try {
      const res = await salesApi.updateQuantity(pos.currentSale.id, lineItemId, item.quantity + delta);
      pos.setCurrentSale(res.data);
    } catch {}
  };

  const removeItem = async (lineItemId: string) => {
    if (!pos.currentSale?.id) return;
    try {
      const res = await salesApi.removeItem(pos.currentSale.id, lineItemId);
      pos.setCurrentSale(res.data);
    } catch {}
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

  const updateCustomerNameLocally = (customerName: string) => {
    if (pos.currentSale) pos.setCurrentSale({ ...pos.currentSale, customerName });
  };

  const saveCustomerName = async (customerName: string) => {
    if (!pos.currentSale?.id) return;
    try {
      const response = await salesApi.updateCustomer(pos.currentSale.id, customerName);
      pos.setCurrentSale(response.data);
    } catch {
      Alert.alert('Could not save customer', 'Please try again.');
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={dark ? [...colors.gradientDark] as [string, string] : [...colors.gradient] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Pressable
              onPress={() => { if (branches.length > 1) setBranchMenuVisible(true); }}
              style={styles.branchSelector}
            >
              <Text style={styles.headerTitle}>DukaPoS</Text>
              <View style={styles.branchRow}>
                <Text style={styles.headerSubtitle} numberOfLines={1}>{currentBranchName}</Text>
                {branches.length > 1 && (
                  <MaterialCommunityIcons name="chevron-down" size={16} color="rgba(255,255,255,0.7)" />
                )}
              </View>
            </Pressable>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => setTabsVisible(true)} style={styles.headerBtn}>
              <MaterialCommunityIcons name="bookmark-outline" size={22} color="#FFF" />
              {pos.openTabs.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pos.openTabs.length}</Text>
                </View>
              )}
            </Pressable>
            {auth.features.length > 0 && !auth.features.includes('qr_code_scanning') ? (
              <FeatureUpgradeHint feature="qr_code_scanning" label="QR / barcode scanning" />
            ) : (
              <Pressable onPress={() => router.push('/scanner')} style={styles.headerBtn}>
                <MaterialCommunityIcons name="barcode-scan" size={22} color="#FFF" />
              </Pressable>
            )}
          </View>
        </View>

        <DSearchbar
          placeholder="Search products..."
          value={search}
          onChangeText={(q) => { setSearch(q); loadProducts(q, selectedCat || undefined); }}
          style={{ backgroundColor: colors.surface }}
        />
      </LinearGradient>

      <View style={styles.categoryBanner}>
        <Text style={[styles.catBannerLabel, { color: colors.textSecondary }]}>BROWSE CATEGORIES</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', name: 'All products' }, ...prodStore.categories]}
          keyExtractor={(cat) => cat.id}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item: cat }) => {
            const categoryId = cat.id === 'all' ? null : cat.id;
            const selected = selectedCat === categoryId;
            return (
              <DChip
                label={cat.name}
                selected={selected}
                icon={cat.id === 'all' ? 'view-grid-outline' : 'shape-outline'}
                onPress={() => {
                  setSelectedCat(categoryId);
                  loadProducts(search, categoryId || undefined);
                }}
              />
            );
          }}
        />
      </View>

      <FlatList
        data={prodStore.products}
        keyExtractor={(p) => p.id}
        numColumns={PRODUCT_COLS}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: TILE_GAP }}
        ItemSeparatorComponent={() => <View style={{ height: TILE_GAP }} />}
        renderItem={({ item, index }) => (
          <ProductTile item={item} onPress={() => addProduct(item)} index={index} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (hasMoreProducts && !loadingMoreProducts) {
            setLoadingMoreProducts(true);
            loadProducts(search, selectedCat || undefined, productPage + 1, true).finally(() => setLoadingMoreProducts(false));
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="package-variant" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No products found</Text>
          </View>
        }
      />

      {cartItemCount > 0 && (
        <View style={[styles.fabContainer, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
          <Pressable onPress={() => setCartVisible(true)}>
            <LinearGradient
              colors={colors.gradient as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fab, { shadowColor: colors.primary }]}
            >
              <MaterialCommunityIcons name="cart" size={22} color="#FFF" />
              <Text style={styles.fabText}>{cartItemCount} items</Text>
              <View style={styles.fabDivider} />
              <Text style={styles.fabTotal}>{formatKES(pos.currentSale!.grandTotal)}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {branchMenuVisible && (
        <Pressable style={styles.branchOverlay} onPress={() => setBranchMenuVisible(false)}>
          <View style={[styles.branchMenu, { top: insets.top + 60 }]}>
            <Text style={styles.branchMenuTitle}>Switch Store</Text>
            {branches.map((b) => (
              <Pressable
                key={b.id}
                style={[styles.branchItem, b.id === branchId && styles.branchItemActive]}
                onPress={() => switchBranch(b.id)}
              >
                <MaterialCommunityIcons
                  name={b.id === branchId ? 'radiobox-marked' : 'radiobox-blank'}
                  size={20}
                  color={b.id === branchId ? colors.primary : colors.textTertiary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.branchName, b.id === branchId && { color: colors.primary }]}>
                    {b.name}
                  </Text>
                  {b.address ? <Text style={styles.branchAddr}>{b.address}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      )}

      <CartSheet
        visible={cartVisible}
        onDismiss={() => setCartVisible(false)}
        sale={pos.currentSale}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onPark={parkSale}
        onCustomerNameChange={updateCustomerNameLocally}
        onCustomerNameSave={saveCustomerName}
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
        onPaymentUpdate={(sale) => pos.setCurrentSale(sale)}
        formatKES={formatKES}
      />
      <TabsSheet
        visible={tabsVisible}
        onDismiss={() => setTabsVisible(false)}
        tabs={pos.openTabs}
        onRecall={recallTab}
        formatKES={formatKES}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#BA1A1A',
    borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  categoryBanner: { marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 18, backgroundColor: 'rgba(0,109,50,0.06)' },
  catBannerLabel: { marginBottom: 9, fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  categoryList: { gap: 8, paddingRight: 4 },
  grid: { padding: 16, paddingBottom: 100 },
  productTile: {
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  productName: {
    fontSize: 12, fontWeight: '600', textAlign: 'center',
    minHeight: 30,
  },
  productPrice: {
    fontSize: 16, fontWeight: '800',
    marginTop: 2,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  productStock: {
    fontSize: 10, marginTop: 2,
  },
  empty: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 12,
  },
  emptyText: { fontSize: 16 },
  fabContainer: {
    position: 'absolute', left: 16, right: 16,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  fabDivider: {
    width: 1, height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  fabTotal: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  branchSelector: {},
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  branchOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 100,
  },
  branchMenu: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: '#EFF4FF', borderRadius: 20, padding: 16,
    zIndex: 101,
  },
  branchMenuTitle: { fontSize: 16, fontWeight: '700', color: '#0B1C30', marginBottom: 12, fontFamily: 'SpaceGrotesk_700Bold' },
  branchItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12,
  },
  branchItemActive: { backgroundColor: '#E5EEFF' },
  branchName: { fontSize: 15, fontWeight: '600', color: '#0B1C30' },
  branchAddr: { fontSize: 12, color: '#6C7B6C', marginTop: 2 },
});
