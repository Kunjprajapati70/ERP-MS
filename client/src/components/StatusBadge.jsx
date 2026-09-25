import { Chip } from '@mui/material';

const colorMap = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  SUSPENDED: 'error',
  UNREAD: 'warning',
  READ: 'default',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info',
  SYSTEM: 'secondary',
};

export default function StatusBadge({ status, label }) {
  if (!status) return null;
  const key = String(status).toUpperCase();
  return (
    <Chip
      size="small"
      label={label || key}
      color={colorMap[key] || 'default'}
      variant="outlined"
    />
  );
}
