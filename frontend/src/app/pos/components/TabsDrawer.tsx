'use client';

import {
  Drawer, Box, Typography, IconButton, List, ListItem, ListItemText,
  Button, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BookmarkIcon from '@mui/icons-material/BookmarkBorderOutlined';
import { formatCurrency } from '@/lib/utils';

interface Tab {
  id: string;
  saleId: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  saleTotal: number;
  itemCount: number;
  parkedByName: string;
  parkedAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tabs: Tab[];
  onRecall: (tabId: string) => void;
}

export default function TabsDrawer({ open, onClose, tabs, onRecall }: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 380,
          border: 'none',
          boxShadow: '-8px 0 30px rgba(15, 23, 42, 0.1)',
        },
      }}
    >
      <Box sx={{
        p: 2.5,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #F1F5F9',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.125rem', color: '#0F172A' }}>
            Open Tabs
          </Typography>
          <Box sx={{
            px: 1, py: 0.25, borderRadius: 1.5,
            bgcolor: '#ECFDF5', color: '#047857',
            fontSize: '0.75rem', fontWeight: 700,
          }}>
            {tabs.length}
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: '#94A3B8',
            '&:hover': { bgcolor: '#F1F5F9', color: '#475569' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {tabs.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '50%',
            bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
          }}>
            <BookmarkIcon sx={{ fontSize: 26, color: '#94A3B8' }} />
          </Box>
          <Typography sx={{ color: '#334155', fontWeight: 600 }}>No open tabs</Typography>
          <Typography sx={{ color: '#94A3B8', fontSize: '0.8125rem', mt: 0.5 }}>
            Park a sale to create a tab
          </Typography>
        </Box>
      ) : (
        <List sx={{ px: 1.5, pt: 1.5 }}>
          {tabs.map((tab) => {
            const time = new Date(tab.parkedAt).toLocaleTimeString('en-KE', {
              hour: '2-digit', minute: '2-digit',
            });
            return (
              <ListItem
                key={tab.id}
                sx={{
                  border: '1px solid #F1F5F9',
                  borderRadius: 3, mb: 1, p: 2,
                  flexDirection: 'column', alignItems: 'stretch',
                  bgcolor: '#FAFBFC',
                  transition: 'border-color 0.15s ease',
                  '&:hover': { borderColor: '#E2E8F0' },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <ListItemText
                    primary={tab.customerName || `Tab by ${tab.parkedByName}`}
                    secondary={`${tab.itemCount} items · ${formatCurrency(tab.saleTotal)} · ${time}`}
                    primaryTypographyProps={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0F172A' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem', color: '#64748B', mt: 0.25 }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrowIcon sx={{ fontSize: '16px !important' }} />}
                    onClick={() => { onRecall(tab.id); onClose(); }}
                    sx={{
                      borderRadius: 2, ml: 1, px: 2,
                      bgcolor: '#059669', fontWeight: 700, fontSize: '0.75rem',
                      boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                      '&:hover': { bgcolor: '#047857' },
                    }}
                  >
                    Recall
                  </Button>
                </Box>
                {tab.notes && (
                  <Chip
                    label={tab.notes}
                    size="small"
                    sx={{
                      mt: 1, alignSelf: 'flex-start',
                      bgcolor: '#F0F9FF', color: '#0369A1',
                      border: '1px solid #BAE6FD',
                      fontSize: '0.7rem', fontWeight: 600,
                    }}
                  />
                )}
              </ListItem>
            );
          })}
        </List>
      )}
    </Drawer>
  );
}
