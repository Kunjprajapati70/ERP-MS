import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable from '../../components/DataTable';
import {
  fetchPermissionCatalog,
  fetchRoles,
  updateRole,
} from '../../services/roleService';

export default function RolesPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [editing, setEditing] = useState(null);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [rolesRes, catalogRes] = await Promise.all([
        fetchRoles({
          page: page + 1,
          limit: rowsPerPage,
          search: search || undefined,
        }),
        fetchPermissionCatalog(),
      ]);
      setRows(rolesRes.data.items || []);
      setTotal(rolesRes.data.pagination?.total || 0);
      setCatalog(catalogRes.data.permissions || []);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (role) => {
    setEditing(role);
    setSelectedPerms(role.permissions || []);
    setDisplayName(role.displayName || '');
    setDescription(role.description || '');
    setFormError(null);
  };

  const togglePerm = (perm) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const selectAll = () => setSelectedPerms([...catalog]);
  const clearAll = () => setSelectedPerms([]);

  const onSave = async () => {
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    try {
      await updateRole(editing._id, {
        displayName,
        description,
        permissions: selectedPerms,
      });
      toast.success('Role updated');
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      { id: 'name', label: 'Code' },
      { id: 'displayName', label: 'Display name' },
      {
        id: 'permissions',
        label: 'Permissions',
        render: (row) => `${row.permissions?.length || 0} assigned`,
      },
      {
        id: 'system',
        label: 'Type',
        render: (row) => (row.isSystem ? 'System' : 'Custom'),
      },
      {
        id: 'actions',
        label: 'Actions',
        align: 'right',
        render: (row) => (
          <Tooltip title="Edit permissions">
            <IconButton size="small" onClick={() => openEdit(row)} aria-label="Edit role">
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  const grouped = useMemo(() => {
    const groups = {};
    catalog.forEach((perm) => {
      const [resource] = perm.split(':');
      if (!groups[resource]) groups[resource] = [];
      groups[resource].push(perm);
    });
    return groups;
  }, [catalog]);

  return (
    <Box>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Review role definitions and adjust permission sets."
        breadcrumbs={[{ label: 'System' }, { label: 'Roles & Permissions' }]}
        actions={
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
            Refresh
          </Button>
        }
      />

      <TextField
        size="small"
        label="Search roles"
        value={search}
        onChange={(e) => {
          setPage(0);
          setSearch(e.target.value);
        }}
        sx={{ mb: 2, maxWidth: 360 }}
        fullWidth
      />

      {status === 'loading' && <LoadingSkeleton rows={5} />}
      {status === 'error' && (
        <ErrorState
          network={Boolean(error?.isNetworkError)}
          title="Unable to load roles"
          message={error?.message}
          onRetry={load}
        />
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
          emptyMessage="No roles found."
        />
      )}

      <Dialog open={Boolean(editing)} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit role — {editing?.name}</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={selectAll}>
                Select all
              </Button>
              <Button size="small" onClick={clearAll}>
                Clear
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                {selectedPerms.length} selected
              </Typography>
            </Stack>
            <Box sx={{ maxHeight: 360, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
              {Object.entries(grouped).map(([resource, perms]) => (
                <Box key={resource} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', mb: 0.5 }}>
                    {resource}
                  </Typography>
                  <FormGroup row>
                    {perms.map((perm) => (
                      <FormControlLabel
                        key={perm}
                        control={
                          <Checkbox
                            checked={selectedPerms.includes(perm)}
                            onChange={() => togglePerm(perm)}
                            size="small"
                          />
                        }
                        label={perm}
                      />
                    ))}
                  </FormGroup>
                </Box>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save permissions'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
