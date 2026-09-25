import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  Typography,
} from '@mui/material';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { toast } from 'react-toastify';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';

export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetchUnreadCount();
      setUnread(res.data.count || 0);
    } catch (_) {
      // Silent — bell should not crash the shell
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(refreshCount, 60000);
    return () => clearInterval(timer);
  }, [refreshCount]);

  const openMenu = async (event) => {
    setAnchorEl(event.currentTarget);
    setLoading(true);
    try {
      const res = await fetchNotifications({ page: 1, limit: 12 });
      setItems(res.data.items || []);
      setUnread(res.data.unreadCount ?? unread);
    } catch (err) {
      toast.error(err.message || 'Unable to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const closeMenu = () => setAnchorEl(null);

  const handleRead = async (item) => {
    if (item.status === 'READ') return;
    try {
      await markNotificationRead(item._id);
      setItems((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, status: 'READ' } : n))
      );
      setUnread((c) => Math.max(0, c - 1));
    } catch (err) {
      toast.error(err.message || 'Failed to mark as read');
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, status: 'READ' })));
      setUnread(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err.message || 'Failed to mark all as read');
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={openMenu} aria-label="Open notifications">
        <Badge badgeContent={unread} color="error" max={99}>
          <NotificationsNoneOutlinedIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxWidth: '90vw' } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>Notifications</Typography>
          <Button size="small" onClick={handleReadAll} disabled={!unread}>
            Mark all read
          </Button>
        </Box>
        <Divider />
        {loading && (
          <Box sx={{ p: 2 }}>
            <Typography color="text.secondary">Loading…</Typography>
          </Box>
        )}
        {!loading && items.length === 0 && (
          <Box sx={{ p: 2 }}>
            <Typography color="text.secondary">No notifications yet.</Typography>
          </Box>
        )}
        {!loading && items.length > 0 && (
          <List dense disablePadding sx={{ maxHeight: 360, overflow: 'auto' }}>
            {items.map((item) => (
              <ListItemButton
                key={item._id}
                onClick={() => handleRead(item)}
                selected={item.status === 'UNREAD'}
                alignItems="flex-start"
              >
                <ListItemText
                  primary={item.title}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.secondary" display="block">
                        {item.message}
                      </Typography>
                      <Typography component="span" variant="caption" color="text.disabled">
                        {new Date(item.createdAt).toLocaleString()}
                      </Typography>
                    </>
                  }
                  primaryTypographyProps={{
                    fontWeight: item.status === 'UNREAD' ? 700 : 500,
                    variant: 'body2',
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Menu>
    </>
  );
}
