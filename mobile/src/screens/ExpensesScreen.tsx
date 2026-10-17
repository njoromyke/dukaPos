import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import {
  Text, Card, FAB, Portal, Dialog, Button, TextInput, SegmentedButtons,
  Chip, IconButton, Divider, Surface,
} from 'react-native-paper';
import { useAuthStore } from '../stores';
import { expensesApi } from '../lib/api';

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Transport', 'Marketing', 'Maintenance', 'Other'];

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
    } catch { /* */ }
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
    } catch { /* */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await expensesApi.delete(id);
      load();
    } catch { /* */ }
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const renderItem = ({ item }: { item: Expense }) => (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall">{item.description}</Text>
            <Text variant="bodySmall" style={{ color: '#666' }}>{item.category} - {item.date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="titleMedium" style={{ fontWeight: '800' }}>KES {item.amount.toLocaleString()}</Text>
            <IconButton icon="delete-outline" size={18} onPress={() => handleDelete(item.id)} />
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="headlineSmall" style={{ fontWeight: '700' }}>Expenses</Text>
        <Text variant="titleMedium" style={{ color: '#E65100', fontWeight: '700' }}>Total: KES {total.toLocaleString()}</Text>
      </Surface>

      <View style={styles.filters}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...CATEGORIES]}
          keyExtractor={(item) => item || 'all'}
          renderItem={({ item }) => (
            <Chip
              selected={filterCat === item}
              onPress={() => setFilterCat(item)}
              style={{ marginRight: 6 }}
            >
              {item || 'All'}
            </Chip>
          )}
        />
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: '#999' }}>No expenses recorded</Text>
          </View>
        }
      />

      <FAB icon="plus" style={styles.fab} onPress={() => setDialogVisible(true)} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Add Expense</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Description" value={description} onChangeText={setDescription} mode="outlined" style={{ marginBottom: 12 }} />
            <TextInput label="Amount (KES)" value={amount} onChangeText={setAmount} keyboardType="numeric" mode="outlined" style={{ marginBottom: 12 }} />
            <Text variant="bodySmall" style={{ marginBottom: 8 }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map((c) => (
                <Chip key={c} selected={category === c} onPress={() => setCategory(c)}>{c}</Chip>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleAdd} disabled={!description || !amount}>Add</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filters: { paddingHorizontal: 16, paddingVertical: 8 },
  card: { marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  empty: { alignItems: 'center', paddingTop: 60 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
