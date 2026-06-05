import { BooleanField, Datagrid, FunctionField, List, TextField } from 'react-admin';
import type { PaymentAccount } from '../../types';
import { maskIdentifier } from './constants';

export const PaymentAccountList = () => (
  <List sort={{ field: 'isActive', order: 'DESC' }} perPage={50} pagination={false}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="name" />
      <FunctionField
        label="resources.payment-accounts.fields.type"
        render={(record: PaymentAccount) => record.type}
      />
      <FunctionField
        label="resources.payment-accounts.fields.identifier"
        render={(record: PaymentAccount) => maskIdentifier(record.identifier)}
      />
      <BooleanField source="isActive" />
    </Datagrid>
  </List>
);
