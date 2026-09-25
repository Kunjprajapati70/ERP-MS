import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import {
  fetchMyTodayAttendance,
  myCheckInAttendance,
  myCheckOutAttendance,
} from '../services/hrMfgService';
import { isAttendanceEligible } from '../utils/permissions';
import useBusinessDayRefresh from '../hooks/useBusinessDayRefresh';

function formatElapsedSeconds(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function AttendancePunchWidget() {
  const user = useSelector((state) => state.auth.user);
  const eligible = isAttendanceEligible(user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('checkIn'); // 'checkIn' | 'checkOut'
  const [notes, setNotes] = useState('');
  const timerRef = useRef(null);

  const loadStatus = useCallback(async () => {
    if (!eligible) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetchMyTodayAttendance();
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [eligible]);

  useEffect(() => {
    loadStatus();
    const handleGlobalUpdate = () => loadStatus();
    window.addEventListener('attendance-updated', handleGlobalUpdate);
    return () => window.removeEventListener('attendance-updated', handleGlobalUpdate);
  }, [loadStatus]);

  useBusinessDayRefresh(() => {
    loadStatus();
    window.dispatchEvent(new CustomEvent('attendance-updated'));
  }, eligible);

  // Live timer tick when checked in
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (data?.isCheckedIn && data?.attendance?.checkIn) {
      const checkInMs = new Date(data.attendance.checkIn).getTime();

      const updateTimer = () => {
        const nowMs = Date.now();
        const diffSecs = Math.max(0, Math.floor((nowMs - checkInMs) / 1000));
        setElapsedSecs(diffSecs);
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      setElapsedSecs(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [data]);

  const handleOpenAction = (type) => {
    setActionType(type);
    setNotes('');
    setNotesDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    setNotesDialogOpen(false);
    setActing(true);
    try {
      if (actionType === 'checkIn') {
        const res = await myCheckInAttendance({ notes });
        setData(res.data);
        toast.success('Checked in successfully! Work timer started.');
      } else {
        const res = await myCheckOutAttendance({ notes });
        setData(res.data);
        toast.success(
          `Checked out! Total working time: ${res.data.formattedWorkHours || res.data.workHours + ' hrs'}`
        );
      }
      window.dispatchEvent(new CustomEvent('attendance-updated'));
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  if (!eligible) {
    return null;
  }

  if (loading) {
    return <CircularProgress size={18} sx={{ color: 'text.secondary' }} />;
  }

  const punchState =
    data?.punchState ||
    (data?.isCheckedIn ? 'CHECKED_IN' : data?.hasCheckedOutToday ? 'CHECKED_OUT' : 'NOT_CHECKED_IN');
  const isCheckedIn = punchState === 'CHECKED_IN';
  const hasCheckedOut = punchState === 'CHECKED_OUT';

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isCheckedIn ? (
          <Tooltip
            title={`Checked in at ${new Date(data.attendance.checkIn).toLocaleTimeString()} • Click to check out`}
          >
            <Button
              variant="contained"
              color="error"
              size="small"
              disabled={acting}
              startIcon={<StopRoundedIcon />}
              onClick={() => handleOpenAction('checkOut')}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 1.5,
                bgcolor: 'error.main',
                boxShadow: (t) => `0 0 10px ${t.palette.error.main}40`,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)' },
                  '70%': { boxShadow: '0 0 0 8px rgba(239, 68, 68, 0)' },
                  '100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
                },
              }}
            >
              <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', mr: 0.5 }}>
                {formatElapsedSeconds(elapsedSecs)}
              </Box>
              • Check Out
            </Button>
          </Tooltip>
        ) : hasCheckedOut ? (
          <Tooltip
            title={`Shift completed. Total logged: ${data.formattedWorkHours || '0h 0m'}. Duplicate check-in is not allowed today.`}
          >
            <Chip
              icon={<CheckCircleOutlineIcon fontSize="small" />}
              label={`Checked out · ${data.formattedWorkHours || '0h 0m'}`}
              color="success"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Tooltip>
        ) : (
          <Tooltip title="Start your daily work shift">
            <Button
              variant="contained"
              color="success"
              size="small"
              disabled={acting}
              startIcon={<PlayArrowRoundedIcon />}
              onClick={() => handleOpenAction('checkIn')}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                px: 1.5,
              }}
            >
              Check In
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Confirmation & Optional Notes Dialog */}
      <Dialog
        open={notesDialogOpen}
        onClose={() => setNotesDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {actionType === 'checkIn' ? 'Check In Confirmation' : 'Check Out Confirmation'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {actionType === 'checkIn'
              ? 'Are you ready to start work? Your check-in time will be recorded accurately.'
              : `Are you ready to end your work session? Current elapsed time will be logged accurately to payroll & HR.`}
          </Typography>
          <TextField
            label="Notes / Location / Task (optional)"
            fullWidth
            size="small"
            multiline
            minRows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={actionType === 'checkIn' ? 'Starting daily tasks...' : 'Completed daily tasks...'}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNotesDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={actionType === 'checkIn' ? 'success' : 'error'}
            onClick={handleConfirmAction}
          >
            {actionType === 'checkIn' ? 'Confirm Check In' : 'Confirm Check Out'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
