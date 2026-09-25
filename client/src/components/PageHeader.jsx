import { Box, Breadcrumbs, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function PageHeader({ title, subtitle, breadcrumbs = [], actions }) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', md: 'flex-start' }}
      spacing={2}
      sx={{ mb: { xs: 2.5, md: 3 } }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {breadcrumbs.length > 0 && (
          <Breadcrumbs
            sx={{ mb: 1, '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap' } }}
            aria-label="breadcrumb"
          >
            {breadcrumbs.map((crumb) =>
              crumb.to ? (
                <Link
                  key={crumb.label}
                  component={RouterLink}
                  underline="hover"
                  color="inherit"
                  to={crumb.to}
                >
                  {crumb.label}
                </Link>
              ) : (
                <Typography key={crumb.label} color="text.primary" fontWeight={600}>
                  {crumb.label}
                </Typography>
              )
            )}
          </Breadcrumbs>
        )}
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontSize: { xs: '1.4rem', sm: '1.65rem', md: '1.85rem' },
            wordBreak: 'break-word',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 720, lineHeight: 1.55 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
          sx={{ width: { xs: '100%', md: 'auto' } }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
