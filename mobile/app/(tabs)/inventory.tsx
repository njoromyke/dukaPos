import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Image, ScrollView,
  Alert, KeyboardAvoidingView, Platform, Modal, Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore, useProductStore } from '@/stores';
import { blobApi, inventoryApi } from '@/lib/api';
import type { Product, Category } from '@/stores';
import ScreenHeader from '@/components/ui/ScreenHeader';
import AnimatedCard from '@/components/ui/AnimatedCard';
import DButton from '@/components/ui/DButton';
import DTextInput from '@/components/ui/DTextInput';
import DSearchbar from '@/components/ui/DSearchbar';
import DChip from '@/components/ui/DChip';
import DFab from '@/components/ui/DFab';
import DDialog from '@/components/ui/DDialog';
import DIconButton from '@/components/ui/DIconButton';
import DSegmentedButtons from '@/components/ui/DSegmentedButtons';
import ProductImage from '@/components/ui/ProductImage';
import { useAppTheme } from '@/lib/theme';

interface ProductForm {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  unit: string;
  sellingPrice: string;
  costPrice: string;
  initialStock: string;
  vatRate: '16' | '0';
}

const EMPTY_FORM: ProductForm = {
  name: '', sku: '', barcode: '', categoryId: '', unit: 'piece',
  sellingPrice: '', costPrice: '', initialStock: '0', vatRate: '16',
};

export default function InventoryScreen() {
  const auth = useAuthStore();
  const prodStore = useProductStore();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const branchId = auth.user?.branchId || '';
  const canManageInventory = auth.user?.role === 'Admin'
    || auth.user?.role === 'Manager'
    || auth.user?.role === 'SuperAdmin'
    || auth.user?.permissions?.includes('inventory.manage')
    || auth.user?.permissions?.includes('admin.portal.view');
  const canAdjustStock = auth.user?.role === 'Admin' || auth.user?.role === 'SuperAdmin' || auth.user?.permissions?.includes('stock.adjust');

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productStep, setProductStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState('');
  const [stockReason, setStockReason] = useState('Adjustment');
  const [savingStock, setSavingStock] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);

  const loadProducts = useCallback(async (searchStr = search, catId = selectedCat || undefined, page = 1, append = false) => {
    if (!branchId || branchId === '00000000-0000-0000-0000-000000000000') {
      prodStore.setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await inventoryApi.getProducts(branchId, {
        search: searchStr || undefined,
        categoryId: catId,
        page,
        pageSize: 50,
      });
      const items = Array.isArray(data) ? data : (data?.products ?? data?.Products ?? []);
      prodStore.setProducts(append ? [...useProductStore.getState().products, ...items] : items);
      setProductPage(page);
      setHasMoreProducts(page * 50 < (data?.totalCount ?? data?.TotalCount ?? items.length));
    } catch (error: any) {
      Alert.alert('Inventory unavailable', error.response?.data?.message || 'Could not load products. Check your connection and branch assignment.');
    } finally {
      setLoading(false);
    }
  }, [branchId, prodStore.setProducts, search, selectedCat]);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await inventoryApi.getCategories();
      prodStore.setCategories(Array.isArray(data) ? data : data?.categories ?? []);
    } catch {
      prodStore.setCategories([]);
    }
  }, [prodStore.setCategories]);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(), loadCategories()]);
    setRefreshing(false);
  };

  const chooseImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a product image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const saveProduct = async () => {
    if (!form.name.trim() || !form.sku.trim() || !form.categoryId || !form.sellingPrice || !form.costPrice) {
      Alert.alert('Missing details', 'Enter the product name, SKU, category, selling price, and cost price.');
      return;
    }
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (image) {
        const upload = await blobApi.upload({ uri: image.uri, fileName: image.fileName ?? undefined, mimeType: image.mimeType ?? undefined }, 'product-image');
        imageUrl = upload.data.url;
      }
      await inventoryApi.createProduct({
        name: form.name.trim(), sku: form.sku.trim(), barcode: form.barcode.trim() || null,
        categoryId: form.categoryId, unit: form.unit,
        sellingPrice: Number(form.sellingPrice), costPrice: Number(form.costPrice),
        vatRate: Number(form.vatRate), isWeighed: form.unit === 'kg', imageUrl,
        branchId, initialStock: Number(form.initialStock || 0),
      });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setImage(null);
      await loadProducts();
      Alert.alert('Product saved', 'The product is ready to sell.');
    } catch (error: any) {
      Alert.alert('Could not save product', error.response?.data?.message || 'Check your connection and permissions, then try again.');
    } finally {
      setSaving(false);
    }
  };

  const advanceProductForm = () => {
    if (productStep === 0 && (!form.name.trim() || !form.sku.trim() || !form.categoryId)) {
      Alert.alert('Complete product details', 'Add a product name, SKU, and category to continue.');
      return;
    }
    if (productStep === 1 && (!form.sellingPrice || !form.costPrice || !Number.isFinite(Number(form.sellingPrice)) || !Number.isFinite(Number(form.costPrice)))) {
      Alert.alert('Check the prices', 'Enter valid selling and cost prices to continue.');
      return;
    }
    if (productStep < 2) setProductStep((step) => step + 1);
    else saveProduct();
  };

  const closeProductForm = () => {
    if (saving) return;
    setDialogOpen(false);
    setProductStep(0);
  };

  const saveAdjustment = async () => {
    const quantityChange = Number(stockDelta);
    if (!adjusting || !Number.isFinite(quantityChange) || quantityChange === 0 || !stockReason.trim()) {
      Alert.alert('Check adjustment', 'Enter a non-zero quantity change and a reason. Use a negative number to remove stock.');
      return;
    }
    setSavingStock(true);
    try {
      await inventoryApi.adjustStock({ productId: adjusting.id, branchId, quantityChange, reason: stockReason.trim(), adjustedBy: auth.user?.id });
      setAdjusting(null); setStockDelta(''); setStockReason('Adjustment');
      await loadProducts();
    } catch (error: any) {
      Alert.alert('Adjustment failed', error.response?.data?.message || 'Could not update stock.');
    } finally { setSavingStock(false); }
  };

  const formatKES = (n: number) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  const renderProduct = ({ item, index }: { item: Product; index: number }) => (
    <AnimatedCard delay={Math.min(index * 40, 300)} style={{ ...styles.productCard, backgroundColor: colors.surface }}>
      <View style={styles.cardRow}>
        <ProductImage imageUrl={item.imageUrl} imageData={item.imageData} size={56} radius={14} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.productName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.productSku, { color: colors.textSecondary }]}>SKU: {item.sku}</Text>
          <Text style={[styles.categoryLabel, { color: colors.primary }]}>{item.categoryName}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.productPrice, { color: colors.text }]}>{formatKES(item.sellingPrice)}</Text>
          <Text style={[styles.productStock, { color: item.stockQuantity > 0 ? colors.secondary : colors.danger }]}>
            {item.stockQuantity > 0 ? `${item.stockQuantity} ${item.unit}` : 'Out of stock'}
          </Text>
        </View>
      </View>
      {canAdjustStock && <DButton compact icon="clipboard-edit-outline" onPress={() => setAdjusting(item)} style={{ alignSelf: 'flex-end', marginTop: 4 }}>Record stock</DButton>}
    </AnimatedCard>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Inventory" subtitle={`${prodStore.products.length} products`} />
      <View style={styles.searchRow}>
        <DSearchbar
          placeholder="Search products..."
          value={search}
          onChangeText={(value) => { setSearch(value); loadProducts(value, selectedCat || undefined); }}
          style={{ backgroundColor: colors.surface }}
        />
      </View>

      <View style={styles.categoryBanner}>
        <Text style={[styles.catBannerLabel, { color: colors.textSecondary }]}>BROWSE CATEGORIES</Text>
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', name: 'All products' } as Category, ...prodStore.categories]}
          keyExtractor={(category) => category.id}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item: category }) => {
            const id = category.id === 'all' ? null : category.id;
            const selected = selectedCat === id;
            return (
              <DChip
                label={category.name}
                selected={selected}
                icon={category.id === 'all' ? 'view-grid-outline' : 'shape-outline'}
                onPress={() => { setSelectedCat(id); loadProducts(search, id || undefined); }}
              />
            );
          }}
        />
      </View>

      <FlatList
        data={prodStore.products} keyExtractor={(product) => product.id}
        renderItem={renderProduct} contentContainerStyle={{ padding: 16, paddingBottom: 110, flexGrow: 1 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} tintColor={colors.primary} />}
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
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{loading ? 'Loading products...' : 'No products found'}</Text>
          </View>
        }
      />

      {canManageInventory && (
        <DFab icon="plus" label="Add product" onPress={() => { setProductStep(0); setDialogOpen(true); }} />
      )}

      {/* Stock adjustment dialog */}
      <DDialog
        visible={!!adjusting}
        onDismiss={() => !savingStock && setAdjusting(null)}
        title="Record inventory"
        actions={
          <>
            <DButton onPress={() => setAdjusting(null)}>Cancel</DButton>
            <DButton mode="contained" onPress={saveAdjustment} loading={savingStock}>Save count</DButton>
          </>
        }
      >
        <Text style={{ color: colors.text, marginBottom: 12, fontSize: 14 }}>
          {adjusting?.name} · Current: {adjusting?.stockQuantity} {adjusting?.unit}
        </Text>
        <DTextInput
          label="Quantity change (+ add, - remove)"
          value={stockDelta}
          onChangeText={setStockDelta}
          keyboardType="numbers-and-punctuation"
        />
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 12, marginBottom: 6 }}>Reason</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {(['Adjustment', 'Damaged', 'Expired', 'PurchaseReceived', 'SaleReturn', 'Transfer'] as const).map((r) => (
            <DChip
              key={r}
              label={r.replace(/([A-Z])/g, ' $1').trim()}
              selected={stockReason === r}
              onPress={() => setStockReason(r)}
              compact
            />
          ))}
        </View>
      </DDialog>

      {/* Full-screen add product modal */}
      <Modal visible={dialogOpen} onRequestClose={closeProductForm} animationType="slide">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <StatusBar style="dark" />
          <View style={[styles.modalHeader, { paddingTop: insets.top + 14 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20 }}>Add a product</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 3, fontSize: 14 }}>
                Step {productStep + 1} of 3 · {['Product details', 'Pricing', 'Stock & tax'][productStep]}
              </Text>
            </View>
            <DIconButton icon="close" onPress={closeProductForm} disabled={saving} />
          </View>

          <View style={styles.stepTrack}>
            {['Details', 'Pricing', 'Stock & tax'].map((label, index) => {
              const active = index === productStep;
              const complete = index < productStep;
              return (
                <View key={label} style={styles.stepItem}>
                  <View style={[styles.stepNumber, { backgroundColor: active || complete ? colors.primary : colors.border }]}>
                    <Text style={{ color: active || complete ? '#FFF' : colors.textSecondary, fontWeight: '800' }}>
                      {complete ? '✓' : index + 1}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={{ color: active ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: active ? '800' : '600' }}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={styles.formContent}>
            {productStep === 0 && (
              <>
                <View style={[styles.photoCard, { backgroundColor: colors.surfaceContainer }]}>
                  {image ? (
                    <Image source={{ uri: image.uri }} style={styles.photoPreview} />
                  ) : (
                    <View style={[styles.photoPlaceholder, { backgroundColor: colors.secondaryLight }]}>
                      <MaterialCommunityIcons name="camera-plus-outline" size={34} color={colors.primary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: colors.text, fontSize: 16 }}>Product photo</Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 3, fontSize: 13 }}>A clear photo helps identify items at checkout.</Text>
                    <DButton compact mode="outlined" icon={image ? 'image-edit-outline' : 'camera-plus-outline'} onPress={chooseImage} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                      {image ? 'Change photo' : 'Upload photo'}
                    </DButton>
                  </View>
                </View>
                <DTextInput label="Product name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} autoCapitalize="words" />
                <DTextInput label="SKU" value={form.sku} onChangeText={(v) => setForm({ ...form, sku: v })} autoCapitalize="characters" />
                <DTextInput label="Barcode (optional)" value={form.barcode} onChangeText={(v) => setForm({ ...form, barcode: v })} keyboardType="numeric" />

                <View style={styles.sectionHeading}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Category</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Choose one</Text>
                </View>
                {prodStore.categories.length ? (
                  <View style={styles.choiceGrid}>
                    {prodStore.categories.map((category) => (
                      <DChip
                        key={category.id}
                        label={category.name}
                        selected={form.categoryId === category.id}
                        onPress={() => setForm({ ...form, categoryId: category.id })}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={[styles.emptyCategories, { backgroundColor: colors.border }]}>
                    <Text style={{ color: colors.textSecondary }}>No categories yet. Create a category before adding products.</Text>
                  </View>
                )}
              </>
            )}

            {productStep === 1 && (
              <>
                <View style={styles.sectionHeading}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>How is this sold?</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Select a unit</Text>
                </View>
                <View style={styles.choiceGrid}>
                  {['piece', 'kg', 'litre', 'pack', 'dozen'].map((unit) => (
                    <DChip
                      key={unit}
                      label={unit}
                      selected={form.unit === unit}
                      onPress={() => setForm({ ...form, unit })}
                    />
                  ))}
                </View>

                <View style={[styles.priceCard, { backgroundColor: colors.surfaceContainer }]}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Set your prices</Text>
                  <Text style={{ color: colors.textSecondary, marginBottom: 10, fontSize: 13 }}>Enter amounts in KES. VAT is included in the selling price.</Text>
                  <DTextInput label="Selling price (KES)" value={form.sellingPrice} onChangeText={(v) => setForm({ ...form, sellingPrice: v })} keyboardType="decimal-pad" left={{ icon: 'currency-kes' }} />
                  <DTextInput label="Cost price (KES)" value={form.costPrice} onChangeText={(v) => setForm({ ...form, costPrice: v })} keyboardType="decimal-pad" containerStyle={{ marginTop: 12 }} left={{ icon: 'currency-kes' }} />
                </View>
              </>
            )}

            {productStep === 2 && (
              <>
                <View style={[styles.summaryCard, { backgroundColor: colors.primaryLight }]}>
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>PRODUCT SUMMARY</Text>
                  <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 6, fontSize: 20 }}>{form.name || 'New product'}</Text>
                  <Text style={{ color: colors.primary, marginTop: 3, fontSize: 14 }}>
                    {form.sku || 'SKU'} · {prodStore.categories.find((c) => c.id === form.categoryId)?.name || 'Category'} · {form.unit}
                  </Text>
                  <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 8, fontSize: 16 }}>
                    Selling at KES {Number(form.sellingPrice || 0).toLocaleString('en-KE')}
                  </Text>
                </View>

                <View style={[styles.priceCard, { backgroundColor: colors.surfaceContainer }]}>
                  <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 4, fontSize: 16 }}>Opening stock</Text>
                  <Text style={{ color: colors.textSecondary, marginBottom: 10, fontSize: 13 }}>How many {form.unit} are available now?</Text>
                  <DTextInput label={`Quantity (${form.unit})`} value={form.initialStock} onChangeText={(v) => setForm({ ...form, initialStock: v })} keyboardType="decimal-pad" />
                </View>

                <View style={[styles.priceCard, { backgroundColor: colors.surfaceContainer }]}>
                  <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 10, fontSize: 16 }}>Tax settings</Text>
                  <DSegmentedButtons
                    value={form.vatRate}
                    onValueChange={(v) => setForm({ ...form, vatRate: v as '0' | '16' })}
                    buttons={[{ value: '16', label: 'VAT 16%' }, { value: '0', label: 'No VAT' }]}
                  />
                  <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 13 }}>Choose whether VAT applies to this product.</Text>
                </View>
              </>
            )}

            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 18) }]}>
              {productStep === 0 ? (
                <DButton onPress={closeProductForm} disabled={saving}>Cancel</DButton>
              ) : (
                <DButton icon="arrow-left" onPress={() => setProductStep((step) => step - 1)} disabled={saving}>Back</DButton>
              )}
              <DButton
                mode="contained"
                icon={productStep === 2 ? 'check' : 'arrow-right'}
                contentStyle={{ flexDirection: productStep === 2 ? 'row-reverse' : 'row' }}
                onPress={advanceProductForm}
                loading={saving}
                disabled={saving || (productStep === 0 && prodStore.categories.length === 0)}
              >
                {productStep === 2 ? 'Save product' : 'Continue'}
              </DButton>
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { paddingHorizontal: 16, paddingTop: 12 },
  catBannerLabel: { marginBottom: 9, fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  categoryBanner: { marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 18, backgroundColor: 'rgba(0,109,50,0.06)' },
  categoryList: { gap: 8, paddingRight: 4 },
  productCard: { borderRadius: 16, padding: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productName: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_600SemiBold' },
  productSku: { fontSize: 12, marginTop: 2 },
  categoryLabel: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  productPrice: { fontSize: 14, fontWeight: '800', fontFamily: 'SpaceGrotesk_700Bold' },
  productStock: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 70 },
  emptyText: { fontSize: 14, fontWeight: '500', marginTop: 12 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 },
  stepTrack: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14 },
  stepItem: { alignItems: 'center', gap: 6, flex: 1 },
  stepNumber: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  formContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 14, flexGrow: 1 },
  photoCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18 },
  photoPlaceholder: { width: 72, height: 72, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  photoPreview: { width: 72, height: 72, borderRadius: 16 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  emptyCategories: { padding: 16, borderRadius: 14 },
  priceCard: { padding: 16, borderRadius: 18 },
  summaryCard: { padding: 18, borderRadius: 20 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, marginTop: 'auto' },
});
