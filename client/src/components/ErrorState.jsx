import { Box, Button, Stack, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WifiOffIcon from '@mui/icons-material/WifiOff';

export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred.',
  onRetry,
  network = false,
}) {
  return (
    <Stack
      spacing={2}
      alignItems="center"
      justifyContent="center"
      sx={{ py: 8, px: 2, textAlign: 'center' }}
      role="alert"
    >
      {network ? (
        <WifiOffIcon color="error" sx={{ fontSize: 48 }} />
      ) : (
        <ErrorOutlineIcon color="error" sx={{ fontSize: 48 }} />
      )}
      <Typography variant="h5">{title}</Typography>
      <Typography color="text.secondary" maxWidth={480}>
        {message}
      </Typography>
      {onRetry && (
        <Box>
          <Button variant="contained" onClick={onRetry}>
            Retry
          </Button>
        </Box>
      )}
    </Stack>
  );
}
