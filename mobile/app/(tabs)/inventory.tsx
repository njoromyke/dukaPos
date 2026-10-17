import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Searchbar, Chip, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { useAuthStore, useProductStore } from '@/stores';
import { inventoryApi } from '@/lib/api';
import type { Product, Category } from '@/stores';
import ScreenHeader from '@/components/ui/ScreenHeader';
import AnimatedCard from '@/components/ui/AnimatedCard';
import { Colors } from '@/constants/Colors';

export default function InventoryScreen() {
  const auth = useAuthStore();
  const prodStore = useProductStore();
  const branchId = auth.user?.branchId || '';

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(search, selectedCat || undefined), loadCategories()]);
    setRefreshing(false);
  };

  const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  const renderProduct = ({ item, index }: { item: Product; index: number }) => (
    <AnimatedCard delay={Math.min(index * 40, 300)} style={styles.productCard}>
      <View style={styles.cardRow}>
        <View style={[styles.productIcon, { backgroundColor: Colors.light.primaryLight }]}>
          <MaterialCommunityIcons name="cube-outline" size={22} color={Colors.light.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productSku}>SKU: {item.sku}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.productPrice}>{formatKES(item.sellingPrice)}</Text>
          <Text style={[
            styles.productStock,
            { color: item.stockQuantity > 0 ? Colors.light.secondary : Colors.light.danger },
          ]}>
            {item.stockQuantity > 0 ? `${item.stockQuantity} ${item.unit}` : 'Out of stock'}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
      </View>
    </AnimatedCard>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Inventory" subtitle={`${prodStore.products.length} products`} />

      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search products..."
          value={search}
          onChangeText={(q) => { setSearch(q); loadProducts(q, selectedCat || undefined); }}
          style={styles.searchbar}
          inputStyle={{ fontSize: 14 }}
        />
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: 'all', name: 'All' } as Category, ...prodStore.categories]}
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
              styles.chip,
              selectedCat === (cat.id === 'all' ? null : cat.id) && styles.chipActive,
            ]}
            textStyle={{
              fontSize: 12,
              color: selectedCat === (cat.id === 'all' ? null : cat.id)
                ? Colors.light.primary : '#64748B',
            }}
          >
            {cat.name}
          </Chip>
        )}
      />

      <FlatList
        data={prodStore.products}
        keyExtractor={(p) => p.id}
        renderItem={renderProduct}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Animated.View entering={FadeIn.delay(200)} style={styles.empty}>
            <MaterialCommunityIcons name="package-variant" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No products found</Text>
          </Animated.View>
        }
      />

      <FAB
        icon="plus"
        label="Add product"
        style={styles.fab}
        color="#FFF"
        onPress={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  searchRow: { paddingHorizontal: 16, paddingTop: 12 },
  searchbar: { height: 44, borderRadius: 12, backgroundColor: '#FFF', elevation: 0 },
  catList: { maxHeight: 48, marginTop: 12 },
  chip: { backgroundColor: '#FFF', borderColor: '#E2E8F0', borderWidth: 1 },
  chipActive: { backgroundColor: Colors.light.primaryLight, borderColor: Colors.light.primary },
  productCard: { borderRadius: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  productName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  productSku: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: '800', color: Colors.light.primary },
  productStock: { fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: 16 },
  fab: {
    position: 'absolute', bottom: 24, right: 16,
    borderRadius: 16, backgroundColor: Colors.light.primary,
  },
});
