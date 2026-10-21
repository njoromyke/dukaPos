'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import { inventoryApi } from '@/lib/api';
import api from '@/lib/api';
import { useSnackbar } from 'notistack';
import { DPageHeader, DSearchFilter, DTable } from '@/components';
import { useAuthStore } from '@/stores/auth-store';

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
}

function buildTree(categories: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  for (const c of categories) {
    map.set(c.id, { ...c, children: [] });
  }

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sort = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export default function CategoriesPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const canManageInventory = Boolean(["Admin", "SuperAdmin", "Manager"].includes(auth.user?.role || "")
    || auth.user?.permissions?.includes("inventory.manage")
    || auth.user?.permissions?.includes("admin.portal.view"));
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [search, setSearch] = useState('');

  const load = () => {
    inventoryApi.getCategories().then((r) => {
      const data = Array.isArray(r.data) ? r.data : [];
      setCategories(data);
    }).catch(() => {});
  };

  useEffect(load, []);

  const topLevel = categories.filter((c) => !c.parentId);
  const hierarchy: Array<Category & { depth: number; parentName: string }> = [];
  const flatten = (nodes: CategoryNode[], depth = 0) => nodes.forEach((node) => {
    hierarchy.push({ ...node, depth, parentName: categories.find((item) => item.id === node.parentId)?.name || '—' });
    flatten(node.children, depth + 1);
  });
  flatten(buildTree(categories));
  const filtered = hierarchy.filter((category) => `${category.name} ${category.parentName}`.toLowerCase().includes(search.toLowerCase()));

  const openCreate = (preselectedParentId?: string) => {
    setEditing(null);
    setName('');
    setParentId(preselectedParentId || '');
    const siblings = categories.filter((c) => c.parentId === (preselectedParentId || null));
    setSortOrder(siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0);
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setParentId(c.parentId || '');
    setSortOrder(c.sortOrder);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      enqueueSnackbar('Name is required', { variant: 'warning' });
      return;
    }
    try {
      const payload = {
        name: name.trim(),
        parentId: parentId || null,
        sortOrder,
      };

      if (editing) {
        await api.put('/api/inventory/categories', { id: editing.id, ...payload });
      } else {
        await api.post('/api/inventory/categories', payload);
      }
      enqueueSnackbar(editing ? 'Category updated' : 'Category created', { variant: 'success' });
      setDialogOpen(false);
      load();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to save category', { variant: 'error' });
    }
  };

  const parentOptions = editing
    ? categories.filter((c) => c.id !== editing.id && c.parentId !== editing.id)
    : categories;

  const columns = [
    { field: 'name', header: 'Name', render: (category: typeof hierarchy[number]) => <Box display="flex" alignItems="center" gap={1} sx={{ pl: category.depth * 2 }}><CategoryIcon color="primary" fontSize="small" /><Typography fontWeight={600}>{category.name}</Typography></Box> },
    { field: 'parentName', header: 'Parent' },
    { field: 'sortOrder', header: 'Sort order', render: (category: Category) => `#${category.sortOrder}` },
    { field: 'isActive', header: 'Status', render: (category: Category) => <Chip size="small" label={category.isActive ? 'Active' : 'Inactive'} color={category.isActive ? 'success' : 'default'} /> },
    { field: 'actions', header: 'Actions', sortable: false, render: (category: Category) => canManageInventory ? <Box display="flex" gap={0.5}><IconButton size="small" title="Add subcategory" onClick={() => openCreate(category.id)}><AddIcon fontSize="small" /></IconButton><IconButton size="small" title="Edit category" onClick={() => openEdit(category)}><EditIcon fontSize="small" /></IconButton></Box> : '—' },
  ];

  return (
    <Box>
      <DPageHeader
        title="Categories"
        subtitle={`${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} · ${topLevel.length} top-level`}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inventory', href: '/dashboard/inventory/products' }, { label: 'Categories' }]}
        action={canManageInventory ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openCreate()}>Add category</Button>
        ) : undefined}
      />

      <DSearchFilter search={search} onSearchChange={setSearch} searchPlaceholder="Search categories..." onRefresh={load} />
      <DTable columns={columns} rows={filtered} rowKey={(category) => category.id} emptyMessage="No categories found" />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #F8FAFC, #EFF6FF)',
          borderBottom: '1px solid #E2E8F0',
          fontWeight: 700,
        }}>
          {editing ? 'Edit Category' : parentId ? 'New Subcategory' : 'New Category'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2.5} mt={2}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Alcohol, Beverages, Rum..."
              autoFocus
            />
            <TextField
              select
              label="Parent Category"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              helperText="Leave empty for a top-level category"
            >
              <MenuItem value="">
                <em>None (top-level)</em>
              </MenuItem>
              {parentOptions.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.parentId ? `  └ ${c.name}` : c.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Sort Order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              helperText="Lower numbers appear first"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#64748B' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
              boxShadow: '0 2px 8px rgba(21,101,192,0.3)',
            }}
          >
            {editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
