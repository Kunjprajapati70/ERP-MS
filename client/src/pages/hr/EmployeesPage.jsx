import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { createEmployee, deleteEmployee, fetchEmployees, updateEmployee } from '../../services/hrMfgService';

const DEPARTMENTS = ['SALES', 'PURCHASE', 'INVENTORY', 'FINANCE', 'HR', 'PRODUCTION', 'IT', 'ADMIN', 'OTHER'];

const empty = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: 'OTHER',
  designation: '',
  employmentType: 'FULL_TIME',
  salary: 0,
  status: 'ACTIVE',
};

export default function EmployeesPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchEmployees({ page: page + 1, limit: rowsPerPage });
      setRows(res.data.items || []);
      setTotal(res.data.pagination?.total || 0);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setFormError(null);
    try {
      if (!form.firstName || !form.lastName) throw new Error('First and last name are required');
      await createEmployee({ ...form, salary: Number(form.salary) || 0 });
      toast.success('Employee created');
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Create failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'employeeCode', label: 'Code' },
      {
        id: 'name',
        label: 'Name',
        render: (r) => `${r.firstName} ${r.lastName}`,
      },
      { id: 'department', label: 'Dept', render: (r) => <StatusChip status={r.department} /> },
      { id: 'designation', label: 'Designation', render: (r) => r.designation || '—' },
      {
        id: 'status',
        label: 'Status',
        render: (r) => <StatusChip status={r.status} />,
      },
      {
        id: 'actions',
        label: 'Actions',
        render: (row) => (
          <Stack direction="row" spacing={0.5}>
            {row.status === 'ACTIVE' && (
              <Button
                size="small"
                onClick={async () => {
                  try {
                    await updateEmployee(row._id, { status: 'INACTIVE' });
                    toast.success('Employee deactivated');
                    load();
                  } catch (err) {
                    toast.error(err.message || 'Update failed');
                  }
                }}
              >
                Deactivate
              </Button>
            )}
            {row.status !== 'ACTIVE' && (
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ),
      },
    ],
    [load]
  );

  return (
    <Box>
      <PageHeader
        title="Employees"
        subtitle="HR employee master — departments, status, and leave eligibility."
        breadcrumbs={[{ label: 'HR' }, { label: 'Employees' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => {
                setForm(empty);
                setFormError(null);
                setDialogOpen(true);
              }}
            >
              Add employee
            </Button>
          </Stack>
        }
      />

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState title="Unable to load employees" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
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
          emptyMessage="No employees yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add employee</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="First name" fullWidth required value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              <TextField label="Last name" fullWidth required value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            </Stack>
            <TextField label="Email" fullWidth value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <TextField label="Phone" fullWidth value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <TextField select label="Department" fullWidth value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>
              {DEPARTMENTS.map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Designation" fullWidth value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
            <TextField label="Salary ₹" type="number" fullWidth value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete employee"
        message={deleteTarget ? `Delete ${deleteTarget.employeeCode}?` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deleteEmployee(deleteTarget._id);
            toast.success('Employee deleted');
            setDeleteTarget(null);
            load();
          } catch (err) {
            toast.error(err.message || 'Delete failed');
          }
        }}
      />
    </Box>
  );
}
