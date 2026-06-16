import {
  Datagrid,
  DateField,
  FunctionField,
  List,
  SearchInput,
  SelectInput,
} from 'react-admin';
import { Chip } from '@mui/material';
import type { StudioRequest, StudioRequestStatus, StudioRequestType } from '../../types';

const STATUS_COLOR: Record<StudioRequestStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  PENDING: 'warning',
  CONTACTED: 'info',
  CONFIRMED: 'info',
  COMPLETED: 'success',
  REJECTED: 'error',
};

const TYPE_COLOR: Record<StudioRequestType, 'default' | 'info' | 'secondary'> = {
  ORDER: 'secondary',
  APPOINTMENT: 'info',
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
  <SelectInput
    key="type"
    source="type"
    choices={[
      { id: 'ORDER', name: 'ORDER' },
      { id: 'APPOINTMENT', name: 'APPOINTMENT' },
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
        label="resources.studio-requests.fields.type"
        render={(record) => (
          <Chip label={record.type} size="small" color={TYPE_COLOR[record.type]} variant="outlined" />
        )}
      />
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
        label="resources.studio-requests.fields.model"
        render={(record) => record.model?.name?.fr ?? '—'}
      />
      <FunctionField<StudioRequest>
        label="resources.studio-requests.fields.fabric"
        render={(record) => record.fabric?.name?.fr ?? '—'}
      />
    </Datagrid>
  </List>
);
