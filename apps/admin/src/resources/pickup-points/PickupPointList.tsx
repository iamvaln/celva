import {
  BooleanField,
  Datagrid,
  FunctionField,
  List,
  TextField,
} from 'react-admin';
import type { PickupPoint } from '../../types';

export const PickupPointList = () => (
  <List sort={{ field: 'city', order: 'ASC' }} perPage={50} pagination={false}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <FunctionField
        label="resources.pickup-points.fields.name"
        render={(record: PickupPoint) =>
          `${record.name?.fr ?? ''} / ${record.name?.en ?? ''}`.replace(/^ \/ | \/ $/g, '')
        }
      />
      <TextField source="city" />
      <TextField source="address" />
      <TextField source="phone" />
      <BooleanField source="isActive" />
    </Datagrid>
  </List>
);
