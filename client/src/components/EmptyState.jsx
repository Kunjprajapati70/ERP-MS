import { Stack, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export default function EmptyState({
  title = 'No data available',
  message = 'There is nothing to display yet.',
}) {
  return (
    <Stack spacing={1.5} alignItems="center" sx={{ py: 6, textAlign: 'center' }}>
      <InboxOutlinedIcon color="disabled" sx={{ fontSize: 48 }} />
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary" maxWidth={420}>
        {message}
      </Typography>
    </Stack>
  );
}
