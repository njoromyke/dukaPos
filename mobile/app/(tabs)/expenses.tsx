import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import {
  Text, FAB, Portal, Dialog, Button, TextInput, Chip, IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useAuthStore } from '@/stores';
import { expensesApi } from '@/lib/api';
import ScreenHeader from '@/components/ui/ScreenHeader';
import AnimatedCard from '@/components/ui/AnimatedCard';
import { Colors } from '@/constants/Colors';

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Transport', 'Marketing', 'Maintenance', 'Other'];

const CATEGORY_ICONS: Record<string, string> = {
  Rent: 'home-city', Utilities: 'lightning-bolt', Salaries: 'account-group',
  Supplies: 'package-variant', Transport: 'truck', Marketing: 'bullhorn',
  Maintenance: 'wrench', Other: 'dots-horizontal',
};

const CATEGORY_COLORS: Record<string, string> = {
  Rent: '#8B5CF6', Utilities: '#F59E0B', Salaries: '#0EA5E9',
  Supplies: '#10B981', Transport: '#EF4444', Marketing: '#EC4899',
  Maintenance: '#6366F1', Other: '#64748B',
};

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  recordedByName: string;
}

export default function ExpensesScreen() {
  const auth = useAuthStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [category, setCategory] = useState('Other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.user?.branchId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterCat) params.category = filterCat;
      const res = await expensesApi.list(auth.user.branchId, params);
      setExpenses(res.data.items || res.data);
    } catch {}
    setLoading(false);
  }, [auth.user?.branchId, filterCat]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!auth.user || !amount || !description) return;
    try {
      await expensesApi.create({
        branchId: auth.user.branchId,
        category,
        description,
        amount: parseFloat(amount),
        expenseDate: new Date().toISOString().split('T')[0],
        recordedBy: auth.user.id,
        recordedByName: auth.user.name,
      });
      setDialogVisible(false);
      setDescription('');
      setAmount('');
      setCategory('Other');
      load();
    } catch {}
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete expense', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await expensesApi.delete(id); load(); } catch {}
        },
      },
    ]);
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const renderExpense = ({ item, index }: { item: Expense; index: number }) => {
    const catColor = CATEGORY_COLORS[item.category] || '#64748B';
    const catIcon = CATEGORY_ICONS[item.category] || 'dots-horizontal';

    return (
      <AnimatedCard delay={Math.min(index * 50, 300)}>
        <View style={styles.expenseRow}>
          <View style={[styles.catIcon, { backgroundColor: catColor + '15' }]}>
            <MaterialCommunityIcons name={catIcon as any} size={20} color={catColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.expenseDesc}>{item.description}</Text>
            <Text style={styles.expenseMeta}>{item.category} - {item.date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.expenseAmount}>{formatKES(item.amount)}</Text>
            <IconButton
              icon="delete-outline"
              size={16}
              iconColor={Colors.light.danger}
              onPress={() => handleDelete(item.id)}
              style={{ margin: 0 }}
            />
          </View>
        </View>
      </AnimatedCard>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Expenses"
        rightAction={
          <Animated.View entering={FadeIn.delay(300)} style={styles.totalBadge}>
            <Text style={styles.totalText}>{formatKES(total)}</Text>
          </Animated.View>
        }
      />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[null, ...CATEGORIES]}
        keyExtractor={(item) => item || 'all'}
        style={styles.catList}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => (
          <Chip
            compact
            selected={filterCat === item}
            onPress={() => setFilterCat(item)}
            style={[
              styles.chip,
              filterCat === item && styles.chipActive,
            ]}
            textStyle={{
              fontSize: 12,
              color: filterCat === item ? Colors.light.primary : '#64748B',
            }}
          >
            {item || 'All'}
          </Chip>
        )}
      />

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <Animated.View entering={FadeIn.delay(200)} style={styles.empty}>
            <MaterialCommunityIcons name="cash-off" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No expenses recorded</Text>
          </Animated.View>
        }
      />

      <FAB icon="plus" style={styles.fab} color="#FFF" onPress={() => setDialogVisible(true)} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}
          style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Add Expense</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              style={styles.input}
              outlineStyle={{ borderColor: '#E2E8F0' }}
              theme={{ roundness: 12 }}
            />
            <TextInput
              label="Amount (KES)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              outlineStyle={{ borderColor: '#E2E8F0' }}
              theme={{ roundness: 12 }}
            />
            <Text style={styles.catLabel}>Category</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  selected={category === c}
                  onPress={() => setCategory(c)}
                  compact
                  style={[
                    styles.chip,
                    category === c && { backgroundColor: (CATEGORY_COLORS[c] || '#64748B') + '15' },
                  ]}
                  textStyle={{ fontSize: 12 }}
                >
                  {c}
                </Chip>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} textColor="#64748B">Cancel</Button>
            <Button
              mode="contained"
              onPress={handleAdd}
              disabled={!description || !amount}
              style={{ borderRadius: 10 }}
              buttonColor={Colors.light.primary}
            >
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  totalBadge: {
    backgroundColor: Colors.light.accentLight,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
  },
  totalText: { fontSize: 14, fontWeight: '800', color: '#D97706' },
  catList: { maxHeight: 48, marginTop: 12 },
  chip: { backgroundColor: '#FFF', borderColor: '#E2E8F0', borderWidth: 1 },
  chipActive: { backgroundColor: Colors.light.primaryLight, borderColor: Colors.light.primary },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  expenseDesc: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  expenseMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  expenseAmount: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: 16 },
  fab: {
    position: 'absolute', right: 16, bottom: 24,
    borderRadius: 16, backgroundColor: Colors.light.accent,
  },
  dialog: { borderRadius: 20, backgroundColor: '#FFF' },
  dialogTitle: { fontWeight: '700' },
  input: { marginBottom: 14, backgroundColor: '#FFF' },
  catLabel: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
