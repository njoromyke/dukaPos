import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores';
import { expensesApi } from '@/lib/api';
import ScreenHeader from '@/components/ui/ScreenHeader';
import DButton from '@/components/ui/DButton';
import DTextInput from '@/components/ui/DTextInput';
import DChip from '@/components/ui/DChip';
import DFab from '@/components/ui/DFab';
import DDialog from '@/components/ui/DDialog';
import DIconButton from '@/components/ui/DIconButton';
import AnimatedCard from '@/components/ui/AnimatedCard';
import FeatureUpgradeHint from '@/components/FeatureUpgradeHint';
import { useAppTheme } from '@/lib/theme';

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
  const { colors } = useAppTheme();
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
            <Text style={[styles.expenseDesc, { color: colors.text }]}>{item.description}</Text>
            <Text style={[styles.expenseMeta, { color: colors.textSecondary }]}>{item.category} - {item.date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.expenseAmount, { color: colors.text }]}>{formatKES(item.amount)}</Text>
            <DIconButton
              icon="delete-outline"
              size={16}
              color={colors.danger}
              onPress={() => handleDelete(item.id)}
              style={{ margin: 0 }}
            />
          </View>
        </View>
      </AnimatedCard>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Expenses"
        rightAction={
          <View style={[styles.totalBadge, { backgroundColor: colors.accentLight }]}>
            <Text style={[styles.totalText, { color: colors.accent }]}>{formatKES(total)}</Text>
          </View>
        }
      />

      {auth.features.length > 0 && !auth.features.includes('expense_tracking') ? (
        <View style={{ padding: 16 }}>
          <FeatureUpgradeHint feature="expense_tracking" label="Expense tracking" />
        </View>
      ) : (
        <>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[null, ...CATEGORIES]}
            keyExtractor={(item) => item || 'all'}
            style={styles.catList}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item }) => (
              <DChip
                compact
                label={item || 'All'}
                selected={filterCat === item}
                onPress={() => setFilterCat(item)}
              />
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
              <View style={styles.empty}>
                <MaterialCommunityIcons name="cash-off" size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses recorded</Text>
              </View>
            }
          />
        </>
      )}

      {(!auth.features.length || auth.features.includes('expense_tracking')) && (
        <DFab icon="plus" onPress={() => setDialogVisible(true)} />
      )}

      <DDialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        title="Add Expense"
        actions={
          <>
            <DButton onPress={() => setDialogVisible(false)} textColor={colors.textSecondary}>Cancel</DButton>
            <DButton
              mode="contained"
              onPress={handleAdd}
              disabled={!description || !amount}
            >
              Add
            </DButton>
          </>
        }
      >
        <DTextInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          containerStyle={{ marginBottom: 14 }}
        />
        <DTextInput
          label="Amount (KES)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          containerStyle={{ marginBottom: 14 }}
        />
        <Text style={[styles.catLabel, { color: colors.textSecondary }]}>Category</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((c) => (
            <DChip
              key={c}
              label={c}
              selected={category === c}
              onPress={() => setCategory(c)}
              compact
            />
          ))}
        </View>
      </DDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  totalBadge: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
  },
  totalText: { fontSize: 14, fontWeight: '800' },
  catList: { maxHeight: 48, marginTop: 12 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  expenseDesc: { fontSize: 14, fontWeight: '600' },
  expenseMeta: { fontSize: 12, marginTop: 2 },
  expenseAmount: { fontSize: 16, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16 },
  catLabel: { fontSize: 13, marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
