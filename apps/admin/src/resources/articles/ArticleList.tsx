import {
  BooleanField,
  ChipField,
  Datagrid,
  DateField,
  FunctionField,
  List,
  SearchInput,
  SelectInput,
  TextField,
  useTranslate,
} from 'react-admin';
import type { Article } from '../../types';

const ARTICLE_CATEGORIES = ['STYLE', 'BEHIND_THE_SCENES', 'EVENTS', 'GUIDES'] as const;

const articleFilters = [
  <SearchInput key="search" source="search" alwaysOn />,
  <SelectInput
    key="category"
    source="category"
    choices={ARTICLE_CATEGORIES.map((c) => ({ id: c, name: c }))}
  />,
  <SelectInput
    key="isPublished"
    source="isPublished"
    choices={[
      { id: 'true', name: 'Publié / Published' },
      { id: 'false', name: 'Brouillon / Draft' },
    ]}
  />,
];

export const ArticleList = () => {
  const translate = useTranslate();
  return (
    <List
      filters={articleFilters}
      sort={{ field: 'publishedAt', order: 'DESC' }}
      perPage={20}
    >
      <Datagrid rowClick="edit" bulkActionButtons={false}>
        <FunctionField<Article>
          label={translate('resources.articles.fields.title')}
          render={(record) => `${record.title?.fr ?? '—'} / ${record.title?.en ?? ''}`}
        />
        <TextField source="slug" />
        <ChipField source="category" size="small" />
        <BooleanField source="isPublished" />
        <DateField source="publishedAt" showTime />
        <DateField source="updatedAt" showTime />
      </Datagrid>
    </List>
  );
};
