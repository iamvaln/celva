import {
  Datagrid,
  DateField,
  FunctionField,
  List,
  SearchInput,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';
import type { StudioRequest, StudioRequestStatus } from '../../types';

const STATUS_COLOR: Record<StudioRequestStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  PENDING: 'warning',
  CONTACTED: 'info',
  CONFIRMED: 'info',
  COMPLETED: 'success',
  REJECTED: 'error',
};

const filters = [
  <SearchInput key="search" source="search" alwaysOn placeholder="Nom / email / téléphone" />,
  <SelectInput
    key="status"
    source="status"
    choices={[
      { id: 'PENDING', name: 'PENDING' },
      { id: 'CONTACTED', name: 'CONTACTED' },
      { id: 'CONFIRMED', name: 'CONFIRMED' },
      { id: 'COMPLETED', name: 'COMPLETED' },
      { id: 'REJECTED', name: 'REJECTED' },
    ]}
  />,
];

export const StudioRequestList = () => (
  <List
    filters={filters}
    sort={{ field: 'createdAt', order: 'DESC' }}
    perPage={25}
    exporter={false}
  >
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <DateField source="createdAt" showTime />
      <FunctionField<StudioRequest>
        label="resources.studio-requests.fields.status"
        render={(record) => (
          <Chip label={record.status} size="small" color={STATUS_COLOR[record.status]} />
        )}
      />
      <FunctionField<StudioRequest>
        label="resources.studio-requests.fields.customer"
        render={(record) =>
          `${record.customerName} · ${record.customerEmail ?? record.customerPhone}`
        }
      />
      <FunctionField<StudioRequest>
        label="resources.studio-requests.fields.appointment"
        render={(record) =>
          record.appointmentDate
            ? `${new Date(record.appointmentDate).toLocaleDateString('fr-FR')} · ${record.appointmentSlot ?? ''}`
            : '—'
        }
      />
      <FunctionField<StudioRequest>
        label="resources.studio-requests.fields.fabrics_count"
        render={(record) => record.selectedFabrics?.length ?? 0}
      />
    </Datagrid>
  </List>
);
