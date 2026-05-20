import { Datagrid, FunctionField, List, TextField } from 'react-admin';
import type { Setting } from '../../types';

const labelRenderer = (record: Setting): string => {
  if (!record.label) return '';
  return `${record.label.fr ?? ''} / ${record.label.en ?? ''}`.replace(/^ \/ | \/ $/g, '');
};

export const SettingList = () => (
  <List pagination={false} sort={{ field: 'key', order: 'ASC' }}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="key" sortable={false} />
      <TextField source="value" sortable={false} />
      <FunctionField label="resources.settings.fields.label" render={labelRenderer} />
    </Datagrid>
  </List>
);
