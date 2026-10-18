'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import { inventoryApi } from '@/lib/api';
import api from '@/lib/api';
import { useSnackbar } from 'notistack';

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

function CategoryRow({
  node,
  depth,
  expanded,
  onToggle,
  onEdit,
  onAddChild,
}: {
  node: CategoryNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (c: Category) => void;
  onAddChild: (parentId: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pl: depth * 4 + 1.5,
          pr: 2,
          py: 1.5,
          borderBottom: '1px solid #F1F5F9',
          '&:hover': { bgcolor: '#F8FAFC' },
          transition: 'background 0.15s',
        }}
      >
        {hasChildren ? (
          <IconButton size="small" onClick={() => onToggle(node.id)} sx={{ color: '#94A3B8' }}>
            {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        ) : (
          <Box sx={{ width: 34 }} />
        )}

        {depth > 0 && <SubdirectoryArrowRightIcon sx={{ fontSize: 18, color: '#CBD5E1', mr: 0.5 }} />}

        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: depth === 0
              ? 'linear-gradient(135deg, #1565C0, #0D47A1)'
              : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <CategoryIcon sx={{ fontSize: 18 }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
            {node.name}
          </Typography>
          {hasChildren && (
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
              {node.children.length} subcategor{node.children.length === 1 ? 'y' : 'ies'}
            </Typography>
          )}
        </Box>

        <Chip
          label={`#${node.sortOrder}`}
          size="small"
          sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontWeight: 600, fontSize: '0.7rem' }}
        />

        <IconButton
          size="small"
          onClick={() => onAddChild(node.id)}
          sx={{ color: '#94A3B8', '&:hover': { color: '#1565C0', bgcolor: '#EFF6FF' } }}
          title="Add subcategory"
        >
          <AddIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => onEdit(node)}
          sx={{ color: '#94A3B8', '&:hover': { color: '#7C3AED', bgcolor: '#F5F3FF' } }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Box>

      {hasChildren && (
        <Collapse in={isExpanded}>
          {node.children.map((child) => (
            <CategoryRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onAddChild={onAddChild}
            />
          ))}
        </Collapse>
      )}
    </>
  );
}

export default function CategoriesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = () => {
    inventoryApi.getCategories().then((r) => {
      const data = Array.isArray(r.data) ? r.data : [];
      setCategories(data);
    }).catch(() => {});
  };

  useEffect(load, []);

  const tree = buildTree(categories);
  const topLevel = categories.filter((c) => !c.parentId);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpanded(new Set(categories.filter((c) => categories.some((ch) => ch.parentId === c.id)).map((c) => c.id)));
  };

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
    } catch {
      enqueueSnackbar('Failed to save', { variant: 'error' });
    }
  };

  const parentOptions = editing
    ? categories.filter((c) => c.id !== editing.id && c.parentId !== editing.id)
    : categories;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>Categories</Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} &middot; {topLevel.length} top-level
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {categories.some((c) => categories.some((ch) => ch.parentId === c.id)) && (
            <Button size="small" onClick={expandAll} sx={{ color: '#64748B' }}>
              Expand all
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openCreate()}
            sx={{
              background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
              boxShadow: '0 2px 8px rgba(21,101,192,0.3)',
            }}
          >
            Add category
          </Button>
        </Box>
      </Box>

      <Paper sx={{ border: '1px solid #E2E8F0', boxShadow: 'none', overflow: 'hidden' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', px: 2.5, py: 1.5,
          bgcolor: '#F8FAFC', borderBottom: '2px solid #E2E8F0',
        }}>
          <Typography sx={{
            flex: 1, fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B',
          }}>
            Category
          </Typography>
        </Box>

        {tree.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CategoryIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
            <Typography variant="body1" sx={{ color: '#64748B', fontWeight: 600, mb: 0.5 }}>
              No categories yet
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Create categories to organize your products
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openCreate()}>
              Create first category
            </Button>
          </Box>
        ) : (
          tree.map((node) => (
            <CategoryRow
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggleExpand}
              onEdit={openEdit}
              onAddChild={(pid) => openCreate(pid)}
            />
          ))
        )}
      </Paper>

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
