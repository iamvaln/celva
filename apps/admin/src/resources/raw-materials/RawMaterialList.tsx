import {
  Datagrid,
  FunctionField,
  List,
  NumberField,
  ReferenceField,
  ReferenceInput,
  SearchInput,
  SelectInput,
  TextField,
  useTranslate,
} from 'react-admin';
import { Chip } from '@mui/material';
import type { RawMaterial } from '../../types';

const TYPES = ['FABRIC', 'ACCESSORY', 'PACKAGING', 'OTHER'] as const;

const filters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <SelectInput
    key="type"
    source="type"
    choices={TYPES.map((t) => ({ id: t, name: t }))}
  />,
  <ReferenceInput key="supplierId" source="supplierId" reference="suppliers">
    <SelectInput optionText="name" />
  </ReferenceInput>,
  <SelectInput
    key="lowStock"
    source="lowStock"
    choices={[{ id: 'true', name: 'Stock bas / Low stock' }]}
  />,
];

export const RawMaterialList = () => {
  const t = useTranslate();
  return (
    <List filters={filters} sort={{ field: 'name', order: 'ASC' }} perPage={50}>
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <TextField source="name" />
        <TextField source="type" />
        <ReferenceField source="supplierId" reference="suppliers" link={false}>
          <TextField source="name" />
        </ReferenceField>
        <FunctionField<RawMaterial>
          label={t('resources.raw-materials.fields.stockQty')}
          render={(record) => (
            <span>
              {Number(record.stockQty)} {record.unit}
              {record.isLowStock && (
                <Chip
                  label={t('resources.raw-materials.low_stock')}
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              )}
            </span>
          )}
        />
        <NumberField
          source="unitPrice"
          options={{ style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }}
        />
        <NumberField source="alertThreshold" emptyText="—" />
      </Datagrid>
    </List>
  );
};
