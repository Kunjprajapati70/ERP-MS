import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import {
  completeQCInspection,
  createQCInspection,
  fetchQCInspections,
  fetchWorkOrders,
} from '../../services/hrMfgService';

export default function QcPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [completedWOs, setCompletedWOs] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(null);
  const [formError, setFormError] = useState(null);
  const [workOrderId, setWorkOrderId] = useState('');
  const [passedQty, setPassedQty] = useState(0);
  const [failedQty, setFailedQty] = useState(0);
  const [defectNotes, setDefectNotes] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [qcRes, woRes] = await Promise.all([
        fetchQCInspections({ page: page + 1, limit: rowsPerPage }),
        fetchWorkOrders({ status: 'COMPLETED', limit: 50 }),
      ]);
      setRows(qcRes.data.items || []);
      setTotal(qcRes.data.pagination?.total || 0);
      setCompletedWOs(woRes.data.items || []);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const submitCreate = async () => {
    setFormError(null);
    try {
      if (!workOrderId) throw new Error('Select a work order');
      await createQCInspection({ workOrder: workOrderId });
      toast.success('QC inspection created');
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Create failed');
    }
  };

  const submitComplete = async () => {
    setFormError(null);
    try {
      await completeQCInspection(completeOpen._id, {
        passedQty: Number(passedQty),
        failedQty: Number(failedQty),
        defectNotes,
      });
      toast.success('QC completed');
      setCompleteOpen(null);
      load();
    } catch (err) {
      setFormError(err.message || 'Complete failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'inspectionNumber', label: 'QC #' },
      {
        id: 'workOrder',
        label: 'WO',
        render: (r) => r.workOrder?.workOrderNumber || '—',
      },
      {
        id: 'finishedProduct',
        label: 'Product',
        render: (r) => r.finishedProduct?.sku || '—',
      },
      { id: 'inspectedQty', label: 'Inspected' },
      { id: 'passedQty', label: 'Passed' },
      { id: 'failedQty', label: 'Failed' },
      { id: 'result', label: 'Result', render: (r) => <StatusChip status={r.result} /> },
      {
        id: 'actions',
        label: '',
        render: (row) =>
          row.result === 'PENDING' ? (
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                setFormError(null);
                setPassedQty(row.inspectedQty);
                setFailedQty(0);
                setDefectNotes('');
                setCompleteOpen(row);
              }}
            >
              Record result
            </Button>
          ) : null,
      },
    ],
    []
  );

  return (
    <Box>
      <PageHeader
        title="QC Inspections"
        subtitle="Inspect completed work orders — pass / fail / partial."
        breadcrumbs={[{ label: 'Manufacturing' }, { label: 'QC' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => {
                setFormError(null);
                setWorkOrderId('');
                setDialogOpen(true);
              }}
            >
              New inspection
            </Button>
          </Stack>
        }
      />

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState title="Unable to load QC" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
      )}
      {status === 'success' && (
        <DataTable
          columns={columns}
          rows={rows}
          page={page}
          rowsPerPage={rowsPerPage}
          total={total}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          emptyMessage="No QC inspections yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create QC inspection</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <TextField
            select
            label="Completed work order"
            fullWidth
            sx={{ mt: 1 }}
            value={workOrderId}
            onChange={(e) => setWorkOrderId(e.target.value)}
          >
            {completedWOs.map((wo) => (
              <MenuItem key={wo._id} value={wo._id}>
                {wo.workOrderNumber} — qty {wo.quantity} — {wo.finishedProduct?.sku || 'FG'}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(completeOpen)} onClose={() => setCompleteOpen(null)} fullWidth maxWidth="sm">
        <DialogTitle>Record QC result — {completeOpen?.inspectionNumber}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              Inspected qty: {completeOpen?.inspectedQty}. Passed + failed must equal this.
            </Alert>
            <TextField
              label="Passed qty"
              type="number"
              fullWidth
              value={passedQty}
              onChange={(e) => setPassedQty(e.target.value)}
            />
            <TextField
              label="Failed qty"
              type="number"
              fullWidth
              value={failedQty}
              onChange={(e) => setFailedQty(e.target.value)}
            />
            <TextField
              label="Defect notes"
              fullWidth
              multiline
              minRows={2}
              value={defectNotes}
              onChange={(e) => setDefectNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteOpen(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitComplete}>
            Complete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
