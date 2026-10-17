'use client';

import {
  Drawer, Box, Typography, IconButton, List, ListItem, ListItemText,
  Button, Divider, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

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

const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

export default function TabsDrawer({ open, onClose, tabs, onRecall }: Props) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 360 } }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Open Tabs ({tabs.length})
        </Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <Divider />

      {tabs.length === 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <Typography color="text.secondary">No open tabs</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Park a sale to create a tab
          </Typography>
        </Box>
      ) : (
        <List sx={{ px: 1 }}>
          {tabs.map((tab) => {
            const time = new Date(tab.parkedAt).toLocaleTimeString('en-KE', {
              hour: '2-digit', minute: '2-digit',
            });
            return (
              <ListItem
                key={tab.id}
                sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mb: 1, flexDirection: 'column', alignItems: 'stretch' }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <ListItemText
                    primary={tab.customerName || `Tab by ${tab.parkedByName}`}
                    secondary={`${tab.itemCount} items · ${formatKES(tab.saleTotal)} · ${time}`}
                    primaryTypographyProps={{ fontWeight: 700, variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => { onRecall(tab.id); onClose(); }}
                    sx={{ borderRadius: 2, ml: 1 }}
                  >
                    Recall
                  </Button>
                </Box>
                {tab.notes && (
                  <Chip label={tab.notes} size="small" variant="outlined" sx={{ mt: 0.5, alignSelf: 'flex-start' }} />
                )}
              </ListItem>
            );
          })}
        </List>
      )}
    </Drawer>
  );
}
