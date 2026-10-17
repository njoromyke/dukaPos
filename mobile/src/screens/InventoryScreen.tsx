import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import {
  Text, Searchbar, Chip, Card, FAB, useTheme, IconButton,
} from 'react-native-paper';
import { useAuthStore, useProductStore } from '../stores';
import { inventoryApi } from '../lib/api';
import type { Product, Category } from '../stores';

export default function InventoryScreen({ navigation }: any) {
  const theme = useTheme();
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

  const renderProduct = ({ item }: { item: Product }) => (
    <Card
      mode="outlined"
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { product: item })}
    >
      <Card.Content style={styles.cardContent}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyLarge" style={{ fontWeight: '600' }}>{item.name}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            SKU: {item.sku}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="titleSmall" style={{ fontWeight: '800', color: theme.colors.primary }}>
            {formatKES(item.sellingPrice)}
          </Text>
          <Text
            variant="labelSmall"
            style={{ color: item.stockQuantity > 0 ? theme.colors.secondary : theme.colors.error }}
          >
            {item.stockQuantity > 0 ? `${item.stockQuantity} ${item.unit}` : 'Out of stock'}
          </Text>
        </View>
        <IconButton icon="chevron-right" size={20} />
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerBar}>
        <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.primary }}>
          Inventory
        </Text>
      </View>

      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
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

      <FlatList
        data={prodStore.products}
        keyExtractor={(p) => p.id}
        renderItem={renderProduct}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>No products found</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        label="Add product"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#fff"
        onPress={() => navigation.navigate('ProductDetail', { product: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  searchbar: { height: 42, borderRadius: 10 },
  catList: { maxHeight: 46, marginTop: 8 },
  productCard: { borderRadius: 10 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  fab: { position: 'absolute', bottom: 24, right: 16, borderRadius: 16 },
});
