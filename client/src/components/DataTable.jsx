import {
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Paper,
  Typography,
} from '@mui/material';

const SUCCESS = new Set([
  'ACTIVE',
  'READ',
  'SUCCESS',
  'CONFIRMED',
  'APPROVED',
  'PAID',
  'PASSED',
  'RECEIVED',
  'DELIVERED',
  'COMPLETED',
  'PRESENT',
]);
const WARNING = new Set([
  'UNREAD',
  'WARNING',
  'INACTIVE',
  'PENDING',
  'DRAFT',
  'PARTIAL',
  'PARTIALLY_PAID',
  'PARTIALLY_RECEIVED',
  'LATE',
  'HALF_DAY',
  'ON_LEAVE',
  'PROCESSING',
  'SHIPPED',
  'RELEASED',
  'IN_PROGRESS',
]);
const ERROR = new Set([
  'SUSPENDED',
  'ERROR',
  'CANCELLED',
  'FAILED',
  'REJECTED',
  'ABSENT',
  'OVERDUE',
  'UNPAID',
  'TERMINATED',
]);

export function StatusChip({ status }) {
  const value = String(status || '—');
  const color = SUCCESS.has(value)
    ? 'success'
    : WARNING.has(value)
      ? 'warning'
      : ERROR.has(value)
        ? 'error'
        : 'default';

  return (
    <Chip
      size="small"
      label={value}
      color={color}
      variant="outlined"
      sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
    />
  );
}

export default function DataTable({
  columns,
  rows,
  rowKey = '_id',
  page = 0,
  rowsPerPage = 10,
  total = 0,
  onPageChange,
  onRowsPerPageChange,
  emptyMessage = 'No records found.',
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        width: '100%',
        overflow: 'hidden',
        borderRadius: 2.5,
      }}
    >
      <TableContainer className="table-scroll" sx={{ maxWidth: '100%' }}>
        <Table size="small" stickyHeader sx={{ minWidth: columns.length > 4 ? 640 : undefined }}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.id} align={col.align || 'left'}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row[rowKey]} hover>
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align || 'left'}
                      sx={{
                        maxWidth: { xs: 180, md: 280 },
                        whiteSpace: col.nowrap === false ? 'normal' : undefined,
                      }}
                    >
                      {col.render ? col.render(row) : row[col.id]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {onPageChange && (
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            '.MuiTablePagination-toolbar': {
              flexWrap: 'wrap',
              justifyContent: { xs: 'center', sm: 'flex-end' },
              gap: 0.5,
              px: { xs: 1, sm: 2 },
            },
            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
              margin: 0,
            },
          }}
        />
      )}
    </Paper>
  );
}
