import {
  Datagrid,
  FunctionField,
  List,
  ReferenceInput,
  SelectInput,
  TextField,
  useTranslate,
} from 'react-admin';
import type { SizeGuide } from '../../types';

const filters = [
  <ReferenceInput key="cat" source="categoryId" reference="categories" perPage={100} alwaysOn>
    <SelectInput optionText={(c: { name?: { fr?: string } }) => c.name?.fr ?? ''} />
  </ReferenceInput>,
];

export const SizeGuideList = () => {
  const t = useTranslate();
  return (
    <List filters={filters} perPage={50} sort={{ field: 'categoryId', order: 'ASC' }}>
      <Datagrid rowClick="edit">
        <FunctionField<SizeGuide>
          label={t('resources.size-guides.fields.name')}
          render={(record) => record.name?.fr ?? '—'}
        />
        <FunctionField<SizeGuide>
          label={t('resources.size-guides.fields.category')}
          render={(record) => record.category?.name?.fr ?? '—'}
        />
        <TextField source="id" />
      </Datagrid>
    </List>
  );
};
