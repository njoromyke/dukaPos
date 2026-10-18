import { useState, useEffect, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Dimensions, RefreshControl,
  Alert, Vibration, Pressable, Image,
} from 'react-native';
import {
  Text, Searchbar, Chip, IconButton, Badge, FAB,
  Portal, useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn, FadeInUp, useSharedValue, useAnimatedStyle,
  withSpring, withSequence, Layout as ReanimatedLayout,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { usePosStore, useProductStore, useAuthStore } from '@/stores';
import { salesApi, inventoryApi, blobApi } from '@/lib/api';
import type { Product, LineItem } from '@/stores';
import CartSheet from '@/components/CartSheet';
import PaymentSheet from '@/components/PaymentSheet';
import TabsSheet from '@/components/TabsSheet';
import { Colors } from '@/constants/Colors';

const { width: SCREEN_W } = Dimensions.get('window');
const PRODUCT_COLS = SCREEN_W > 600 ? 4 : 3;
const TILE_GAP = 10;
const TILE_W = (SCREEN_W - 32 - (PRODUCT_COLS - 1) * TILE_GAP) / PRODUCT_COLS;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ProductTile({ item, onPress, index }: { item: Product; onPress: () => void; index: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const outOfStock = item.stockQuantity <= 0;

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 30, 300)).duration(300).springify()}>
      <AnimatedPressable
        onPressIn={() => { scale.value = withSpring(0.93, { damping: 15, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 200 }); }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        style={[styles.productTile, { width: TILE_W, opacity: outOfStock ? 0.5 : 1 }, animStyle]}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl.startsWith('http') ? item.imageUrl : `${blobApi.getUrl(item.imageUrl.replace('/api/blobs/', ''))}` }} style={styles.tileImage} />
        ) : (
          <View style={styles.tileIcon}>
            <MaterialCommunityIcons name="cube-outline" size={22} color={Colors.light.primary} />
          </View>
        )}
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>
          {item.sellingPrice.toFixed(0)}
        </Text>
        <Text style={[
          styles.productStock,
          { color: outOfStock ? Colors.light.danger : Colors.light.textTertiary },
        ]}>
          {outOfStock ? 'Out' : `${item.stockQuantity} ${item.unit}`}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function PosScreen() {
  const theme = useTheme();
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

  const branchId = auth.user?.branchId || '';
  const cashierId = auth.user?.id || '';
  const cashierName = auth.user?.name || '';

  const loadProducts = useCallback(async (searchStr?: string, catId?: string) => {
    try {
      const res = await inventoryApi.getProducts(branchId, {
        search: searchStr, categoryId: catId || undefined,
      });
      prodStore.setProducts(res.data);
    } catch {}
  }, [branchId]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await inventoryApi.getCategories();
      prodStore.setCategories(res.data);
    } catch {}
  }, []);

  const loadTabs = useCallback(async () => {
    try {
      const res = await salesApi.getTabs(branchId);
      pos.setOpenTabs(res.data);
    } catch {}
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

  const ensureSaleOpen = async (): Promise<string> => {
    if (pos.currentSale?.id) return pos.currentSale.id;
    const res = await salesApi.open(cashierId, cashierName, branchId);
    pos.setCurrentSale(res.data);
    return res.data.id;
  };

  const addProduct = async (product: Product) => {
    if (product.stockQuantity <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Out of Stock', `${product.name} is out of stock.`);
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
      {/* Header */}
      <LinearGradient
        colors={Colors.light.gradient as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>DukaPoS</Text>
            <Text style={styles.headerSubtitle}>{cashierName}</Text>
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
            <Pressable
              onPress={() => router.push('/scanner')}
              style={styles.headerBtn}
            >
              <MaterialCommunityIcons name="barcode-scan" size={22} color="#FFF" />
            </Pressable>
          </View>
        </Animated.View>

        <Searchbar
          placeholder="Search products..."
          value={search}
          onChangeText={(q) => { setSearch(q); loadProducts(q, selectedCat || undefined); }}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor="#94A3B8"
          placeholderTextColor="#94A3B8"
        />
      </LinearGradient>

      {/* Category chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: 'all', name: 'All' }, ...prodStore.categories]}
        keyExtractor={(c) => c.id}
        style={styles.catList}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item: cat }) => (
          <Chip
            compact
            selected={selectedCat === (cat.id === 'all' ? null : cat.id)}
            onPress={() => {
              const catId = cat.id === 'all' ? null : cat.id;
              setSelectedCat(catId);
              loadProducts(search, catId || undefined);
            }}
            style={[
              styles.catChip,
              selectedCat === (cat.id === 'all' ? null : cat.id) && styles.catChipActive,
            ]}
            textStyle={[
              styles.catChipText,
              selectedCat === (cat.id === 'all' ? null : cat.id) && styles.catChipTextActive,
            ]}
          >
            {cat.name}
          </Chip>
        )}
      />

      {/* Product grid */}
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
        ListEmptyComponent={
          <Animated.View entering={FadeIn.delay(200)} style={styles.empty}>
            <MaterialCommunityIcons name="package-variant" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No products found</Text>
          </Animated.View>
        }
      />

      {/* Floating cart */}
      {cartItemCount > 0 && (
        <Animated.View
          entering={FadeInUp.springify()}
          style={styles.fabContainer}
        >
          <Pressable onPress={() => setCartVisible(true)}>
            <LinearGradient
              colors={Colors.light.gradient as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fab}
            >
              <MaterialCommunityIcons name="cart" size={22} color="#FFF" />
              <Text style={styles.fabText}>
                {cartItemCount} items
              </Text>
              <View style={styles.fabDivider} />
              <Text style={styles.fabTotal}>
                {formatKES(pos.currentSale!.grandTotal)}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}

      {/* Bottom sheets */}
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
    backgroundColor: Colors.light.danger,
    borderRadius: 10, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  searchbar: {
    height: 44, borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 0,
    shadowOpacity: 0,
  },
  searchInput: { fontSize: 14 },
  catList: { maxHeight: 48, marginTop: 12 },
  catChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  catChipActive: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
  },
  catChipText: { fontSize: 12, color: '#64748B' },
  catChipTextActive: { color: Colors.light.primary, fontWeight: '700' },
  grid: { padding: 16, paddingBottom: 100 },
  productTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tileIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  tileImage: {
    width: 38, height: 38, borderRadius: 10,
    marginBottom: 8,
  },
  productName: {
    fontSize: 12, fontWeight: '600', textAlign: 'center',
    color: '#334155', minHeight: 30,
  },
  productPrice: {
    fontSize: 16, fontWeight: '800', color: Colors.light.primary,
    marginTop: 2,
  },
  productStock: {
    fontSize: 10, marginTop: 2,
  },
  empty: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 12,
  },
  emptyText: { color: '#94A3B8', fontSize: 16 },
  fabContainer: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    shadowColor: Colors.light.primary,
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
});
