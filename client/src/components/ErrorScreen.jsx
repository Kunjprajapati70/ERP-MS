import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';

export default function ErrorScreen({
  statusCode = '404',
  title = 'Page Not Found',
  message = 'The page you are looking for does not exist, has been removed, or is temporarily unavailable.',
  icon: IconComponent,
  gradient = 'linear-gradient(135deg, #0284C7 0%, #38BDF8 50%, #818CF8 100%)',
  color = '#0284C7',
  actionType = 'dashboard', // 'dashboard' | 'login'
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: isDark ? '#050D12' : '#F4F8FA',
        px: 2,
        py: 4,
      }}
    >
      {/* Ambient background glow orbs */}
      <Box
        className="error-glow"
        sx={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: 320, sm: 540 },
          height: { xs: 320, sm: 540 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(color, isDark ? 0.25 : 0.15)} 0%, transparent 70%)`,
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        className="error-glow"
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '20%',
          width: { xs: 260, sm: 420 },
          height: { xs: 260, sm: 420 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha('#818CF8', isDark ? 0.18 : 0.08)} 0%, transparent 70%)`,
          filter: 'blur(60px)',
          pointerEvents: 'none',
          animationDelay: '1.5s',
        }}
      />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          className="error-card-anim"
          sx={{
            p: { xs: 3.5, sm: 5 },
            textAlign: 'center',
            borderRadius: 4,
            border: `1px solid ${alpha(isDark ? '#FFFFFF' : '#0B4F6C', isDark ? 0.12 : 0.1)}`,
            bgcolor: isDark ? alpha('#0B1C26', 0.75) : alpha('#FFFFFF', 0.85),
            backdropFilter: 'blur(16px)',
            boxShadow: isDark
              ? `0 24px 60px ${alpha('#000', 0.5)}, 0 0 40px ${alpha(color, 0.12)}`
              : `0 24px 60px ${alpha('#0B4F6C', 0.08)}, 0 0 30px ${alpha(color, 0.06)}`,
          }}
        >
          {/* Animated floating status & icon */}
          <Box className="error-float" sx={{ mb: 2, display: 'inline-block' }}>
            {IconComponent && (
              <Box
                sx={{
                  width: { xs: 72, sm: 84 },
                  height: { xs: 72, sm: 84 },
                  mx: 'auto',
                  mb: 2,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(color, isDark ? 0.2 : 0.1),
                  border: `1.5px solid ${alpha(color, 0.35)}`,
                  color,
                  boxShadow: `0 8px 24px ${alpha(color, 0.25)}`,
                }}
              >
                <IconComponent sx={{ fontSize: { xs: 38, sm: 46 } }} />
              </Box>
            )}

            <Typography
              variant="h1"
              fontWeight={900}
              sx={{
                fontSize: { xs: '4.5rem', sm: '6.5rem' },
                lineHeight: 1,
                letterSpacing: '-0.04em',
                background: gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: `drop-shadow(0 4px 16px ${alpha(color, 0.3)})`,
                userSelect: 'none',
              }}
            >
              {statusCode}
            </Typography>
          </Box>

          <Typography
            variant="h4"
            fontWeight={750}
            gutterBottom
            sx={{
              fontSize: { xs: '1.45rem', sm: '1.85rem' },
              color: 'text.primary',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              maxWidth: 440,
              mx: 'auto',
              mb: 4,
              fontSize: { xs: '0.92rem', sm: '1rem' },
              lineHeight: 1.6,
            }}
          >
            {message}
          </Typography>

          {/* Action buttons */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.75}
            justifyContent="center"
            sx={{ pt: 1 }}
          >
            {actionType === 'login' ? (
              <Button
                variant="contained"
                size="large"
                startIcon={<LoginRoundedIcon />}
                onClick={() => navigate('/login')}
                sx={{
                  py: 1.25,
                  px: 3,
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  boxShadow: `0 6px 20px ${alpha(color, 0.3)}`,
                  bgcolor: color,
                  '&:hover': {
                    bgcolor: color,
                    filter: 'brightness(1.1)',
                  },
                }}
              >
                Go to Sign In
              </Button>
            ) : (
              <Button
                variant="contained"
                size="large"
                startIcon={<HomeRoundedIcon />}
                onClick={() => navigate('/dashboard')}
                sx={{
                  py: 1.25,
                  px: 3,
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  boxShadow: `0 6px 20px ${alpha(color, 0.3)}`,
                  bgcolor: color,
                  '&:hover': {
                    bgcolor: color,
                    filter: 'brightness(1.1)',
                  },
                }}
              >
                Go to Dashboard
              </Button>
            )}

            <Button
              variant="outlined"
              size="large"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate(-1)}
              sx={{
                py: 1.25,
                px: 2.5,
                borderRadius: 2.5,
                fontWeight: 600,
                fontSize: '0.95rem',
                borderColor: alpha(isDark ? '#FFF' : '#000', 0.2),
                color: 'text.primary',
                '&:hover': {
                  borderColor: alpha(isDark ? '#FFF' : '#000', 0.4),
                  bgcolor: alpha(isDark ? '#FFF' : '#000', 0.04),
                },
              }}
            >
              Go Back
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
