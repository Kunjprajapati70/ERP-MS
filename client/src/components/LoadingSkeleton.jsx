import { Skeleton, Stack } from '@mui/material';

export default function LoadingSkeleton({ rows = 4 }) {
  return (
    <Stack spacing={2} sx={{ py: 2 }} aria-busy="true" aria-label="Loading">
      <Skeleton variant="rounded" height={40} width="40%" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={56} />
      ))}
    </Stack>
  );
}
