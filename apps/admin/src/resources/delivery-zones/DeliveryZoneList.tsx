import {
  BooleanField,
  Datagrid,
  FunctionField,
  List,
  NumberField,
  TextField,
} from 'react-admin';
import type { DeliveryZone } from '../../types';

export const DeliveryZoneList = () => (
  <List sort={{ field: 'id', order: 'ASC' }} perPage={50} pagination={false}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <FunctionField
        label="resources.delivery-zones.fields.name"
        render={(record: DeliveryZone) =>
          `${record.name?.fr ?? ''} / ${record.name?.en ?? ''}`.replace(/^ \/ | \/ $/g, '')
        }
      />
      <NumberField source="fee" options={{ style: 'currency', currency: 'XAF' }} />
      <NumberField source="actualCost" options={{ style: 'currency', currency: 'XAF' }} />
      <NumberField source="freeDeliveryThreshold" options={{ style: 'currency', currency: 'XAF' }} />
      <FunctionField
        label="resources.delivery-zones.fields.estimatedDays"
        render={(record: DeliveryZone) =>
          record.estimatedDays
            ? `${record.estimatedDays.min}–${record.estimatedDays.max} j`
            : '—'
        }
      />
      <BooleanField source="isActive" />
      <TextField source="id" />
    </Datagrid>
  </List>
);
